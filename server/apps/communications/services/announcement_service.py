from django.core.exceptions import PermissionDenied
from django.db import transaction
from django.utils import timezone

from apps.common.choices import FirmRole, UserRole
from apps.communications.choices import AnnouncementAudience
from apps.communications.models import Announcement, AnnouncementRecipient
from apps.communications.services.chat_service import CommunicationAccessService
from apps.users.models import User


class AnnouncementService:
    @staticmethod
    def _staff_recipients_queryset(firm):
        return User.objects.filter(
            firm_memberships__firm=firm,
            firm_memberships__is_active=True,
            firm_memberships__role__in=FirmRole.staff_roles(),
            is_active=True,
        ).distinct()

    @staticmethod
    @transaction.atomic
    def create_announcement(*, user, validated_data):
        if user.role != UserRole.ADMIN:
            raise PermissionDenied("Only admins can create announcements.")

        firm = CommunicationAccessService.get_user_firm(user)
        target_user_ids = validated_data.pop("target_user_ids", []) or []
        audience_type = validated_data.get("audience_type", AnnouncementAudience.ALL_STAFF)

        if audience_type == AnnouncementAudience.ALL_STAFF:
            recipients = list(AnnouncementService._staff_recipients_queryset(firm))
        else:
            recipients = list(
                AnnouncementService._staff_recipients_queryset(firm).filter(
                    id__in=target_user_ids,
                )
            )
            if not recipients:
                raise ValueError("Targeted announcements require at least one valid staff recipient.")
            if len(recipients) != len(set(target_user_ids)):
                raise ValueError("One or more target users are not active staff members in this firm.")

        announcement = Announcement.objects.create(
            firm=firm,
            created_by=user,
            **validated_data,
        )

        AnnouncementRecipient.objects.bulk_create(
            [
                AnnouncementRecipient(
                    announcement=announcement,
                    recipient_user=recipient,
                )
                for recipient in recipients
            ],
            ignore_conflicts=True,
        )

        return announcement

    @staticmethod
    def list_admin_announcements(user):
        if user.role != UserRole.ADMIN:
            raise PermissionDenied("Only admins can view admin announcements.")

        firm = CommunicationAccessService.get_user_firm(user)
        return (
            Announcement.objects.filter(firm=firm)
            .select_related("firm", "created_by")
            .prefetch_related("recipients", "recipients__recipient_user")
        )

    @staticmethod
    def get_admin_announcement(user, announcement_id):
        return AnnouncementService.list_admin_announcements(user).get(id=announcement_id)

    @staticmethod
    def list_user_announcements(user):
        return (
            AnnouncementRecipient.objects.filter(
                recipient_user=user,
                announcement__is_active=True,
            )
            .select_related("announcement", "announcement__firm", "announcement__created_by")
            .order_by("-announcement__created_at")
        )

    @staticmethod
    @transaction.atomic
    def mark_read(user, announcement_id):
        recipient = AnnouncementService.list_user_announcements(user).get(
            announcement_id=announcement_id,
        )
        if recipient.read_at is None:
            recipient.read_at = timezone.now()
            recipient.save(update_fields=["read_at", "updated_at"])
        return recipient