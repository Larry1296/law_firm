from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from apps.cases.models import Case, CaseEvent
from apps.common.choices import UserRole
from apps.events.services import EventService
from apps.notifications.models import Notification
from apps.notifications.services import NotificationService


class VirtualCourtroomService:
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
        return EventService.get_user_firm(user)

    @staticmethod
    def is_admin_for_firm(user, firm):
        return user.role == UserRole.ADMIN and getattr(firm, "owner_id", None) == user.id

    @staticmethod
    def scoped_cases(user):
        return EventService.scoped_cases(user)

    @staticmethod
    def scoped_events(user):
        return EventService.scoped_events(user)

    @staticmethod
    def today_events(user):
        return EventService.list_events(user, scope="today").filter(
            event_type__in=EventService.COURT_EVENT_TYPES,
        )

    @staticmethod
    def is_link_available(event):
        if not event.is_virtual_courtroom_enabled or not event.virtual_courtroom_url:
            return False

        now = timezone.now()
        if event.virtual_courtroom_available_from and event.virtual_courtroom_available_from > now:
            return False
        if event.virtual_courtroom_available_until and event.virtual_courtroom_available_until < now:
            return False
        return True

    @staticmethod
    def participant_users(event):
        return EventService.participant_users(event)

    @staticmethod
    def ensure_can_manage(user, case):
        return EventService.ensure_can_manage(user, case)

    @staticmethod
    @transaction.atomic
    def create_event(*, user, case_id, validated_data):
        validated_data = {**validated_data, "case_id": case_id}
        event = EventService.create_event(user=user, validated_data=validated_data)
        if event.is_virtual_courtroom_enabled and event.virtual_courtroom_url:
            VirtualCourtroomService.notify_link_available(event, actor=user)
        return event

    @staticmethod
    @transaction.atomic
    def update_link(*, user, event_id, validated_data):
        notify_participants = validated_data.pop("notify_participants", True)
        event = VirtualCourtroomService.scoped_events(user).select_for_update(of=("self",)).get(id=event_id)
        VirtualCourtroomService.ensure_can_manage(user, event.case)

        old_url = event.virtual_courtroom_url
        old_enabled = event.is_virtual_courtroom_enabled

        for field, value in validated_data.items():
            setattr(event, field, value)

        if event.virtual_courtroom_url and "is_virtual_courtroom_enabled" not in validated_data:
            event.is_virtual_courtroom_enabled = True
        if not event.virtual_courtroom_url:
            event.is_virtual_courtroom_enabled = False

        event.save(
            update_fields=[
                "virtual_courtroom_url",
                "virtual_courtroom_label",
                "virtual_courtroom_available_from",
                "virtual_courtroom_available_until",
                "is_virtual_courtroom_enabled",
                "updated_at",
            ]
        )

        link_became_available = (
            notify_participants
            and event.is_virtual_courtroom_enabled
            and event.virtual_courtroom_url
            and (event.virtual_courtroom_url != old_url or not old_enabled)
        )
        if link_became_available:
            VirtualCourtroomService.notify_link_available(event, actor=user)

        return event

    @staticmethod
    def notify_link_available(event, *, actor=None):
        notifications = []
        for recipient in VirtualCourtroomService.participant_users(event):
            if hasattr(recipient, "client_profile"):
                action_url = f"/client/calendar?event={event.id}"
            elif hasattr(recipient, "lawyer_profile"):
                action_url = f"/lawyer/courtroom?event={event.id}"
            elif hasattr(recipient, "secretary_profile"):
                action_url = f"/secretary/calendar?event={event.id}"
            else:
                action_url = f"/notifications?event={event.id}"

            notification = NotificationService.create(
                firm=event.case.firm,
                recipient=recipient,
                actor=actor,
                case=event.case,
                notification_type=Notification.NotificationType.COURTROOM_LINK,
                title=f"Courtroom link available: {event.case.case_number}",
                message=(
                    f"The virtual courtroom link for {event.title} "
                    f"on {timezone.localtime(event.starts_at).strftime('%d %b %Y %H:%M')} is available."
                ),
                action_url=action_url,
                event_key=f"COURTROOM_LINK:{event.id}:{recipient.id}",
            )
            if notification is not None:
                notifications.append(notification)
        return notifications
