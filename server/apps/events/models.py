import uuid

from django.db import models

from apps.common.models.timestamped_model import TimestampedModel


class EventClientAwareness(TimestampedModel):
    class AwarenessStatus(models.TextChoices):
        NOT_NOTIFIED = "NOT_NOTIFIED", "Not Notified"
        NOTIFIED = "NOTIFIED", "Notified"
        CONFIRMED = "CONFIRMED", "Confirmed"
        UNREACHABLE = "UNREACHABLE", "Unreachable"
        DECLINED = "DECLINED", "Declined"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event = models.OneToOneField(
        "cases.CaseEvent",
        on_delete=models.CASCADE,
        related_name="client_awareness",
    )
    client = models.ForeignKey(
        "clients.Client",
        on_delete=models.CASCADE,
        related_name="event_awareness_records",
    )
    status = models.CharField(
        max_length=30,
        choices=AwarenessStatus.choices,
        default=AwarenessStatus.NOT_NOTIFIED,
    )
    notified_at = models.DateTimeField(null=True, blank=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)
    confirmation_channel = models.CharField(max_length=50, blank=True, default="")
    notes = models.TextField(blank=True, default="")
    updated_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="updated_event_awareness_records",
    )

    class Meta:
        db_table = "event_client_awareness"
        ordering = ["event__starts_at"]
        indexes = [
            models.Index(fields=["client", "status"]),
            models.Index(fields=["status", "notified_at"]),
        ]

    def __str__(self):
        return f"{self.event} - {self.status}"
