"""
Test suite for the Venuefinder backend.

Tests
-----
TestShortlistSummaryIdempotency
    Verifies that send_shortlist_summary_email_task only logs/sends the summary
    email ONCE per user – exactly when the shortlist transitions from 2 → 3.

TestAISearchTask
    Verifies the ai_search_task with a mocked OpenAI client:
      - Filters out hallucinated venue IDs that are not in the candidate set.
      - Returns the expected result shape.
      - Handles an OpenAI failure gracefully (task raises, Celery marks FAILURE).
"""

import json
from decimal import Decimal
from unittest.mock import MagicMock, patch

import pytest
from django.contrib.auth import get_user_model
from django.test import TestCase, TransactionTestCase

from apps.venues.models import Shortlist, ShortlistSummarySent, Venue
from apps.venues.tasks import ai_search_task, send_shortlist_summary_email_task

User = get_user_model()


# ── Helpers ────────────────────────────────────────────────────────────────────

def make_venue(**kwargs) -> Venue:
    defaults = {
        "name": "Test Venue",
        "city": "London",
        "capacity": 100,
        "price_per_day": Decimal("1000.00"),
        "description": "A test venue.",
        "amenities": ["wifi"],
    }
    defaults.update(kwargs)
    return Venue.objects.create(**defaults)


def make_user(username="testuser") -> User:
    return User.objects.create_user(username=username, password="pass")


# ── Shortlist idempotency tests ────────────────────────────────────────────────

class TestShortlistSummaryIdempotency(TransactionTestCase):
    """
    Uses TransactionTestCase so that the select_for_update inside the task
    works correctly (regular TestCase wraps everything in a transaction that
    cannot be nested for locking purposes).
    """

    def setUp(self):
        self.user = make_user("alice")
        self.venues = [make_venue(name=f"Venue {i}") for i in range(5)]

    def _add_shortlist(self, venue_index: int):
        Shortlist.objects.get_or_create(user=self.user, venue=self.venues[venue_index])

    def test_summary_sent_exactly_once_at_threshold(self):
        """Summary task fires at count=3 and creates ShortlistSummarySent."""
        self._add_shortlist(0)
        self._add_shortlist(1)
        self._add_shortlist(2)  # count is now 3

        send_shortlist_summary_email_task(self.user.pk)

        self.assertEqual(ShortlistSummarySent.objects.filter(user=self.user).count(), 1)

    def test_summary_not_sent_below_threshold(self):
        """Task with only 2 shortlisted venues must not create a summary record."""
        self._add_shortlist(0)
        self._add_shortlist(1)  # count is 2

        send_shortlist_summary_email_task(self.user.pk)

        self.assertEqual(ShortlistSummarySent.objects.filter(user=self.user).count(), 0)

    def test_summary_not_sent_above_threshold(self):
        """Task with 4+ shortlisted venues must NOT send a second summary."""
        # Simulate: summary was already sent at 3
        self._add_shortlist(0)
        self._add_shortlist(1)
        self._add_shortlist(2)
        send_shortlist_summary_email_task(self.user.pk)  # creates record

        # User adds a 4th venue
        self._add_shortlist(3)
        send_shortlist_summary_email_task(self.user.pk)  # should be a no-op

        self.assertEqual(ShortlistSummarySent.objects.filter(user=self.user).count(), 1)

    def test_concurrent_calls_idempotent(self):
        """Calling the task twice at count=3 must result in exactly one record."""
        for i in range(3):
            self._add_shortlist(i)

        send_shortlist_summary_email_task(self.user.pk)
        send_shortlist_summary_email_task(self.user.pk)  # second call – should be no-op

        self.assertEqual(ShortlistSummarySent.objects.filter(user=self.user).count(), 1)

    def test_nonexistent_user_does_not_raise(self):
        """Task must log and return cleanly for a missing user_id."""
        try:
            send_shortlist_summary_email_task(99999)
        except Exception as exc:
            self.fail(f"Task raised unexpectedly: {exc}")

    def test_independent_users_get_separate_summaries(self):
        """Two different users each reaching 3 venues both get their own record."""
        user_b = make_user("bob")
        venues_b = [make_venue(name=f"B-Venue {i}") for i in range(3)]

        for i in range(3):
            self._add_shortlist(i)
            Shortlist.objects.get_or_create(user=user_b, venue=venues_b[i])

        send_shortlist_summary_email_task(self.user.pk)
        send_shortlist_summary_email_task(user_b.pk)

        self.assertEqual(ShortlistSummarySent.objects.count(), 2)


