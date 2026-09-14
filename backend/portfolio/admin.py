from django.contrib import admin

from .models import ContactMessage, Profile, Project, SkillGroup, SocialLink


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ["username", "name", "role", "last_synced"]


@admin.register(SkillGroup)
class SkillGroupAdmin(admin.ModelAdmin):
    list_display = ["category", "position"]
    ordering = ["position"]


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "stars", "featured", "last_synced"]
    list_filter = ["featured"]
    search_fields = ["name", "slug"]
    list_editable = ["featured"]


@admin.register(SocialLink)
class SocialLinkAdmin(admin.ModelAdmin):
    list_display = ["label", "value", "position"]
    ordering = ["position"]


@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = ["name", "email", "created_at", "notified"]
    readonly_fields = ["created_at"]
    search_fields = ["name", "email", "message"]
