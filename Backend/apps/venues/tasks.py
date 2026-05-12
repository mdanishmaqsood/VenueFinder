"""
Celery tasks for the Venuefinder platform.

Tasks
-----
ai_search_task
    Accepts a natural-language query, computes an embedding via OpenAI
    text-embedding-3-small, retrieves the top-K candidate venues using
    pgvector cosine similarity, then asks GPT-3.5-Turbo to rank and
    explain up to 5 of them.  Result shape:
        [{"venue": {...}, "explanation": "..."}]

send_shortlist_summary_email_task
    Checks whether the requesting user now has exactly 3 shortlisted venues
    and, if no summary has been sent before, logs the summary to the console
    and records the event in ShortlistSummarySent (idempotency guard).
"""

from __future__ import annotations

import json
import logging

from celery import shared_task
from django.conf import settings
from django.db import transaction
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

logger = logging.getLogger(__name__)

# ── Constants (configured via .env → settings) ─────────────────────────────────

EMBEDDING_MODEL = settings.OPENAI_EMBEDDING_MODEL
EMBEDDING_DIMS = 1536
CHAT_MODEL = settings.OPENAI_CHAT_MODEL
TOP_K_CANDIDATES = settings.AI_TOP_K_CANDIDATES
MAX_RESULTS = settings.AI_MAX_RESULTS
OPENAI_TIMEOUT = settings.OPENAI_TIMEOUT


# ── Helpers ────────────────────────────────────────────────────────────────────

def _get_openai_client():
    """Return a configured OpenAI client (lazy import to avoid overhead)."""
    from openai import OpenAI

    return OpenAI(api_key=settings.OPENAI_API_KEY, timeout=OPENAI_TIMEOUT)


@retry(
    retry=retry_if_exception_type(Exception),
    wait=wait_exponential(multiplier=1, min=2, max=30),
    stop=stop_after_attempt(3),
    reraise=True,
)
def _embed(client, text: str) -> list[float]:
    response = client.embeddings.create(model=EMBEDDING_MODEL, input=text)
    return response.data[0].embedding


@retry(
    retry=retry_if_exception_type(Exception),
    wait=wait_exponential(multiplier=1, min=2, max=30),
    stop=stop_after_attempt(3),
    reraise=True,
)
def _chat_rank(client, query: str, candidates: list[dict]) -> list[dict]:
    """
    Ask GPT to rank the candidate venues and return JSON.

    Uses function-calling / tool-use to force structured JSON output so we
    never have to parse free text.
    """
    candidate_text = json.dumps(candidates, indent=2)

    system_prompt = (
        "You are an expert event-venue recommender. "
        "You will be given a list of candidate venues and a user's requirement query. "
        "Your task is to select the best matching venues (at most 5) from the candidates, "
        "rank them by relevance, and provide a concise explanation for each choice. "
        "ONLY use venue IDs that appear in the provided candidate list. "
        "Return your answer by calling the `rank_venues` function."
    )

    user_prompt = (
        f"User requirement: {query}\n\n"
        f"Candidate venues (JSON):\n{candidate_text}"
    )

    tool_schema = {
        "type": "function",
        "function": {
            "name": "rank_venues",
            "description": "Return a ranked list of up to 5 venues that best match the user query.",
            "parameters": {
                "type": "object",
                "properties": {
                    "results": {
                        "type": "array",
                        "maxItems": MAX_RESULTS,
                        "items": {
                            "type": "object",
                            "properties": {
                                "venue_id": {
                                    "type": "string",
                                    "description": "ID of the venue from the candidate list.",
                                },
                                "explanation": {
                                    "type": "string",
                                    "description": "Why this venue suits the user's requirements.",
                                },
                            },
                            "required": ["venue_id", "explanation"],
                        },
                    }
                },
                "required": ["results"],
            },
        },
    }

    response = client.chat.completions.create(
        model=CHAT_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        tools=[tool_schema],
        tool_choice={"type": "function", "function": {"name": "rank_venues"}},
        temperature=0,
    )

    tool_call = response.choices[0].message.tool_calls[0]
    ranked = json.loads(tool_call.function.arguments)
    return ranked.get("results", [])


# ── AI search task ─────────────────────────────────────────────────────────────

