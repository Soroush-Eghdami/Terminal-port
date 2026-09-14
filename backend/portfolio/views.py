"""Read-only GETs (cached) + throttled contact POST."""
import logging

from django.conf import settings
from django.core.cache import cache
from django.core.mail import send_mail
from rest_framework.decorators import api_view, throttle_classes
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle

from .models import ContactMessage, Profile, Project, SkillGroup, SocialLink
from .serializers import ContactSerializer, ProfileSerializer, ProjectSerializer

log = logging.getLogger(__name__)


class ContactThrottle(AnonRateThrottle):
    scope = "contact"


def _profile_payload():
    p, _ = Profile.objects.get_or_create(pk=1)
    return ProfileSerializer(p).data


@api_view(["GET"])
def profile(_request):
    key = "api:profile"
    data = cache.get(key)
    if data is None:
        data = _profile_payload()
        cache.set(key, data, settings.GITHUB_CACHE_SECONDS)
    return Response(data)


@api_view(["GET"])
def skills(_request):
    key = "api:skills"
    data = cache.get(key)
    if data is None:
        data = {g.category: g.items for g in SkillGroup.objects.all()}
        cache.set(key, data, settings.GITHUB_CACHE_SECONDS)
    return Response(data)


@api_view(["GET"])
def projects(_request):
    key = "api:projects"
    data = cache.get(key)
    if data is None:
        data = ProjectSerializer(Project.objects.all(), many=True).data
        cache.set(key, data, settings.GITHUB_CACHE_SECONDS)
    return Response(data)


@api_view(["GET"])
def socials(_request):
    key = "api:socials"
    data = cache.get(key)
    if data is None:
        data = [
            {"label": s.label, "value": s.value, "url": s.url}
            for s in SocialLink.objects.all()
        ]
        cache.set(key, data, settings.GITHUB_CACHE_SECONDS)
    return Response(data)


@api_view(["GET"])
def meta(_request):
    p = Profile.objects.filter(pk=1).first()
    return Response(
        {
            "ok": True,
            "github_user": settings.GITHUB_USERNAME,
            "projects": Project.objects.count(),
            "last_synced": p.last_synced if p else None,
        }
    )


@api_view(["POST"])
@throttle_classes([ContactThrottle])
def contact(request):
    ser = ContactSerializer(data=request.data)
    if not ser.is_valid():
        return Response({"ok": False, "errors": ser.errors}, status=400)

    msg = ContactMessage.objects.create(
        name=ser.validated_data["name"],
        email=ser.validated_data["email"],
        message=ser.validated_data["message"],
    )

    # Notify owner — console backend in dev prints it, SMTP in prod sends it.
    try:
        send_mail(
            subject=f"[portfolio] message from {msg.name}",
            message=f"From: {msg.name} <{msg.email}>\n\n{msg.message}",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[settings.CONTACT_NOTIFY_TO],
            fail_silently=False,
        )
        msg.notified = True
        msg.save(update_fields=["notified"])
    except Exception:  # noqa: BLE001 — inbox write already succeeded
        log.exception("contact notify email failed")

    return Response({"ok": True, "id": msg.pk}, status=201)
