#!/bin/sh
set -e

# ---------------------------------------------------------------------------
# Wait for PostgreSQL
# ---------------------------------------------------------------------------
echo "Waiting for PostgreSQL..."
until nc -z "$DB_HOST" "$DB_PORT"; do
  sleep 1
done
echo "PostgreSQL is up."

# ---------------------------------------------------------------------------
# Wait for Redis
# ---------------------------------------------------------------------------
echo "Waiting for Redis..."
until nc -z "$REDIS_HOST" "$REDIS_PORT"; do
  sleep 1
done
echo "Redis is up."

# ---------------------------------------------------------------------------
# Django bootstrap (only on the web container, not the Celery worker)
# ---------------------------------------------------------------------------
if [ "${SKIP_MIGRATIONS:-0}" = "0" ]; then
  python manage.py migrate --noinput
  python manage.py collectstatic --noinput --clear
fi

# ---------------------------------------------------------------------------
# Run the requested command (web or celery worker)
# ---------------------------------------------------------------------------
exec "$@"