@shared_task(bind=True, name="venues.ai_search_task", max_retries=0)
def ai_search_task(self, query: str) -> list[dict]:
    """
    Async AI semantic search.

    1. Embed the user query (text-embedding-3-small).
    2. Retrieve top-K venues by cosine similarity via pgvector.
    3. Ask GPT-3.5-Turbo to rank and explain up to 5 results (function calling).
    4. Return list of {"venue": {...}, "explanation": "..."}.

    Failure sets the Celery task state to FAILURE with the error message.
    """
    from pgvector.django import CosineDistance

    from .models import Venue
    from .serializers import VenueSerializer

    try:
        client = _get_openai_client()

        # Step 1 – embed the query
        logger.info("ai_search_task: embedding query '%s'", query[:80])
        query_embedding = _embed(client, query)

        # Step 2 – vector similarity retrieval (exclude venues with no embedding)
        candidates_qs = (
            Venue.objects.exclude(embedding=None)
            .order_by(CosineDistance("embedding", query_embedding))[:TOP_K_CANDIDATES]
        )

        if not candidates_qs:
            logger.warning("ai_search_task: no venues with embeddings found")
            return []

        # Build a lightweight candidate dict for the prompt
        candidate_ids = set()
        candidates_for_prompt = []
        for v in candidates_qs:
            candidate_ids.add(str(v.pk))
            candidates_for_prompt.append(
                {
                    "id": str(v.pk),
                    "name": v.name,
                    "city": v.city,
                    "capacity": v.capacity,
                    "price_per_day": str(v.price_per_day),
                    "amenities": v.amenities,
                    "description": v.description[:300],
                }
            )

        # Step 3 – GPT rerank
        logger.info("ai_search_task: sending %d candidates to GPT", len(candidates_for_prompt))
        ranked = _chat_rank(client, query, candidates_for_prompt)

        # Step 4 – Validate IDs (filter hallucinated / non-existent IDs)
        valid_ranked = [r for r in ranked if r.get("venue_id") in candidate_ids]

        venue_map = {str(v.pk): v for v in candidates_qs}
        results = []
        for item in valid_ranked[:MAX_RESULTS]:
            venue_obj = venue_map.get(item["venue_id"])
            if venue_obj:
                results.append(
                    {
                        "venue": VenueSerializer(venue_obj).data,
                        "explanation": item.get("explanation", ""),
                    }
                )

        logger.info("ai_search_task: returning %d results", len(results))
        return results

    except Exception as exc:
        logger.exception("ai_search_task failed: %s", exc)
        raise  # Celery will mark the task as FAILURE


# ── Shortlist summary email task ───────────────────────────────────────────────

@shared_task(bind=True, name="venues.send_shortlist_summary_email_task", max_retries=3)
def send_shortlist_summary_email_task(self, user_id: int) -> None:
    """
    Send (log to console) a shortlist summary email when a user's shortlist
    reaches exactly 3 venues for the first time.

    Idempotency: a ShortlistSummarySent row is created inside an atomic
    select_for_update block.  If the row already exists the task exits silently.
    Only fires the log when count == 3 AND no record exists yet.
    """
    from django.contrib.auth import get_user_model

    from .models import Shortlist, ShortlistSummarySent

    User = get_user_model()

    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        logger.error("send_shortlist_summary_email_task: user %s not found", user_id)
        return

    shortlist_count = Shortlist.objects.filter(user=user).count()

    if shortlist_count != 3:
        # Only act on exactly the 3-venue milestone
        return

    # Atomic check-and-set to guarantee exactly-once delivery
    with transaction.atomic():
        already_sent = (
            ShortlistSummarySent.objects.select_for_update()
            .filter(user=user)
            .exists()
        )
        if already_sent:
            logger.info(
                "send_shortlist_summary_email_task: summary already sent for user %s – skipping",
                user_id,
            )
            return

        ShortlistSummarySent.objects.create(user=user)

    # Fetch shortlisted venues (outside lock – read-only)
    entries = (
        Shortlist.objects.filter(user=user)
        .select_related("venue")
        .order_by("created_at")
    )

    # Console "email" (replace with real email backend in production)
    lines = [
        "=" * 60,
        f"Shortlist Summary for {user.get_full_name() or user.username} <{user.email}>",
        "=" * 60,
        "Congratulations! You have shortlisted your first 3 venues:",
        "",
    ]
    for idx, entry in enumerate(entries, start=1):
        v = entry.venue
        lines.append(f"  {idx}. {v.name} – {v.city}  |  £{v.price_per_day}/day")
    lines += [
        "",
        "Log in to Venuefinder to manage your shortlist.",
        "=" * 60,
    ]

    logger.info("\n".join(lines))
