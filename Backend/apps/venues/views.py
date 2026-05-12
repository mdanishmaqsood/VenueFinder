import logging

from celery.result import AsyncResult
from django.db import IntegrityError
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Shortlist, Venue
from .serializers import (
    AISearchJobSerializer,
    AISearchQuerySerializer,
    AISearchResultSerializer,
    ShortlistEntrySerializer,
    VenueSerializer,
)
from .tasks import ai_search_task, send_shortlist_summary_email_task

logger = logging.getLogger(__name__)


# ── Pagination ─────────────────────────────────────────────────────────────────

class VenuePagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


# ── Venue list ─────────────────────────────────────────────────────────────────

@extend_schema(
    tags=["Venues"],
    summary="List venues",
    description="Returns a paginated list of venues. Filter by city, capacity range, and max price.",
    parameters=[
        OpenApiParameter("city", str, description="Exact city name filter"),
        OpenApiParameter("min_capacity", int, description="Minimum venue capacity"),
        OpenApiParameter("max_capacity", int, description="Maximum venue capacity"),
        OpenApiParameter("max_price", float, description="Maximum price per day (inclusive)"),
    ],
    responses={200: VenueSerializer(many=True)},
)
class VenueListView(APIView):
    """Public endpoint – no authentication required."""

    def get(self, request):
        qs = Venue.objects.all()

        city = request.query_params.get("city")
        if city:
            qs = qs.filter(city__iexact=city)

        min_capacity = request.query_params.get("min_capacity")
        max_capacity = request.query_params.get("max_capacity")
        max_price = request.query_params.get("max_price")

        errors = {}
        if min_capacity is not None:
            try:
                qs = qs.filter(capacity__gte=int(min_capacity))
            except ValueError:
                errors["min_capacity"] = "Must be an integer."

        if max_capacity is not None:
            try:
                qs = qs.filter(capacity__lte=int(max_capacity))
            except ValueError:
                errors["max_capacity"] = "Must be an integer."

        if max_price is not None:
            try:
                qs = qs.filter(price_per_day__lte=float(max_price))
            except ValueError:
                errors["max_price"] = "Must be a number."

        if errors:
            return Response({"errors": errors}, status=status.HTTP_400_BAD_REQUEST)

        paginator = VenuePagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = VenueSerializer(page, many=True, context={"request": request})
        return paginator.get_paginated_response(serializer.data)


# ── Venue detail ───────────────────────────────────────────────────────────────

@extend_schema(
    tags=["Venues"],
    summary="Venue detail",
    responses={200: VenueSerializer, 404: OpenApiResponse(description="Not found")},
)
class VenueDetailView(APIView):
    """Public endpoint – no authentication required."""

    def get(self, request, pk):
        venue = get_object_or_404(Venue, pk=pk)
        return Response(VenueSerializer(venue, context={"request": request}).data)


# ── Shortlist add / remove ─────────────────────────────────────────────────────

@extend_schema(methods=["POST"],
    tags=["Shortlist"],
    summary="Add venue to shortlist",
    description=(
        "Adds the venue to the authenticated user's shortlist. "
        "Returns 201 on creation, 200 if already shortlisted (idempotent). "
        "Asynchronously triggers a summary email task when the user's shortlist reaches 3 venues."
    ),
    responses={
        201: OpenApiResponse(description="Added to shortlist"),
        200: OpenApiResponse(description="Already shortlisted"),
        401: OpenApiResponse(description="Authentication required"),
        404: OpenApiResponse(description="Venue not found"),
    },
)
@extend_schema(methods=["DELETE"],
    tags=["Shortlist"],
    summary="Remove venue from shortlist",
    responses={
        204: OpenApiResponse(description="Removed"),
        401: OpenApiResponse(description="Authentication required"),
        404: OpenApiResponse(description="Not in shortlist or venue not found"),
    },
)
class ShortlistView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        venue = get_object_or_404(Venue, pk=pk)

        entry, created = Shortlist.objects.get_or_create(user=request.user, venue=venue)

        if created:
            send_shortlist_summary_email_task.delay(request.user.pk)
            return Response(
                {"detail": "Venue added to shortlist.", "id": entry.pk},
                status=status.HTTP_201_CREATED,
            )

        return Response({"detail": "Already shortlisted.", "id": entry.pk}, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        venue = get_object_or_404(Venue, pk=pk)
        deleted, _ = Shortlist.objects.filter(user=request.user, venue=venue).delete()
        if not deleted:
            return Response({"detail": "Venue not in your shortlist."}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── User shortlist ─────────────────────────────────────────────────────────────

@extend_schema(
    tags=["Shortlist"],
    summary="List my shortlisted venues",
    description="Returns all venues the authenticated user has shortlisted, with full venue details.",
    responses={200: ShortlistEntrySerializer(many=True)},
)
class UserShortlistView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        entries = (
            Shortlist.objects.filter(user=request.user)
            .select_related("venue")
            .order_by("-created_at")
        )
        serializer = ShortlistEntrySerializer(entries, many=True, context={"request": request})
        return Response(serializer.data)


# ── AI semantic search ─────────────────────────────────────────────────────────

@extend_schema(
    tags=["AI Search"],
    summary="Start AI semantic search",
    description=(
        "Accepts a natural-language query, enqueues an async Celery task that "
        "performs embedding-based retrieval (pgvector) followed by GPT reranking. "
        "Returns a job_id to poll."
    ),
    request=AISearchQuerySerializer,
    responses={
        202: AISearchJobSerializer,
        400: OpenApiResponse(description="Missing or invalid query"),
    },
)
class AISearchView(APIView):

    def post(self, request):
        serializer = AISearchQuerySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        query = serializer.validated_data["query"]
        task = ai_search_task.delay(query)
        return Response({"job_id": task.id}, status=status.HTTP_202_ACCEPTED)


@extend_schema(
    tags=["AI Search"],
    summary="Poll AI search result",
    description=(
        "Polls the status of a previously submitted AI search job. "
        "Status values: PENDING | STARTED | SUCCESS | FAILURE."
    ),
    responses={200: AISearchResultSerializer},
)
class AISearchResultView(APIView):

    def get(self, request, job_id):
        result = AsyncResult(job_id)

        if result.status in ("PENDING", "STARTED"):
            return Response({"status": "pending"})

        if result.status == "FAILURE":
            return Response(
                {"status": "failed", "error": str(result.result)},
                status=status.HTTP_200_OK,
            )

        if result.status == "SUCCESS":
            results = result.result or []
            for item in results:
                venue = item.get("venue") or {}
                image_url = venue.get("image_url")
                if image_url and image_url.startswith("/"):
                    venue["image_url"] = request.build_absolute_uri(image_url)
            return Response({"status": "complete", "results": results})

        # Revoked, retry, etc.
        return Response({"status": "failed"})
