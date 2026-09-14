"""Seed the DB with the static content so the API runs offline."""
from django.core.cache import cache
from django.core.management.base import BaseCommand

from portfolio.models import Profile, Project, SkillGroup, SocialLink

SKILLS = {
    "Languages & Frameworks": ["Python", "Django", "Django REST Framework", "Flask",
                                "JavaScript", "TypeScript", "C++", "Bash"],
    "Databases & Caching": ["PostgreSQL", "MongoDB", "MySQL", "Redis", "SQLite"],
    "DevOps & Tools": ["Docker", "Git", "Linux", "Postman", "Nginx (basics)", "CI/CD (basics)"],
    "AI / ML": ["RAG systems", "LangChain (basics)", "Transformers", "Groq API",
                "scikit-learn (spam classifier)"],
}

PROJECTS = [
    dict(slug="rag", name="R.A.G", featured=True, stars=3,
         link="https://github.com/Soroush-Eghdami/R.A.G",
         desc="Local, private RAG app for law students — upload cases, ask questions, get cited answers. CLI + web UI.",
         stack=["Python", "RAG", "LLM", "Vector DB"]),
    dict(slug="tweeter", name="Tweeter_Demo", featured=True, stars=5,
         link="https://github.com/Soroush-Eghdami/Tweeter_Demo",
         desc="Full-stack Twitter clone with Docker support and real-time features.",
         stack=["TypeScript", "Django/DRF", "Docker", "Realtime"]),
    dict(slug="shop", name="Online-shop-CBV", featured=True, stars=2,
         link="https://github.com/Soroush-Eghdami/Online-shop-CBV",
         desc="Full-featured Django e-commerce demo — clean class-based-view architecture, ready to deploy.",
         stack=["Python", "Django", "CBV", "PostgreSQL"]),
    dict(slug="summerizer", name="Summerizer", featured=True, stars=5,
         link="https://github.com/Soroush-Eghdami/Summerizer",
         desc="Modern Flask web app that summarizes text, PDFs and audio using transformer models + Groq API.",
         stack=["Python", "Flask", "Transformers", "Groq API"]),
    dict(slug="spam", name="Spam-classifire", featured=False, stars=2,
         link="https://github.com/Soroush-Eghdami/Spam-classifire",
         desc="ML-based spam classifier — predicts whether an email is spam using a trained model.",
         stack=["Python", "scikit-learn", "Jupyter"]),
    dict(slug="organizer", name="Organizer", featured=False, stars=1,
         link="https://github.com/Soroush-Eghdami/Organizer",
         desc="Python file/task organizer utility — keep your filesystem and workflow tidy.",
         stack=["Python", "CLI"]),
    dict(slug="yt", name="YT-Downloader", featured=False, stars=0,
         link="https://github.com/Soroush-Eghdami/YT-Downloader",
         desc="Simple YouTube downloader with a UI.",
         stack=["Python", "UI"]),
]

SOCIALS = [
    ("GitHub", "Soroush-Eghdami", "https://github.com/Soroush-Eghdami"),
    ("Email", "Soroush.egh@gmail.com", "mailto:Soroush.egh@gmail.com"),
    ("Telegram", "@inairplanemode", "https://t.me/inairplanemode"),
    ("X / Twitter", "@Tha_Dead_Sheep", "https://twitter.com/Tha_Dead_Sheep"),
    ("Instagram", "@soroush_eghdami_", "https://www.instagram.com/soroush_eghdami_/"),
    ("Bluesky", "sorousheghdami.bsky.social", "https://bsky.app/profile/sorousheghdami.bsky.social"),
]


class Command(BaseCommand):
    help = "Seed DB with the static content from js/data.js."

    def handle(self, *args, **opts):
        Profile.objects.update_or_create(
            pk=1,
            defaults={
                "name": "Soroush Eghdami",
                "username": "soroush",
                "role": "Python Backend Developer",
                "tagline": "Django · REST APIs · Docker · AI-powered RAG systems",
                "location": "404: Location Not Found",
                "education": "Computer Engineering (Operating Systems, Computer Vision)",
                "github_url": "https://github.com/Soroush-Eghdami",
                "bio": [
                    "Backend developer building real-world systems with Python, Django and REST APIs.",
                    "Currently exploring AI/ML — RAG systems and backend architecture.",
                    "Studying Computer Engineering. Open to collaborating on impactful, well-engineered projects.",
                ],
                "fun_fact": "needs_coffee() -> always True",
            },
        )
        for i, (cat, items) in enumerate(SKILLS.items()):
            SkillGroup.objects.update_or_create(
                category=cat, defaults={"items": items, "position": i})
        for p in PROJECTS:
            Project.objects.update_or_create(slug=p["slug"], defaults=p)
        for i, (label, value, url) in enumerate(SOCIALS):
            SocialLink.objects.update_or_create(
                label=label, defaults={"value": value, "url": url, "position": i})
        cache.clear()
        self.stdout.write(self.style.SUCCESS(
            f"seeded: {len(SKILLS)} skill groups, {len(PROJECTS)} projects, {len(SOCIALS)} socials."))
