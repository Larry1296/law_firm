import uuid

from django.db import models

from apps.common.models.timestamped_model import TimestampedModel


class CaseCourtroom(TimestampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case = models.ForeignKey("cases.Case", on_delete=models.CASCADE, related_name="courtroom_history")
    court_station = models.CharField(max_length=255)
    registry = models.CharField(max_length=255, blank=True, default="")
    courtroom = models.CharField(max_length=100, blank=True, default="")
    judicial_officer = models.CharField(max_length=255, blank=True, default="")
    effective_from = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True, default="")
    created_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="case_courtroom_entries",
    )

    class Meta:
        db_table = "case_courtrooms"
        ordering = ["-effective_from", "-created_at"]
        indexes = [
            models.Index(fields=["case", "court_station"]),
            models.Index(fields=["judicial_officer"]),
        ]

    def __str__(self):
        return f"{self.case.case_number} - {self.court_station}"
