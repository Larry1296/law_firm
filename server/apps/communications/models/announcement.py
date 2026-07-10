import uuid

from django.db import models

from apps.common.models.timestamped_model import TimestampedModel
from apps.communications.choices import AnnouncementAudience


class Announcement(TimestampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey(
        "firm.LawFirm",
        on_delete=models.CASCADE,
        related_name="announcements",
    )
    created_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_announcements",
    )
    title = models.CharField(max_length=255)
    body = models.TextField()
    audience_type = models.CharField(
        max_length=30,
        choices=AnnouncementAudience.choices,
        default=AnnouncementAudience.ALL_STAFF,
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "communication_announcements"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["firm", "audience_type"]),
            models.Index(fields=["firm", "is_active"]),
        ]

    def __str__(self):
        return self.title


class AnnouncementRecipient(TimestampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    announcement = models.ForeignKey(
        Announcement,
        on_delete=models.CASCADE,
        related_name="recipients",
    )
    recipient_user = models.ForeignKey(
        "users.User",
        on_delete=models.CASCADE,
        related_name="announcement_recipients",
    )
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "communication_announcement_recipients"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["announcement", "recipient_user"],
                name="unique_announcement_recipient",
            ),
        ]
        indexes = [
            models.Index(fields=["recipient_user", "read_at"]),
        ]

    def __str__(self):
        return f"{self.announcement} -> {self.recipient_user}"