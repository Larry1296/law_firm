from datetime import timedelta
from urllib.parse import urlparse

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone

from apps.cases.models import Case, CaseEvent
from apps.common.choices import UserRole
from apps.courtroom.models import CourtroomAttendanceLog, CourtroomLaunchGrant, CourtroomProvider, CourtroomSession, CourtroomStatusHistory


class CourtroomService:
    PROVIDER_HOSTS = {
        CourtroomProvider.ProviderType.MICROSOFT_TEAMS: {"teams.microsoft.com", "teams.live.com"},
        CourtroomProvider.ProviderType.GOOGLE_MEET: {"meet.google.com"},
        CourtroomProvider.ProviderType.ZOOM: {"zoom.us", "www.zoom.us"},
        CourtroomProvider.ProviderType.WEBEX: {"webex.com"},
        CourtroomProvider.ProviderType.JUDICIARY_PORTAL: {"judiciary.go.ke", "court.go.ke"},
        CourtroomProvider.ProviderType.YOUTUBE_LIVE: {"youtube.com", "www.youtube.com", "youtu.be"},
    }

    @classmethod
    def detect_provider(cls, url, provider=None):
        parsed = urlparse(url or "")
        if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
            raise ValidationError("Only safe HTTPS courtroom links are accepted.")
        host = parsed.hostname.lower().rstrip(".")
        allowed = set(provider.allowed_hostnames or []) if provider else set()
        for kind, hosts in cls.PROVIDER_HOSTS.items():
            if any(host == item or host.endswith(f".{item}") for item in hosts):
                return kind
        if provider and any(host == item.lower() or host.endswith(f".{item.lower()}") for item in allowed):
            return provider.provider_type
        raise ValidationError("The courtroom link hostname is not on the approved provider allowlist.")
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
        if hasattr(user, "secretary_profile"):
            return CourtroomSession.objects.none()
        queryset = (
            CourtroomSession.objects.select_related(
                "event",
                "event__case",
                "event__case__client",
                "event__case__assigned_lawyer__user",
                "event__case__assigned_secretary__user",
                "provider",
            )
            .filter(event__in=cls.user_event_filter(user), event__case__is_active=True)
            .annotate(attendance_count=Count("attendance_logs", distinct=True), recording_count=Count("recordings", distinct=True))
        )
        if hasattr(user, "client_profile"):
            now = timezone.now()
            return queryset.filter(
                client_access_enabled=True,
                client_attendance_requirement__in=[CourtroomSession.ClientAttendance.REQUIRED, CourtroomSession.ClientAttendance.OPTIONAL],
                event__status__in=[CaseEvent.EventStatus.SCHEDULED, CaseEvent.EventStatus.CONFIRMED, CaseEvent.EventStatus.IN_PROGRESS],
                client_access_from__lte=now,
                client_access_until__gte=now,
            )
        return queryset

    @classmethod
    def can_operate(cls, user, session):
        return user.role == UserRole.ADMIN or (
            hasattr(user, "lawyer_profile")
            and session.event.case.assigned_lawyer_id == user.lawyer_profile.id
        )

    @classmethod
    @transaction.atomic
    def update_status(cls, *, user, session_id, new_status, note="", source=CourtroomStatusHistory.Source.MANUAL):
        session = cls.get_scoped_session(user, session_id)
        if not cls.can_operate(user, session):
            raise PermissionError("Only the firm administrator or assigned advocate may update operational status.")
        session = CourtroomSession.objects.select_for_update().get(id=session.id)
        previous = session.status
        session.status = new_status
        session.status_updated_by = user
        session.status_updated_at = timezone.now()
        if new_status == CourtroomSession.Status.MATTER_CALLED and not session.matter_called_at:
            session.matter_called_at = timezone.now()
        if new_status == CourtroomSession.Status.COMPLETED and not session.matter_completed_at:
            session.matter_completed_at = timezone.now()
        session.save(update_fields=["status", "status_updated_by", "status_updated_at", "matter_called_at", "matter_completed_at", "updated_at"])
        CourtroomStatusHistory.objects.create(session=session, previous_status=previous, new_status=new_status, actor=user, note=note, source=source)
        return session

    @classmethod
    def log_action(cls, *, session, user, action, notes=""):
        return CourtroomAttendanceLog.objects.create(
            session=session, user=user, attendee_name=user.full_name or user.email,
            attendee_email=user.email, attendee_role=cls.attendance_role(user), status=action, notes=notes,
            joined_at=timezone.now() if action == CourtroomAttendanceLog.AttendanceStatus.JOIN_CONFIRMED else None,
            left_at=timezone.now() if action == CourtroomAttendanceLog.AttendanceStatus.LEFT else None,
        )

    @staticmethod
    def attendance_role(user):
        if user.role == UserRole.ADMIN: return CourtroomAttendanceLog.AttendanceRole.ADMIN
        if hasattr(user, "lawyer_profile"): return CourtroomAttendanceLog.AttendanceRole.LAWYER
        if hasattr(user, "client_profile"): return CourtroomAttendanceLog.AttendanceRole.CLIENT
        return CourtroomAttendanceLog.AttendanceRole.GUEST

    @classmethod
    def issue_launch_grant(cls, user, session_id):
        session = cls.get_scoped_session(user, session_id)
        cls.detect_provider(session.join_url, session.provider)
        grant = CourtroomLaunchGrant.objects.create(session=session, user=user, expires_at=timezone.now() + timedelta(minutes=2))
        cls.log_action(session=session, user=user, action=CourtroomAttendanceLog.AttendanceStatus.JOIN_REQUESTED)
        return grant

    @classmethod
    @transaction.atomic
    def consume_launch_grant(cls, user, grant_id):
        grant = CourtroomLaunchGrant.objects.select_for_update().select_related("session", "session__provider").filter(id=grant_id, user=user).first()
        if not grant or grant.consumed_at or grant.expires_at < timezone.now():
            raise PermissionError("This launch token is invalid, expired or already used.")
        cls.get_scoped_session(user, grant.session_id)
        cls.detect_provider(grant.session.join_url, grant.session.provider)
        grant.consumed_at = timezone.now(); grant.save(update_fields=["consumed_at"])
        cls.log_action(session=grant.session, user=user, action=CourtroomAttendanceLog.AttendanceStatus.PROVIDER_OPENED)
        return grant.session

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
            "clashes": cls.detect_clashes(sessions),
        }

    @staticmethod
    def detect_clashes(sessions):
        items = list(sessions.filter(responsible_advocate__isnull=False).select_related("event", "responsible_advocate"))
        conflicts = []
        substantive = {CaseEvent.EventType.HEARING}
        routine = {CaseEvent.EventType.RULING, CaseEvent.EventType.JUDGMENT}
        for index, left in enumerate(items):
            left_end = left.event.ends_at or left.event.starts_at + timedelta(hours=1)
            for right in items[index + 1:]:
                if left.responsible_advocate_id != right.responsible_advocate_id:
                    continue
                right_end = right.event.ends_at or right.event.starts_at + timedelta(hours=1)
                if left.event.starts_at >= right_end or right.event.starts_at >= left_end:
                    continue
                types = {left.event.event_type, right.event.event_type}
                if types <= routine: severity = "LOW"
                elif types <= {CaseEvent.EventType.MENTION, CaseEvent.EventType.DIRECTIONS}: severity = "MEDIUM"
                elif types & substantive and types & {CaseEvent.EventType.MENTION, CaseEvent.EventType.DIRECTIONS}: severity = "HIGH"
                else: severity = "CRITICAL"
                conflicts.append({"severity": severity, "session_ids": [str(left.id), str(right.id)], "advocate_id": str(left.responsible_advocate_id)})
        return conflicts

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
