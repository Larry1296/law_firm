from django.db import transaction
from django.utils import timezone

from apps.common.choices import UserRole
from apps.communications.choices import ChatThreadType
from apps.communications.utils.user_display import get_user_display_name
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
    def list_sent_by_user(user):
        return (
            Notification.objects.filter(actor=user)
            .select_related("firm", "recipient", "actor", "case")
            .order_by("-created_at")
        )

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
    def _chat_action_url(*, recipient, thread, message):
        case = getattr(thread, "case", None)
        role = getattr(recipient, "role", "")

        if thread.thread_type == ChatThreadType.CASE_CLIENT and case is not None:
            if role == UserRole.OFFICIAL_CLIENT:
                return f"/client/cases/{case.id}/communication?message={message.id}"
            if role == UserRole.ADMIN:
                return f"/admin/cases/{case.id}?thread={thread.id}&message={message.id}"
            if hasattr(recipient, "secretary_profile"):
                return f"/secretary/cases/{case.id}?thread={thread.id}&message={message.id}"
            if hasattr(recipient, "lawyer_profile"):
                return f"/lawyer/cases/{case.id}?thread={thread.id}&message={message.id}"

        if role == UserRole.ADMIN:
            return f"/admin/communication?thread={thread.id}&message={message.id}"
        if hasattr(recipient, "secretary_profile"):
            return f"/secretary/chat?thread={thread.id}&message={message.id}"
        if hasattr(recipient, "lawyer_profile"):
            return f"/lawyer/chat?thread={thread.id}&message={message.id}"
        if hasattr(recipient, "accountant_profile"):
            return f"/accountant/chat?thread={thread.id}&message={message.id}"
        if hasattr(recipient, "hr_profile"):
            return f"/hr/chat?thread={thread.id}&message={message.id}"
        if hasattr(recipient, "it_profile"):
            return f"/it/chat?thread={thread.id}&message={message.id}"
        if role == UserRole.OFFICIAL_CLIENT and case is not None:
            return f"/client/cases/{case.id}/communication?message={message.id}"
        return f"/notifications?thread={thread.id}&message={message.id}"

    @staticmethod
    def _chat_sender_label(*, recipient, message):
        sender = message.sender
        if sender is None:
            return "System"
        sender_id = getattr(sender, "id", None)
        if (
            getattr(recipient, "role", "") == UserRole.OFFICIAL_CLIENT
            and sender_id
            and sender_id != recipient.id
        ):
            return message.thread.firm.name
        return get_user_display_name(sender, firm=message.thread.firm)

    @staticmethod
    @transaction.atomic
    def notify_chat_message(*, message):
        if message.is_system_message or message.sender is None:
            return []

        thread = message.thread
        participants = thread.participants.select_related("user").exclude(
            user=message.sender,
        )
        recipients_by_id = {
            participant.user_id: participant.user
            for participant in participants
            if participant.user and participant.user.is_active
        }

        if (
            thread.thread_type == ChatThreadType.CASE_CLIENT
            and getattr(message.sender, "client_profile", None) is not None
            and thread.firm.owner_id
            and thread.firm.owner_id != message.sender_id
            and thread.firm.owner.is_active
        ):
            recipients_by_id[thread.firm.owner_id] = thread.firm.owner

        notifications = []
        for recipient in recipients_by_id.values():
            sender_label = NotificationService._chat_sender_label(
                recipient=recipient,
                message=message,
            )
            if thread.thread_type == ChatThreadType.CASE_CLIENT and getattr(message.sender, "client_profile", None):
                title = f"New client message: {thread.case.case_number if thread.case_id else thread.subject}"
                body = f"{sender_label} sent a new case message that needs attention."
            else:
                title = f"New chat message from {sender_label}"
                body = message.body[:180]
                if len(message.body) > 180:
                    body = f"{body}..."

            notification = NotificationService.create(
                firm=thread.firm,
                recipient=recipient,
                actor=message.sender,
                case=thread.case,
                notification_type=Notification.NotificationType.CHAT_MESSAGE,
                title=title,
                message=body,
                action_url=NotificationService._chat_action_url(
                    recipient=recipient,
                    thread=thread,
                    message=message,
                ),
                event_key=f"CHAT_MESSAGE:{thread.id}:{message.id}:{recipient.id}",
            )
            if notification is not None:
                notifications.append(notification)
        return notifications

    @staticmethod
    def mark_chat_thread_notifications_read(*, user, thread):
        return Notification.objects.filter(
            recipient=user,
            notification_type=Notification.NotificationType.CHAT_MESSAGE,
            event_key__startswith=f"CHAT_MESSAGE:{thread.id}:",
            read_at__isnull=True,
        ).update(read_at=timezone.now())

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
