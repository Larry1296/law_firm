from django.db import transaction
from django.utils import timezone

from apps.notifications.models import Notification


class NotificationService:
    @staticmethod
    def list_for_user(user, *, unread_only=False):
        queryset = (
            Notification.objects.filter(recipient=user)
            .select_related("firm", "recipient", "actor", "case")
            .order_by("-created_at")
        )
        if unread_only:
            queryset = queryset.filter(read_at__isnull=True)
        return queryset

    @staticmethod
    def unread_count(user):
        return Notification.objects.filter(recipient=user, read_at__isnull=True).count()

    @staticmethod
    def dashboard_items(user, *, limit=5):
        return [
            {
                "id": str(notification.id),
                "title": notification.title,
                "description": notification.message,
                "message": notification.message,
                "notification_type": notification.notification_type,
                "is_read": notification.is_read,
                "created_at": notification.created_at,
                "action_url": notification.action_url,
                "case": str(notification.case_id) if notification.case_id else None,
                "case_number": notification.case.case_number if notification.case_id else "",
            }
            for notification in NotificationService.list_for_user(user)[:limit]
        ]

    @staticmethod
    @transaction.atomic
    def create(
        *,
        firm,
        recipient,
        title,
        message,
        actor=None,
        case=None,
        notification_type=Notification.NotificationType.GENERAL,
        action_url="",
        event_key="",
    ):
        if not recipient or not getattr(recipient, "is_active", False):
            return None

        if event_key:
            notification, created = Notification.objects.get_or_create(
                recipient=recipient,
                event_key=event_key,
                defaults={
                    "firm": firm,
                    "actor": actor,
                    "case": case,
                    "notification_type": notification_type,
                    "title": title,
                    "message": message,
                    "action_url": action_url,
                },
            )
            return notification

        return Notification.objects.create(
            firm=firm,
            recipient=recipient,
            actor=actor,
            case=case,
            notification_type=notification_type,
            title=title,
            message=message,
            action_url=action_url,
        )

    @staticmethod
    def notify_case_assignment(*, case, recipient, role_label, actor=None, reassigned=False):
        notification_type = (
            Notification.NotificationType.CASE_REASSIGNMENT
            if reassigned
            else Notification.NotificationType.CASE_ASSIGNMENT
        )
        action = "reassigned" if reassigned else "assigned"
        event_key = f"{notification_type}:{case.id}:{recipient.id}:{role_label.upper()}"
        title = f"Case {action}: {case.case_number}"
        message = (
            f"You have been {action} as the {role_label} for case "
            f"{case.case_number} - {case.title}."
        )
        return NotificationService.create(
            firm=case.firm,
            recipient=recipient,
            actor=actor,
            case=case,
            notification_type=notification_type,
            title=title,
            message=message,
            action_url=f"/cases/{case.id}",
            event_key=event_key,
        )

    @staticmethod
    def notify_case_status_update(*, case, status, actor=None, note=""):
        recipient = getattr(case.client, "user", None)
        if recipient is None:
            return None

        status_label = getattr(case.Status(status), "label", status)
        message = f"Your case {case.case_number} - {case.title} status changed to {status_label}."
        if note:
            message = f"{message} Note: {note}"

        return NotificationService.create(
            firm=case.firm,
            recipient=recipient,
            actor=actor,
            case=case,
            notification_type=Notification.NotificationType.CASE_STATUS_UPDATE,
            title=f"Case status updated: {case.case_number}",
            message=message,
            action_url=f"/client/cases/{case.id}",
        )

    @staticmethod
    def mark_read(user, notification_id):
        notification = Notification.objects.get(id=notification_id, recipient=user)
        notification.mark_read()
        return notification

    @staticmethod
    def mark_all_read(user):
        return Notification.objects.filter(
            recipient=user,
            read_at__isnull=True,
        ).update(read_at=timezone.now())