# ── AI search task tests ───────────────────────────────────────────────────────

class TestAISearchTask(TestCase):

    def setUp(self):
        # Create venues with dummy 1536-dim embeddings (all zeros is fine for mock)
        self.venues = []
        for i in range(3):
            v = make_venue(
                name=f"AI Venue {i}",
                city="London",
                capacity=100 * (i + 1),
                price_per_day=Decimal(f"{(i + 1) * 1000}.00"),
            )
            # pgvector requires a list of floats; use zeros for tests
            v.embedding = [0.0] * 1536
            v.save(update_fields=["embedding"])
            self.venues.append(v)

    def _make_openai_mock(self, venue_ids: list[int], explanations: list[str]):
        """
        Build a mock OpenAI client that returns the expected function-call response.
        """
        results_payload = [
            {"venue_id": vid, "explanation": exp}
            for vid, exp in zip(venue_ids, explanations)
        ]
        tool_call = MagicMock()
        tool_call.function.arguments = json.dumps({"results": results_payload})

        message = MagicMock()
        message.tool_calls = [tool_call]

        choice = MagicMock()
        choice.message = message

        chat_response = MagicMock()
        chat_response.choices = [choice]

        embedding_response = MagicMock()
        embedding_response.data = [MagicMock(embedding=[0.0] * 1536)]

        client = MagicMock()
        client.embeddings.create.return_value = embedding_response
        client.chat.completions.create.return_value = chat_response

        return client

    @patch("apps.venues.tasks._get_openai_client")
    def test_valid_results_returned(self, mock_get_client):
        """Task returns venues that exist in the DB with correct structure."""
        real_ids = [v.pk for v in self.venues[:2]]
        mock_get_client.return_value = self._make_openai_mock(
            real_ids, ["Great for tech events", "Spacious hall"]
        )

        results = ai_search_task("tech conference in London")

        self.assertEqual(len(results), 2)
        for item in results:
            self.assertIn("venue", item)
            self.assertIn("explanation", item)
            self.assertIn("id", item["venue"])

    @patch("apps.venues.tasks._get_openai_client")
    def test_hallucinated_ids_filtered_out(self, mock_get_client):
        """GPT-returned venue IDs that don't exist in the DB are silently dropped."""
        real_id = self.venues[0].pk
        fake_id = 99999
        mock_get_client.return_value = self._make_openai_mock(
            [real_id, fake_id],
            ["A real venue", "This ID was hallucinated"],
        )

        results = ai_search_task("rooftop venue")

        returned_ids = [r["venue"]["id"] for r in results]
        self.assertIn(real_id, returned_ids)
        self.assertNotIn(fake_id, returned_ids)

    @patch("apps.venues.tasks._get_openai_client")
    def test_max_five_results_enforced(self, mock_get_client):
        """Even if GPT returns more than 5, only 5 are returned."""
        # Create extra venues
        extra_venues = [
            make_venue(name=f"Extra {i}", embedding=[0.0] * 1536)
            for i in range(7)
        ]
        for v in extra_venues:
            v.embedding = [0.0] * 1536
            v.save(update_fields=["embedding"])

        all_ids = [v.pk for v in self.venues + extra_venues]
        mock_get_client.return_value = self._make_openai_mock(
            all_ids[:7],
            [f"Explanation {i}" for i in range(7)],
        )

        results = ai_search_task("large venue")

        self.assertLessEqual(len(results), 5)

    @patch("apps.venues.tasks._get_openai_client")
    def test_openai_failure_raises(self, mock_get_client):
        """An OpenAI exception must propagate so Celery marks the task FAILURE."""
        client = MagicMock()
        client.embeddings.create.side_effect = RuntimeError("OpenAI timeout")
        mock_get_client.return_value = client

        with self.assertRaises(RuntimeError):
            ai_search_task("any query")

    @patch("apps.venues.tasks._get_openai_client")
    def test_no_embeddings_returns_empty_list(self, mock_get_client):
        """If no venues have embeddings, return empty results gracefully."""
        Venue.objects.update(embedding=None)

        embedding_response = MagicMock()
        embedding_response.data = [MagicMock(embedding=[0.0] * 1536)]
        client = MagicMock()
        client.embeddings.create.return_value = embedding_response
        mock_get_client.return_value = client

        results = ai_search_task("anything")

        self.assertEqual(results, [])


