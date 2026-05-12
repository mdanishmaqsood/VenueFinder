# VenueFinder

A full-stack B2B venue discovery platform. Businesses can search, filter, and shortlist event venues for conferences, product launches, workshops and corporate events. An AI-powered semantic search lets users describe their event in plain language and get ranked venue recommendations with explanations.

---

## Architecture Overview

```
VenueFinder/
├── Backend/          Django REST API (Python 3.11)
├── Frontend/         React + Vite SPA (Node 20)
└── docker-compose.yml   Runs the full stack with one command
```

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, React Router v6, Axios |
| Backend | Django 4.2, Django REST Framework 3.15 |
| Database | PostgreSQL 15 + pgvector extension |
| Task queue | Celery 5.4 + Redis 7 |
| AI search | OpenAI `text-embedding-3-small` + `gpt-3.5-turbo` |
| API docs | drf-spectacular (Swagger UI + ReDoc) |
| Server | Gunicorn (backend), Vite dev server (frontend) |
| Container | Docker + Docker Compose |

---

## Quick Start (Docker — full stack)

### 1. Clone the repository

```bash
git clone <repo-url>
cd VenueFinder
```

### 2. Configure environment variables

**Backend** — copy the example and fill in required values:

```bash
cp Backend/.env.example Backend/.env
# Required: SECRET_KEY, OPENAI_API_KEY
```

**Frontend** — set the API base URL:

```bash
# Frontend/.env already contains:
VITE_API_BASE_URL=http://localhost:8000
```

### 3. Build and start all services

```bash
docker compose up --build
```

This starts five services:

| Service | Description | Port |
|---|---|---|
| `db` | PostgreSQL 15 with pgvector | 5432 (internal) |
| `redis` | Redis 7 message broker | 6379 (internal) |
| `web` | Django / Gunicorn API | 8000 |
| `celery` | Celery worker (AI search, email tasks) | — |
| `frontend` | React / Vite dev server | 3000 |

Migrations and static file collection run automatically on startup via `entrypoint.sh`.

### 4. Seed venue data

```bash
docker compose exec web python manage.py seed_venues
```

