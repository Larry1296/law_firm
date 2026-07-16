from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone

from apps.cases.models import Case, CaseEvent
from apps.common.choices import UserRole
from apps.courtroom.models import CourtroomProvider, CourtroomSession


class CourtroomService:
    @staticmethod
    def firm_for_user(user):
        if user.role == UserRole.ADMIN:
            return getattr(user, "owned_firm", None)
        if hasattr(user, "lawyer_profile"):
            return user.lawyer_profile.law_firm
        if hasattr(user, "secretary_profile"):
            return user.secretary_profile.law_firm
        if hasattr(user, "client_profile"):
            return user.client_profile.firm
        return None

    @classmethod
    def user_event_filter(cls, user):
        firm = cls.firm_for_user(user)
        if not firm:
            return CaseEvent.objects.none()
        base = CaseEvent.objects.select_related(
            "case",
            "case__firm",
            "case__client",
            "case__assigned_lawyer__user",
            "case__assigned_secretary__user",
        ).filter(case__firm=firm)

        if user.role == UserRole.ADMIN:
            return base
        if hasattr(user, "lawyer_profile"):
            return base.filter(case__assigned_lawyer=user.lawyer_profile)
        if hasattr(user, "secretary_profile"):
            secretary = user.secretary_profile
            return base.filter(Q(case__assigned_secretary=secretary) | Q(case__assigned_lawyer__in=secretary.assigned_lawyers.all()))
        if hasattr(user, "client_profile"):
            return base.filter(case__client=user.client_profile, is_client_visible=True)
        return CaseEvent.objects.none()

    @classmethod
    def sessions_for_user(cls, user):
        return (
            CourtroomSession.objects.select_related(
                "event",
                "event__case",
                "event__case__client",
                "event__case__assigned_lawyer__user",
                "event__case__assigned_secretary__user",
                "provider",
            )
            .filter(event__in=cls.user_event_filter(user))
            .annotate(attendance_count=Count("attendance_logs", distinct=True), recording_count=Count("recordings", distinct=True))
        )

    @classmethod
    def providers_for_user(cls, user):
        firm = cls.firm_for_user(user)
        if not firm:
            return CourtroomProvider.objects.none()
        return CourtroomProvider.objects.filter(firm=firm)

    @classmethod
    def get_scoped_session(cls, user, session_id):
        return get_object_or_404(cls.sessions_for_user(user), id=session_id)

    @staticmethod
    def sync_event_link(session):
        event = session.event
        changed = False
        if event.virtual_courtroom_url != session.join_url:
            event.virtual_courtroom_url = session.join_url
            changed = True
        if not event.is_virtual_courtroom_enabled:
            event.is_virtual_courtroom_enabled = True
            changed = True
        if changed:
            event.save(update_fields=["virtual_courtroom_url", "is_virtual_courtroom_enabled", "updated_at"])

    @classmethod
    def analytics(cls, user):
        now = timezone.localtime()
        today = now.date()
        sessions = cls.sessions_for_user(user)
        return {
            "total_sessions": sessions.count(),
            "today_sessions": sessions.filter(event__starts_at__date=today).count(),
            "live_sessions": sessions.filter(status=CourtroomSession.Status.LIVE).count(),
            "waiting_sessions": sessions.filter(status=CourtroomSession.Status.WAITING).count(),
            "recorded_sessions": sessions.filter(recordings__isnull=False).distinct().count(),
            "attendance_logs": sessions.aggregate(total=Count("attendance_logs"))["total"] or 0,
            "upcoming_sessions": sessions.filter(event__starts_at__gte=now).count(),
        }

    @classmethod
    def admin_case_events(cls, user):
        firm = cls.firm_for_user(user)
        if not firm or user.role != UserRole.ADMIN:
            return CaseEvent.objects.none()
        return CaseEvent.objects.filter(case__firm=firm)

    @classmethod
    def case_queryset(cls, user):
        firm = cls.firm_for_user(user)
        if not firm:
            return Case.objects.none()
        return Case.objects.filter(firm=firm)
