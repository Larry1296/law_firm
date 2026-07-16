from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from apps.cases.models import Case, CaseEvent
from apps.cases.services.case_service import CaseService
from apps.common.choices import UserRole
from apps.events.models import EventClientAwareness
from apps.notifications.models import Notification
from apps.notifications.services import NotificationService


class EventService:
    COURT_EVENT_TYPES = {
        CaseEvent.EventType.MENTION,
        CaseEvent.EventType.HEARING,
        CaseEvent.EventType.DIRECTIONS,
        CaseEvent.EventType.PRE_TRIAL,
        CaseEvent.EventType.RULING,
        CaseEvent.EventType.JUDGMENT,
        CaseEvent.EventType.TAXATION,
    }

    @staticmethod
    def get_user_firm(user):
        return CaseService.get_user_firm(user)

    @staticmethod
    def is_admin_for_firm(user, firm):
        return user.role == UserRole.ADMIN and getattr(firm, "owner_id", None) == user.id

    @classmethod
    def scoped_cases(cls, user):
        firm = cls.get_user_firm(user)
        queryset = Case.objects.filter(firm=firm, is_active=True).select_related(
            "firm",
            "client",
            "client__user",
            "assigned_lawyer",
            "assigned_lawyer__user",
            "assigned_secretary",
            "assigned_secretary__user",
        )
        if cls.is_admin_for_firm(user, firm):
            return queryset
        if hasattr(user, "lawyer_profile"):
            return queryset.filter(assigned_lawyer=user.lawyer_profile)
        if hasattr(user, "secretary_profile"):
            secretary = user.secretary_profile
            return queryset.filter(
                Q(assigned_secretary=secretary)
                | Q(assigned_lawyer__in=secretary.assigned_lawyers.all())
            )
        if hasattr(user, "client_profile"):
            return queryset.filter(client=user.client_profile)
        return queryset.none()

    @classmethod
    def scoped_events(cls, user):
        queryset = (
            CaseEvent.objects.filter(case__in=cls.scoped_cases(user))
            .select_related(
                "case",
                "case__client",
                "case__client__user",
                "case__assigned_lawyer",
                "case__assigned_lawyer__user",
                "case__assigned_secretary",
                "case__assigned_secretary__user",
                "created_by",
            )
            .select_related("client_awareness", "client_awareness__updated_by")
            .order_by("starts_at")
        )
        if hasattr(user, "client_profile"):
            queryset = queryset.filter(is_client_visible=True)
        return queryset

    @classmethod
    def list_events(cls, user, *, scope="", case_id=None):
        now = timezone.now()
        today = timezone.localdate()
        queryset = cls.scoped_events(user)
        if case_id:
            queryset = queryset.filter(case_id=case_id)
        if scope == "today":
            queryset = queryset.filter(starts_at__date=today)
        elif scope == "upcoming":
            queryset = queryset.filter(starts_at__gte=now)
        elif scope == "current":
            queryset = queryset.filter(starts_at__date=today, status=CaseEvent.EventStatus.SCHEDULED)
        elif scope == "past":
            queryset = queryset.filter(starts_at__lt=now)
        return queryset

    @classmethod
    def participant_users(cls, event):
        users = []
        case = event.case
        if case.assigned_lawyer_id and case.assigned_lawyer.user_id:
            users.append(case.assigned_lawyer.user)
        if case.assigned_secretary_id and case.assigned_secretary.user_id:
            users.append(case.assigned_secretary.user)
        if event.is_client_visible and case.client.user_id:
            users.append(case.client.user)

        unique = {}
        for user in users:
            if user and user.is_active:
                unique[user.id] = user
        return list(unique.values())

    @classmethod
    def ensure_can_manage(cls, user, case):
        if cls.is_admin_for_firm(user, case.firm):
            return True
        lawyer = getattr(user, "lawyer_profile", None)
        if lawyer is not None and lawyer.is_active and case.assigned_lawyer_id == lawyer.id:
            return True
        secretary = getattr(user, "secretary_profile", None)
        if secretary is not None and secretary.is_active:
            return (
                case.assigned_secretary_id == secretary.id
                or secretary.assigned_lawyers.filter(id=case.assigned_lawyer_id).exists()
            )
        raise PermissionError("Only the firm owner/admin or assigned secretary can manage events.")

    @classmethod
    def awareness_for_event(cls, event):
        awareness, _ = EventClientAwareness.objects.get_or_create(
            event=event,
            defaults={"client": event.case.client},
        )
        return awareness

    @classmethod
    def action_url_for(cls, recipient, event):
        if hasattr(recipient, "client_profile"):
            return f"/client/calendar?event={event.id}"
        if hasattr(recipient, "lawyer_profile"):
            return f"/lawyer/calendar?event={event.id}"
        if hasattr(recipient, "secretary_profile"):
            return f"/secretary/calendar?event={event.id}"
        if recipient.role == UserRole.ADMIN:
            return f"/admin/calendar?event={event.id}"
        return f"/notifications?event={event.id}"

    @classmethod
    def notify_event(cls, event, *, actor=None, reason="scheduled"):
        awareness = cls.awareness_for_event(event)
        notifications = []
        local_time = timezone.localtime(event.starts_at).strftime("%d %b %Y %H:%M")
        verb = "updated" if reason == "updated" else "scheduled"

        for recipient in cls.participant_users(event):
            notification = NotificationService.create(
                firm=event.case.firm,
                recipient=recipient,
                actor=actor,
                case=event.case,
                notification_type=Notification.NotificationType.CASE_EVENT,
                title=f"Case event {verb}: {event.case.case_number}",
                message=f"{event.title} is {verb} for {local_time}.",
                action_url=cls.action_url_for(recipient, event),
                event_key=f"CASE_EVENT:{reason}:{event.id}:{recipient.id}",
            )
            if notification is not None:
                notifications.append(notification)

        if event.is_client_visible and event.case.client.user_id:
            awareness.status = EventClientAwareness.AwarenessStatus.NOTIFIED
            awareness.notified_at = awareness.notified_at or timezone.now()
            awareness.updated_by = actor
            awareness.save(update_fields=["status", "notified_at", "updated_by", "updated_at"])
        return notifications

    @classmethod
    @transaction.atomic
    def create_event(cls, *, user, validated_data):
        notify_participants = validated_data.pop("notify_participants", True)
        case_id = validated_data.pop("case_id")
        case = cls.scoped_cases(user).get(id=case_id)
        cls.ensure_can_manage(user, case)
        event = CaseEvent.objects.create(case=case, created_by=user, **validated_data)
        cls.awareness_for_event(event)
        if notify_participants:
            cls.notify_event(event, actor=user, reason="scheduled")
        return event

    @classmethod
    @transaction.atomic
    def update_event(cls, *, user, event_id, validated_data):
        notify_participants = validated_data.pop("notify_participants", True)
        event = cls.scoped_events(user).select_for_update(of=("self",)).get(id=event_id)
        cls.ensure_can_manage(user, event.case)
        for field, value in validated_data.items():
            setattr(event, field, value)
        event.save()
        cls.awareness_for_event(event)
        if notify_participants:
            cls.notify_event(event, actor=user, reason="updated")
        return event

    @classmethod
    @transaction.atomic
    def update_awareness(cls, *, user, event_id, validated_data):
        event = cls.scoped_events(user).select_for_update(of=("self",)).get(id=event_id)
        cls.ensure_can_manage(user, event.case)
        awareness = cls.awareness_for_event(event)
        awareness.status = validated_data["status"]
        awareness.confirmation_channel = validated_data.get("confirmation_channel", awareness.confirmation_channel)
        awareness.notes = validated_data.get("notes", awareness.notes)
        awareness.updated_by = user
        if awareness.status == EventClientAwareness.AwarenessStatus.CONFIRMED and awareness.confirmed_at is None:
            awareness.confirmed_at = timezone.now()
        awareness.save()
        return awareness
