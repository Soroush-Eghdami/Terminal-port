# Shapes here are a contract: js/data.js depends on them.
from rest_framework import serializers

from .models import ContactMessage, Project


class ProfileSerializer(serializers.Serializer):
    name = serializers.CharField()
    username = serializers.CharField()
    role = serializers.CharField()
    tagline = serializers.CharField()
    location = serializers.CharField()
    education = serializers.CharField()
    bio = serializers.ListField(child=serializers.CharField())
    fun_fact = serializers.CharField()
    avatar_url = serializers.CharField(allow_blank=True, required=False)
    github_url = serializers.CharField(required=False)
    followers = serializers.IntegerField(required=False)
    public_repos = serializers.IntegerField(required=False)
    resumeUrl = serializers.CharField(source="resume_url", allow_blank=True, required=False)
    last_synced = serializers.DateTimeField(required=False, allow_null=True)


class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ["slug", "name", "desc", "stack", "link", "stars", "featured"]


class ContactSerializer(serializers.ModelSerializer):
    # Honeypot — bots fill it, humans never see it. Reject silently-ish.
    website = serializers.CharField(required=False, allow_blank=True, write_only=True)

    class Meta:
        model = ContactMessage
        fields = ["name", "email", "message", "website"]

    def validate_name(self, value):
        value = value.strip()
        if len(value) < 2:
            raise serializers.ValidationError("Tell me your name (2+ characters).")
        return value

    def validate_message(self, value):
        value = value.strip()
        if len(value) < 10:
            raise serializers.ValidationError("Message is a bit short — 10+ characters so I know it's real.")
        if len(value) > 5000:
            raise serializers.ValidationError("Message is too long (5000 max).")
        return value

    def validate(self, attrs):
        if attrs.pop("website", "").strip():
            raise serializers.ValidationError("Spam detected. Incident reported to /dev/null.")
        return attrs
