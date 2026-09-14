"""Dev settings, env-overridable."""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


def env(name, default=""):
    return os.environ.get(name, default)


def env_bool(name, default=False):
    return env(name, str(default)).strip().lower() in {"1", "true", "yes", "on"}


def env_list(name, default=""):
    return [x.strip() for x in env(name, default).split(",") if x.strip()]


# Minimal .env loader (stdlib only).
_env_file = BASE_DIR / ".env"
if _env_file.exists():
    for _line in _env_file.read_text(encoding="utf-8").splitlines():
        _line = _line.strip()
        if _line and not _line.startswith("#") and "=" in _line:
            _k, _v = _line.split("=", 1)
            os.environ.setdefault(_k.strip(), _v.strip().strip('"').strip("'"))


SECRET_KEY = env("DJANGO_SECRET_KEY", "django-insecure-dev-only-change-me")
DEBUG = env_bool("DJANGO_DEBUG", True)
ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "127.0.0.1,localhost")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "corsheaders",
    "portfolio",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# SQLite now; swap DATABASE_URL parsing here when you move to Postgres.
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Open CORS in DEBUG (covers file://); restrict via env in prod.
CORS_ALLOW_ALL_ORIGINS = DEBUG
CORS_ALLOWED_ORIGINS = env_list(
    "CORS_ALLOWED_ORIGINS",
    "http://127.0.0.1:8000,http://localhost:8000,"
    "http://127.0.0.1:5500,http://localhost:5500,"
    "http://127.0.0.1:8001,http://localhost:8001,"
    "http://127.0.0.1:3000,http://localhost:3000",
)
# Per-IP throttle for the contact endpoint.
REST_FRAMEWORK = {
    "DEFAULT_THROTTLE_RATES": {
        "contact": "5/hour",  # per-IP throttle on the contact endpoint
    },
}

# Simple 6h cache for GitHub-backed reads (locmem in dev, redis later).
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "portfolio-cache",
    }
}
GITHUB_CACHE_SECONDS = int(env("GITHUB_CACHE_SECONDS", "21600"))  # 6h
GITHUB_USERNAME = env("GITHUB_USERNAME", "Soroush-Eghdami")
GITHUB_TOKEN = env("GITHUB_TOKEN", "")

# Gmail SMTP via backend/.env; without it mail goes to console.
if env("EMAIL_HOST") or env("EMAIL_HOST_USER"):
    EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
    EMAIL_HOST = env("EMAIL_HOST", "smtp.gmail.com")
    EMAIL_PORT = int(env("EMAIL_PORT", "587"))
    EMAIL_HOST_USER = env("EMAIL_HOST_USER")
    EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD")
    EMAIL_USE_TLS = env_bool("EMAIL_USE_TLS", True)
    DEFAULT_FROM_EMAIL = (
        env("CONTACT_NOTIFY_FROM") or env("EMAIL_HOST_USER") or "portfolio@localhost"
    )
else:
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
    DEFAULT_FROM_EMAIL = env("CONTACT_NOTIFY_FROM", "portfolio@localhost")
CONTACT_NOTIFY_TO = (
    env("CONTACT_RECIPIENT_EMAIL")
    or env("CONTACT_NOTIFY_TO", "Soroush.egh@gmail.com")
)
