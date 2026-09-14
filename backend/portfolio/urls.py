from django.urls import path

from . import views

urlpatterns = [
    path("profile/", views.profile),
    path("skills/", views.skills),
    path("projects/", views.projects),
    path("socials/", views.socials),
    path("contact/", views.contact),
    path("meta/", views.meta),
]
