# Backend (Django + DRF) — live API for the terminal

The frontend stays static by default; type **`api on`** in the terminal (or open
`?api=1`) and `js/data.js` fetches from here instead, with static fallback.

| Getter (js/data.js)   | Method | Endpoint          |
|-----------------------|--------|-------------------|
| `getProfile()`        | GET    | `/api/profile/`   |
| `getSkills()`         | GET    | `/api/skills/`    |
| `getProjects()`       | GET    | `/api/projects/`  |
| `getSocials()`        | GET    | `/api/socials/`   |
| `submitContact()`     | POST   | `/api/contact/` → `201 {"ok": true, "id": N}` |
| `api status`          | GET    | `/api/meta/` (health + sync freshness) |

## Quickstart

```powershell
# from the repo root, venv python:
.\.venv\Scripts\python backend\manage.py migrate
.\.venv\Scripts\python backend\manage.py seed_static   # starter data, works offline
.\.venv\Scripts\python backend\manage.py sync_github   # live GitHub pull (optional GITHUB_TOKEN env)
.\.venv\Scripts\python backend\manage.py runserver     # API on http://127.0.0.1:8000/api/
.\.venv\Scripts\python backend\manage.py test portfolio
```

Copy `.env.example` → `.env` for secrets (gitignored). Contact mail prints to
console by default; set `EMAIL_HOST*` for real SMTP delivery to `CONTACT_NOTIFY_TO`.

## Design notes

- **GitHub sync, not live proxy.** `sync_github` writes Profile/Project rows
  (forks/private skipped, deleted repos pruned unless `--no-prune`); reads are
  cached 6h (`GITHUB_CACHE_SECONDS`). Terminal slugs stay stable via overrides.
- **Contact:** DRF validation + honeypot `website` field + `5/hour` per-IP
  throttle; message is stored first, owner email second (inbox survives SMTP failure).

## Contract (keep these shapes — the terminal depends on them)

GET /api/projects/ →
```json
[
  {"slug": "rag", "name": "R.A.G", "desc": "...", "stack": ["Python"],
   "link": "https://github.com/...", "stars": 3, "featured": true}
]
```

POST /api/contact/ `{"name","email","message"}` → `201 {"ok": true}`

## Minimal Django sketch (when you're ready)

```python
# backend/portfolio/models.py
from django.db import models

class Project(models.Model):
    slug = models.SlugField(unique=True)
    name = models.CharField(max_length=120)
    desc = models.TextField()
    stack = models.JSONField(default=list)   # ["Python", "Django"]
    link = models.URLField()
    stars = models.IntegerField(default=0)
    featured = models.BooleanField(default=False)

class ContactMessage(models.Model):
    name = models.CharField(max_length=120)
    email = models.EmailField()
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
```

```python
# backend/portfolio/urls.py
from django.urls import path
from . import views
urlpatterns = [
    path("profile/", views.profile),
    path("skills/", views.skills),
    path("projects/", views.projects),
    path("socials/", views.socials),
    path("contact/", views.contact),  # POST
]
```

Serve the static frontend from Django (`STATICFILES_DIRS`) or keep it on
Vercel/Netlify and enable CORS for your domain. Then flip `USE_API = true`.

Until then: `submitContact()` queues messages in `localStorage`
(`portfolio_contact_queue`) so the `contact` command works offline.
