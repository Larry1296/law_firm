import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.common.models.timestamped_model import TimestampedModel


class Notification(TimestampedModel):
    class NotificationType(models.TextChoices):
        CASE_ASSIGNMENT = "CASE_ASSIGNMENT", "Case Assignment"
        CASE_REASSIGNMENT = "CASE_REASSIGNMENT", "Case Reassignment"
        CASE_STATUS_UPDATE = "CASE_STATUS_UPDATE", "Case Status Update"
        CASE_EVENT = "CASE_EVENT", "Case Event"
        COURTROOM_LINK = "COURTROOM_LINK", "Courtroom Link"
        CHAT_MESSAGE = "CHAT_MESSAGE", "Chat Message"
        GENERAL = "GENERAL", "General"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey(
        "firm.LawFirm",
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sent_notifications",
    )
    case = models.ForeignKey(
        "cases.Case",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="notifications",
    )
    notification_type = models.CharField(
        max_length=40,
        choices=NotificationType.choices,
        default=NotificationType.GENERAL,
    )
    title = models.CharField(max_length=160)
    message = models.TextField()
    action_url = models.CharField(max_length=255, blank=True, default="")
    event_key = models.CharField(max_length=160, blank=True, default="")
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["recipient", "read_at", "-created_at"]),
            models.Index(fields=["firm", "notification_type", "-created_at"]),
            models.Index(fields=["case", "notification_type"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["recipient", "event_key"],
                condition=~models.Q(event_key=""),
                name="unique_notification_event_per_recipient",
            )
        ]

    @property
    def is_read(self):
        return self.read_at is not None

    def mark_read(self):
        if not self.read_at:
            self.read_at = timezone.now()
            self.save(update_fields=["read_at", "updated_at"])
        return self
