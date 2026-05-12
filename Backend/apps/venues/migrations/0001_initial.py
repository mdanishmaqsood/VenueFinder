import uuid

import django.contrib.postgres.fields
import django.contrib.postgres.indexes
import django.db.models.deletion
import pgvector.django
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        pgvector.django.VectorExtension(),

        migrations.CreateModel(
            name="Venue",
            fields=[
                ("id", models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
                ("name", models.CharField(max_length=255)),
                ("city", models.CharField(db_index=True, max_length=100)),
                ("capacity", models.PositiveIntegerField(db_index=True)),
                ("price_per_day", models.DecimalField(db_index=True, decimal_places=2, max_digits=10)),
                ("description", models.TextField()),
                (
                    "amenities",
                    django.contrib.postgres.fields.ArrayField(
                        base_field=models.CharField(max_length=100),
                        blank=True,
                        default=list,
                        size=None,
                    ),
                ),
                ("embedding", pgvector.django.VectorField(blank=True, dimensions=1536, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "ordering": ["name"],
            },
        ),

        migrations.AddIndex(
            model_name="venue",
            index=django.contrib.postgres.indexes.GinIndex(
                fields=["amenities"], name="venue_amenities_gin_idx"
            ),
        ),

        migrations.CreateModel(
            name="Shortlist",
            fields=[
                ("id", models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="shortlist_entries",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "venue",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="shortlisted_by",
                        to="venues.venue",
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "ordering": ["-created_at"],
                "unique_together": {("user", "venue")},
            },
        ),

        migrations.CreateModel(
            name="ShortlistSummarySent",
            fields=[
                ("id", models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="shortlist_summary_sent",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                ("sent_at", models.DateTimeField(auto_now_add=True)),
            ],
        ),
    ]
