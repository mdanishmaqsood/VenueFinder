import uuid

from django.conf import settings
from django.contrib.postgres.fields import ArrayField
from django.contrib.postgres.indexes import GinIndex
from django.db import models
from pgvector.django import VectorField


class Venue(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    city = models.CharField(max_length=100, db_index=True)
    capacity = models.PositiveIntegerField(db_index=True)
    price_per_day = models.DecimalField(max_digits=10, decimal_places=2, db_index=True)
    description = models.TextField()
    amenities = ArrayField(
        models.CharField(max_length=100),
        default=list,
        blank=True,
    )
    # Populated at seed time via text-embedding-3-small (1536 dims)
    embedding = VectorField(dimensions=1536, null=True, blank=True)
    image_url = models.URLField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        indexes = [
            GinIndex(fields=["amenities"], name="venue_amenities_gin_idx"),
        ]

    def __str__(self):
        return f"{self.name} ({self.city})"


class Shortlist(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="shortlist_entries",
    )
    venue = models.ForeignKey(
        Venue,
        on_delete=models.CASCADE,
        related_name="shortlisted_by",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "venue")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user} → {self.venue}"


class ShortlistSummarySent(models.Model):
    """Records that the 3-venue shortlist summary email was sent for a user.

    Checked before sending to guarantee idempotency: only one email per user,
    triggered exactly when the shortlist reaches 3 entries.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="shortlist_summary_sent",
    )
    sent_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Summary sent to {self.user} at {self.sent_at}"
