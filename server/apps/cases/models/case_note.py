import uuid

from django.db import models

from apps.common.models.timestamped_model import TimestampedModel


class CaseNote(TimestampedModel):
    class NoteType(models.TextChoices):
        INTERNAL = "INTERNAL", "Internal Note"
        CLIENT_UPDATE = "CLIENT_UPDATE", "Client Update"
        COURT_ATTENDANCE = "COURT_ATTENDANCE", "Court Attendance Note"
        REGISTRY = "REGISTRY", "Registry Note"
        STRATEGY = "STRATEGY", "Strategy Note"
        BILLING = "BILLING", "Billing Note"
        OTHER = "OTHER", "Other"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case = models.ForeignKey("cases.Case", on_delete=models.CASCADE, related_name="notes")
    note_type = models.CharField(max_length=30, choices=NoteType.choices, default=NoteType.INTERNAL)
    title = models.CharField(max_length=255, blank=True, default="")
    body = models.TextField()
    is_client_visible = models.BooleanField(default=False)
    created_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="case_notes",
    )

    class Meta:
        db_table = "case_notes"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["case", "note_type"]),
            models.Index(fields=["is_client_visible"]),
        ]

    def __str__(self):
        return self.title or f"{self.case.case_number} note"
