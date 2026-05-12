from django.urls import path

from .views import (
    AISearchResultView,
    AISearchView,
    ShortlistView,
    UserShortlistView,
    VenueDetailView,
    VenueListView,
)

urlpatterns = [
    # Venues
    path("venues/", VenueListView.as_view(), name="venue-list"),
    path("venues/<uuid:pk>/", VenueDetailView.as_view(), name="venue-detail"),

    # Shortlist: POST to add, DELETE to remove — same URL, different method
    path("venues/<uuid:pk>/shortlist/", ShortlistView.as_view(), name="shortlist"),

    # User's full shortlist
    path("shortlist/", UserShortlistView.as_view(), name="user-shortlist"),

    # AI semantic search
    path("venues/search/", AISearchView.as_view(), name="ai-search"),
    path("venues/search/<str:job_id>/", AISearchResultView.as_view(), name="ai-search-result"),
]