# ── API endpoint smoke tests ───────────────────────────────────────────────────

class TestVenueListAPI(TestCase):
    """Smoke-test the public venue list endpoint and its filters."""

    def setUp(self):
        from rest_framework.test import APIClient

        self.client = APIClient()
        make_venue(name="Small London Venue", city="London", capacity=50, price_per_day=Decimal("500.00"))
        make_venue(name="Big Manchester Venue", city="Manchester", capacity=400, price_per_day=Decimal("4000.00"))

    def test_list_returns_200(self):
        response = self.client.get("/api/venues/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("results", response.data)

    def test_city_filter(self):
        response = self.client.get("/api/venues/?city=London")
        self.assertEqual(response.status_code, 200)
        for venue in response.data["results"]:
            self.assertEqual(venue["city"], "London")

    def test_min_capacity_filter(self):
        response = self.client.get("/api/venues/?min_capacity=200")
        self.assertEqual(response.status_code, 200)
        for venue in response.data["results"]:
            self.assertGreaterEqual(venue["capacity"], 200)

    def test_max_price_filter(self):
        response = self.client.get("/api/venues/?max_price=1000")
        self.assertEqual(response.status_code, 200)
        for venue in response.data["results"]:
            self.assertLessEqual(float(venue["price_per_day"]), 1000.0)

    def test_invalid_filter_returns_400(self):
        response = self.client.get("/api/venues/?min_capacity=notanumber")
        self.assertEqual(response.status_code, 400)


class TestShortlistAPI(TestCase):
    """Test shortlist add/remove/list endpoints."""

    def setUp(self):
        from rest_framework.authtoken.models import Token
        from rest_framework.test import APIClient

        self.user = make_user("carol")
        token = Token.objects.create(user=self.user)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
        self.venue = make_venue(name="Carol's Venue")

    @patch("apps.venues.views.send_shortlist_summary_email_task")
    def test_add_venue_returns_201(self, mock_task):
        mock_task.delay = MagicMock()
        response = self.client.post(f"/api/venues/{self.venue.pk}/shortlist/")
        self.assertEqual(response.status_code, 201)

    @patch("apps.venues.views.send_shortlist_summary_email_task")
    def test_add_venue_idempotent_returns_200(self, mock_task):
        mock_task.delay = MagicMock()
        self.client.post(f"/api/venues/{self.venue.pk}/shortlist/")
        response = self.client.post(f"/api/venues/{self.venue.pk}/shortlist/")
        self.assertEqual(response.status_code, 200)

    @patch("apps.venues.views.send_shortlist_summary_email_task")
    def test_remove_venue_returns_204(self, mock_task):
        mock_task.delay = MagicMock()
        Shortlist.objects.create(user=self.user, venue=self.venue)
        response = self.client.delete(f"/api/venues/{self.venue.pk}/shortlist/")
        self.assertEqual(response.status_code, 204)

    def test_shortlist_requires_auth(self):
        from rest_framework.test import APIClient

        anon = APIClient()
        response = anon.post(f"/api/venues/{self.venue.pk}/shortlist/")
        self.assertEqual(response.status_code, 401)

    @patch("apps.venues.views.send_shortlist_summary_email_task")
    def test_user_shortlist_lists_venues(self, mock_task):
        mock_task.delay = MagicMock()
        Shortlist.objects.create(user=self.user, venue=self.venue)
        response = self.client.get("/api/shortlist/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["venue"]["id"], self.venue.pk)
