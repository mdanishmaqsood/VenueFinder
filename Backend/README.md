# Venuefinder Backend

A production-ready Django REST API for discovering and shortlisting event venues in the UK, with AI-powered semantic search via OpenAI and pgvector.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Web framework | Django 4.2 + Django REST Framework 3.15 |
| Database | PostgreSQL 15 + pgvector extension |
| Task queue | Celery 5.4 + Redis 7 |
| AI | OpenAI `text-embedding-3-small` + `gpt-3.5-turbo` |
| API docs | drf-spectacular (Swagger UI + ReDoc) |
| Server | Gunicorn |
| Container | Docker + Docker Compose |

---

## Quick Start

### 1. Clone and configure

```bash
git clone <repo-url>
cd venuefinder_backend

cp .env.example .env
# Edit .env – at minimum set OPENAI_API_KEY and a strong SECRET_KEY
```

### 2. Build and start all services

```bash
docker-compose up --build
```

This starts:
- **db** – PostgreSQL 15 with the pgvector extension
- **redis** – Redis 7 message broker / result backend
- **web** – Django app served by Gunicorn on port 8000
- **celery** – Celery worker that processes AI search and email tasks

Migrations are applied automatically on startup via `entrypoint.sh`.

### 3. Seed venue data

```bash
docker-compose exec web python manage.py seed_venues
```

This creates 25 realistic UK venues across London, Manchester, Birmingham, Edinburgh, Glasgow, Belfast, Cardiff, Leeds, and Newcastle, then computes and stores OpenAI embeddings for each venue so that AI search works immediately.