Creates 25 realistic UK venues and computes OpenAI embeddings so AI search works immediately. To skip embeddings (faster, AI search won't return results):

```bash
docker compose exec web python manage.py seed_venues --no-embeddings
```

### 5. Create a user

```bash
docker compose exec web python manage.py createsuperuser
```

Or create a regular user via the Django shell:

```bash
docker compose exec web python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
u = User.objects.create_user('alice', 'alice@example.com', 'password123')
from rest_framework.authtoken.models import Token
t = Token.objects.create(user=u)
print('Token:', t.key)
"
```

### 6. Open the app

| Interface | URL |
|---|---|
| **Frontend app** | http://localhost:3000 |
| Swagger UI | http://localhost:8000/api/schema/swagger-ui/ |
| ReDoc | http://localhost:8000/api/schema/redoc/ |
| Django Admin | http://localhost:8000/admin/ |

---

## Running Without Docker

### Backend

```bash
cd Backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                                 # set DATABASE_URL + REDIS_URL
python manage.py migrate
python manage.py runserver
```

### Frontend

```bash
cd Frontend
npm install
npm run dev        # http://localhost:3000
```

---

## Application Flow

```
User visits /            →  Login page
                             ↓  POST /api/auth/token/
                             ↓  Token stored in localStorage
                         →  Redirect to /dashboard
                             ↓  GET /api/venues/ (with optional filters)
                             ↓  Results shown as venue cards
User clicks Search       →  GET /api/venues/?city=&min_capacity=&max_price=
User types AI prompt     →  POST /api/venues/search/  { query }
                             ↓  { job_id }  (Celery task created)
                             ↓  Poll GET /api/venues/search/{job_id}/
                             ↓  status: complete → ranked venue cards with explanations
User clicks a card       →  /venues/:id
                             ↓  GET /api/venues/{id}/  (venue detail)
User clicks ♥ heart      →  POST /api/venues/{id}/shortlist/
                         →  DELETE /api/venues/{id}/shortlist/
User visits /shortlist   →  GET /api/shortlist/
Token expires/invalid    →  Interceptor clears token → redirect to /
```

---

## API Reference

### Auth

| Method | URL | Description |
|---|---|---|
| `POST` | `/api/auth/token/` | Obtain auth token (`username`, `password` form fields) |

### Venues (public)

| Method | URL | Description |
|---|---|---|
| `GET` | `/api/venues/` | List venues — filterable, paginated |
| `GET` | `/api/venues/{id}/` | Venue detail |
| `POST` | `/api/venues/search/` | Start AI semantic search `{ query }` → `{ job_id }` |
| `GET` | `/api/venues/search/{job_id}/` | Poll AI result — `PENDING \| STARTED \| complete \| FAILURE` |

**Venue list query params:**

| Param | Type | Description |
|---|---|---|
| `city` | string | Exact city name |
| `min_capacity` | integer | Minimum capacity |
| `max_capacity` | integer | Maximum capacity |
| `max_price` | float | Maximum price per day |

### Shortlist (authenticated — `Authorization: Token <key>`)

| Method | URL | Description |
|---|---|---|
| `POST` | `/api/venues/{id}/shortlist/` | Add venue — 201 created, 200 if already exists |
| `DELETE` | `/api/venues/{id}/shortlist/` | Remove venue |
| `GET` | `/api/shortlist/` | List all shortlisted venues with full detail |

---

## Environment Variables

### Backend (`Backend/.env`)

| Variable | Description | Default |
|---|---|---|
| `SECRET_KEY` | Django secret key | *required* |
| `DEBUG` | Enable debug mode (`1`/`0`) | `0` |
| `ALLOWED_HOSTS` | Comma-separated allowed hosts | `*` |
| `DATABASE_URL` | PostgreSQL DSN | `postgres://venuefinder:venuefinder@db:5432/venuefinder` |
| `REDIS_URL` | Redis DSN | `redis://redis:6379/0` |
| `OPENAI_API_KEY` | OpenAI API key | *required for AI search* |

### Frontend (`Frontend/.env`)

| Variable | Description | Default |
|---|---|---|
| `VITE_API_BASE_URL` | Backend base URL | `http://localhost:8000` |

> `Frontend/.env` is git-ignored. Copy `Frontend/.env.example` to get started.

---

## Project Structure

```
VenueFinder/
├── docker-compose.yml          Full-stack orchestration (db, redis, web, celery, frontend)
├── .gitignore
├── README.md                   ← you are here
│
├── Backend/
│   ├── Dockerfile              Multi-stage Python production image
│   ├── entrypoint.sh           Wait for DB/Redis → migrate → collectstatic → exec
│   ├── requirements.txt
│   ├── pytest.ini
│   ├── manage.py
│   ├── core/
│   │   ├── settings.py         django-environ config, DRF, Celery, Spectacular
│   │   ├── urls.py             Root URL conf (admin, api/, schema/)
│   │   ├── celery.py           Celery app instance
│   │   └── wsgi.py
│   └── apps/
│       └── venues/
│           ├── models.py       Venue, Shortlist, ShortlistSummarySent
│           ├── serializers.py  DRF serializers
│           ├── views.py        List, detail, shortlist, AI search views
│           ├── urls.py         venues/ URL patterns
│           ├── tasks.py        ai_search_task, send_shortlist_summary_email_task
│           ├── admin.py
│           ├── migrations/
│           └── tests/
│
└── Frontend/
    ├── Dockerfile              Node 20 dev image
    ├── vite.config.js
    ├── tailwind.config.js
    └── src/
        ├── components/
        │   ├── auth/           ProtectedRoute
        │   ├── common/         Button, Input, Select, Spinner, Badge, EmptyState, Toast
        │   ├── layout/         Navbar, Sidebar
        │   ├── venue/          VenueCard, VenueGrid, FilterBar
        │   └── ai/             AISearch, AIResultCard
        ├── context/            AuthContext, ShortlistContext, ToastContext
        ├── hooks/              useAISearch, useDebounce
        ├── pages/              Login, Home (Dashboard), VenueDetail, Shortlist
        ├── services/
        │   └── api.js          Axios client — all API functions in one place
        └── utils/              format.js
```

---

## Running Tests

```bash
# Inside Docker
docker compose exec web pytest apps/venues/tests/ -v

# Locally
cd Backend
pip install -r requirements.txt
pytest apps/venues/tests/ -v
```

Test coverage includes shortlist idempotency, AI search (mocked OpenAI), venue list filters, and auth enforcement.

---

## Common Commands

```bash
# Start full stack
docker compose up --build

# Start in background
docker compose up -d --build

# Stop all services
docker compose down

# View logs for a specific service
docker compose logs -f web
docker compose logs -f celery
docker compose logs -f frontend

# Run Django management commands
docker compose exec web python manage.py <command>

# Open a Django shell
docker compose exec web python manage.py shell

# Rebuild a single service
docker compose up -d --build web
```
