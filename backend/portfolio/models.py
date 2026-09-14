"""DB mirror of the terminal content; refreshed by `sync_github`."""
from django.db import models


class Profile(models.Model):
    """Singleton row (pk=1) — mirrors the static profile in js/data.js."""

    name = models.CharField(max_length=120, default="Soroush Eghdami")
    username = models.CharField(max_length=60, default="soroush")
    role = models.CharField(max_length=120, default="Python Backend Developer")
    tagline = models.CharField(
        max_length=255, default="Django · REST APIs · Docker · AI-powered RAG systems"
    )
    location = models.CharField(max_length=120, default="404: Location Not Found")
    education = models.CharField(
        max_length=255,
        default="Computer Engineering (Operating Systems, Computer Vision)",
    )
    bio = models.JSONField(default=list)
    fun_fact = models.CharField(max_length=255, default="needs_coffee() -> always True")
    avatar_url = models.URLField(blank=True, default="")
    github_url = models.URLField(default="https://github.com/Soroush-Eghdami")
    followers = models.IntegerField(default=0)
    public_repos = models.IntegerField(default=0)
    resume_url = models.CharField(max_length=255, blank=True, default="")
    last_synced = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Profile({self.username})"


class SkillGroup(models.Model):
    """e.g. 'Languages & Frameworks' + ordered list of skill names."""

    category = models.CharField(max_length=120, unique=True)
    items = models.JSONField(default=list)
    position = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["position", "category"]

    def __str__(self):
        return self.category


class Project(models.Model):
    slug = models.SlugField(unique=True)
    name = models.CharField(max_length=120)
    desc = models.TextField(blank=True, default="")
    stack = models.JSONField(default=list)
    link = models.URLField()
    stars = models.IntegerField(default=0)
    featured = models.BooleanField(default=False)
    last_synced = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-featured", "-stars", "name"]

    def __str__(self):
        return self.name


class SocialLink(models.Model):
    label = models.CharField(max_length=60)
    value = models.CharField(max_length=120)
    url = models.URLField()
    position = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["position", "label"]

    def __str__(self):
        return self.label


class ContactMessage(models.Model):
    name = models.CharField(max_length=120)
    email = models.EmailField()
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    notified = models.BooleanField(default=False)  # email sent to owner?

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} <{self.email}> @ {self.created_at:%Y-%m-%d %H:%M}"
