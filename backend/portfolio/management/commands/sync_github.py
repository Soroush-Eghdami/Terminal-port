"""Pull profile + public repos from GitHub into the DB.

Usage:
    python manage.py sync_github
    python manage.py sync_github --username SomeoneElse --no-prune

Needs no token for public data (60 req/hr), but GITHUB_TOKEN lifts it to
5,000/hr. Non-fork repos become Project rows: primary language + topics map
to `stack`, stars/featured sync, repos you deleted get pruned by default.
"""
import re

import requests
from django.conf import settings
from django.core.cache import cache
from django.core.management.base import BaseCommand
from django.utils import timezone

from portfolio.models import Profile, Project

API = "https://api.github.com"
# Slugs the terminal advertises as `projects <slug>` — keep stable across syncs.
SLUG_OVERRIDES = {
    "R.A.G": "rag",
    "Tweeter_Demo": "tweeter",
    "Online-shop-CBV": "shop",
    "Summerizer": "summerizer",
    "Spam-classifire": "spam",
    "Organizer": "organizer",
    "YT-Downloader": "yt",
}
FEATURED = {"R.A.G", "Tweeter_Demo", "Online-shop-CBV", "Summerizer"}


def slugify(name):
    if name in SLUG_OVERRIDES:
        return SLUG_OVERRIDES[name]
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return slug or name.lower()


def gh(session, path, params=None):
    r = session.get(f"{API}{path}", params=params or {}, timeout=20)
    r.raise_for_status()
    return r.json()


class Command(BaseCommand):
    help = "Sync GitHub profile + repos into the DB."

    def add_arguments(self, parser):
        parser.add_argument("--username", default=settings.GITHUB_USERNAME)
        parser.add_argument("--no-prune", action="store_true",
                            help="Keep DB projects whose repo vanished.")

    def handle(self, *args, **opts):
        username = opts["username"]
        s = requests.Session()
        s.headers["Accept"] = "application/vnd.github+json"
        if settings.GITHUB_TOKEN:
            s.headers["Authorization"] = f"Bearer {settings.GITHUB_TOKEN}"

        user = gh(s, f"/users/{username}")
        now = timezone.now()
        Profile.objects.update_or_create(
            pk=1,
            defaults={
                "name": user.get("name") or username,
                "location": user.get("location") or "404: Location Not Found",
                "avatar_url": user.get("avatar_url") or "",
                "github_url": user.get("html_url") or f"https://github.com/{username}",
                "followers": user.get("followers") or 0,
                "public_repos": user.get("public_repos") or 0,
                "bio": [
                    user.get("bio") or "Python Backend Developer.",
                    "Synced live from GitHub — run `sync_github` to refresh.",
                ],
                "last_synced": now,
            },
        )
        self.stdout.write(f"profile: {user.get('name')} ({user.get('public_repos')} repos)")

        seen, page, created, updated = set(), 1, 0, 0
        while True:
            repos = gh(s, f"/users/{username}/repos",
                       {"sort": "updated", "per_page": 100, "page": page})
            if not repos:
                break
            for repo in repos:
                if repo.get("fork") or repo.get("private"):
                    continue
                slug = slugify(repo["name"])
                seen.add(slug)
                stack = [repo.get("language")] if repo.get("language") else []
                stack += [t for t in repo.get("topics", []) if t not in stack][:4]
                _, is_new = Project.objects.update_or_create(
                    slug=slug,
                    defaults={
                        "name": repo["name"],
                        "desc": repo.get("description") or "",
                        "stack": stack,
                        "link": repo.get("html_url"),
                        "stars": repo.get("stargazers_count") or 0,
                        "featured": repo["name"] in FEATURED,
                        "last_synced": now,
                    },
                )
                created, updated = created + is_new, updated + (not is_new)
            page += 1

        pruned = 0
        if not opts["no_prune"]:
            pruned, _ = Project.objects.exclude(slug__in=seen).delete()

        for key in ("api:profile", "api:projects"):
            cache.delete(key)
        self.stdout.write(
            self.style.SUCCESS(
                f"done: {created} created, {updated} updated, {pruned} pruned."
            )
        )