To seed without embeddings (faster, but AI search won't return results):
```bash
docker-compose exec web python manage.py seed_venues --no-embeddings
```

### 4. Create a user and get an auth token

```bash
# Create a superuser
docker-compose exec web python manage.py createsuperuser

# Or create a regular user via the Django shell
docker-compose exec web python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
u = User.objects.create_user('alice', 'alice@example.com', 'password123')
from rest_framework.authtoken.models import Token
t = Token.objects.create(user=u)
print('Token:', t.key)
"
```

### 5. Explore the API

| Interface | URL |
|---|---|
| Swagger UI | http://localhost:8000/api/schema/swagger-ui/ |
| ReDoc | http://localhost:8000/api/schema/redoc/ |
| Admin | http://localhost:8000/admin/ |

---

## API Reference

### Public endpoints (no auth required)

| Method | URL | Description |
|---|---|---|
| `GET` | `/api/venues/` | List venues (filterable, paginated) |
| `GET` | `/api/venues/{id}/` | Venue detail |
| `POST` | `/api/venues/search/` | Start AI semantic search |
| `GET` | `/api/venues/search/{job_id}/` | Poll AI search result |

**Venue list filters** (query parameters):

| Param | Type | Description |
|---|---|---|
| `city` | string | Exact city name (case-insensitive) |
| `min_capacity` | integer | Minimum capacity |
| `max_capacity` | integer | Maximum capacity |
| `max_price` | float | Maximum price per day |

### Authenticated endpoints (Token required)

Add `Authorization: Token <your-token>` header to all requests.

| Method | URL | Description |
|---|---|---|
| `POST` | `/api/venues/{id}/shortlist/` | Add to shortlist (201 new, 200 existing) |
| `DELETE` | `/api/venues/{id}/shortlist/` | Remove from shortlist |
| `GET` | `/api/shortlist/` | List my shortlisted venues |

### Example: AI search workflow

```bash
# 1. Submit a search
curl -X POST http://localhost:8000/api/venues/search/ \
  -H "Content-Type: application/json" \
  -d '{"query": "large London venue with AV equipment and catering for a 200-person corporate gala"}'

# Response: {"job_id": "abc-123-..."}

# 2. Poll for results
curl http://localhost:8000/api/venues/search/abc-123-.../

# When complete:
# {
#   "status": "complete",
#   "results": [
#     {"venue": {...}, "explanation": "The Grand Pavilion seats 500 and offers full catering..."},
#     ...
#   ]
# }
```

---

## Design Decisions

### Authentication: TokenAuthentication

DRF's built-in `TokenAuthentication` was chosen for its simplicity and direct support in the Swagger UI (the token is sent as an `Authorization: Token <key>` header, which drf-spectacular documents automatically). For a production SaaS product, OAuth2 / JWT (e.g. `djangorestframework-simplejwt`) would be preferable, but token auth avoids extra dependencies for this scope.

### AI Architecture: Option A – Retrieval + Rerank + Explanation

**Why not Option B (send all venues to GPT)?** With 25+ venues the prompt fits in a single GPT call today, but the approach scales poorly: 10,000 venues would exceed context windows and become extremely expensive. Option A solves this by splitting the problem:

1. **Embedding retrieval** (pgvector, `text-embedding-3-small`) – fast, cheap, scales to millions of rows. Cosine similarity returns the top-15 candidates in milliseconds using an IVFFlat index.
2. **GPT rerank + explain** (`gpt-3.5-turbo`, function calling) – the model sees only 15 compact venue descriptions, so the prompt stays small. Function calling forces structured JSON output, eliminating free-text parsing fragility.

**Why pgvector over a dedicated vector DB (Pinecone, Weaviate)?** Keeping everything in PostgreSQL eliminates a third external service, simplifies deployment, and ensures transactional consistency between venue data and embeddings. For millions of vectors an HNSW index or a dedicated vector store would be considered.

**Prompt design** – a system prompt defines the model's role (venue recommender), the output schema (via the `rank_venues` function), and the constraint that it must only use IDs from the candidate list. `temperature=0` ensures deterministic ranking.

### Shortlist summary: idempotency

The `send_shortlist_summary_email_task` task uses `select_for_update()` inside an atomic transaction to check and create a `ShortlistSummarySent` row atomically. This guarantees that even if two task instances race (e.g. rapid double-click), only one email is ever sent per user. The task is a no-op for count ≠ 3 and a no-op if the row already exists.

---

## Running Tests

```bash
# Inside Docker
docker-compose exec web pytest apps/venues/tests/ -v

# Or locally with a configured database
pip install -r requirements.txt
pytest apps/venues/tests/ -v
```

The test suite covers:
- Shortlist idempotency (6 cases, including concurrent calls and independent users)
- AI search with mocked OpenAI: valid results, hallucinated ID filtering, max-5 enforcement, failure propagation, no-embedding edge case
- Venue list API: filters, pagination, 400 on bad input
- Shortlist API: add/remove/list, auth enforcement

---

## Production Improvements

The following are deliberately omitted for scope but would be required for a real deployment:

| Area | Improvement |
|---|---|
| Email | Replace `EmailBackend=console` with SMTP / SendGrid / SES |
| Rate limiting | Add `django-ratelimit` or API gateway rate limits on AI search |
| Embedding cache | Cache embeddings in Redis with a TTL to avoid redundant OpenAI calls |
| Task timeouts | Set `CELERY_TASK_TIME_LIMIT` per task (AI search: 60 s, email: 10 s) |
| Monitoring | Add Flower (Celery monitor), Sentry for error tracking |
| Auth | Replace token auth with JWT + refresh tokens (`djangorestframework-simplejwt`) |
| User registration | Add `POST /api/auth/register/` and `POST /api/auth/login/` endpoints |
| HTTPS | Terminate TLS at a load balancer (Nginx / Caddy) in production |
| Static files | Serve via WhiteNoise or an S3 bucket |
| HNSW index | Replace IVFFlat with HNSW for better recall on large datasets |
| Venue pagination | Add cursor-based pagination for large result sets |

---

## What Was Omitted

- **Frontend** – deliberately excluded; this is a pure REST API backend.
- **User registration/login endpoints** – admin can create users via Django admin or the shell command shown above. A registration endpoint can be added in ~30 lines of DRF if needed.
- **Email delivery** – emails are logged to the console. Swap `EMAIL_BACKEND` in settings to send real emails.
- **Rate limiting on OpenAI calls** – `tenacity` provides exponential backoff inside tasks, but no per-user quota is enforced at the API layer.

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `SECRET_KEY` | Django secret key | *required* |
| `DEBUG` | Enable debug mode (`1`/`0`) | `0` |
| `ALLOWED_HOSTS` | Comma-separated list of hosts | `*` |
| `DATABASE_URL` | PostgreSQL DSN | `postgres://venuefinder:venuefinder@db:5432/venuefinder` |
| `REDIS_URL` | Redis DSN | `redis://redis:6379/0` |
| `OPENAI_API_KEY` | OpenAI API key | *required for AI search* |

---

## Project Structure

```
venuefinder_backend/
├── .env.example            # Environment variable template
├── .gitignore
├── docker-compose.yml      # PostgreSQL + Redis + web + Celery worker
├── Dockerfile              # Multi-stage production image
├── entrypoint.sh           # Wait for DB/Redis, migrate, collectstatic
├── requirements.txt
├── pytest.ini
├── manage.py
├── core/
│   ├── settings.py         # django-environ config, DRF, Celery, Spectacular
│   ├── urls.py             # Root URL conf (admin, api/, schema/)
│   ├── celery.py           # Celery app instance
│   └── wsgi.py
└── apps/
    └── venues/
        ├── models.py       # Venue, Shortlist, ShortlistSummarySent
        ├── serializers.py  # DRF serializers
        ├── views.py        # All API views (list, detail, shortlist, AI search)
        ├── urls.py         # venues/ URL patterns
        ├── tasks.py        # ai_search_task, send_shortlist_summary_email_task
        ├── admin.py        # Admin registrations
        ├── migrations/
        │   ├── 0001_initial.py              # VectorExtension + all models (UUID PKs)
        │   ├── 0002_venue_embedding_index.py # IVFFlat cosine index (CONCURRENT)
        │   └── 0003_venue_image_url.py      # image_url field on Venue
        ├── management/commands/
        │   └── seed_venues.py  # 25 UK venues + OpenAI embeddings + DALL-E images
        └── tests/
            └── test_shortlist_idempotency.py  # Full test suite (shortlist, AI search, API)
```
