"""
Adds an IVFFlat cosine-similarity index on Venue.embedding.

This migration is kept separate from the initial schema because IVFFlat
requires at least one row to pick cluster centres.  It is safe to run on an
empty table; PostgreSQL simply creates the index without cluster training.

The index is applied CONCURRENTLY via raw SQL so that it does not block reads.
Note: CONCURRENTLY cannot run inside a transaction, so atomic=False is set.
"""

from django.db import migrations


class Migration(migrations.Migration):

    atomic = False  # required for CREATE INDEX CONCURRENTLY

    dependencies = [
        ("venues", "0001_initial"),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                CREATE INDEX CONCURRENTLY IF NOT EXISTS venue_embedding_ivfflat_idx
                ON venues_venue
                USING ivfflat (embedding vector_cosine_ops)
                WITH (lists = 100);
            """,
            reverse_sql="DROP INDEX CONCURRENTLY IF EXISTS venue_embedding_ivfflat_idx;",
        ),
    ]
