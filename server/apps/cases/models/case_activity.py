import uuid

from django.db import models

from apps.common.models.timestamped_model import TimestampedModel


class CaseActivity(TimestampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case = models.ForeignKey("cases.Case", on_delete=models.CASCADE, related_name="activities")
    action = models.CharField(max_length=120)
    description = models.TextField(blank=True, default="")
    metadata = models.JSONField(default=dict, blank=True)
    actor = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="case_activities",
    )

    class Meta:
        db_table = "case_activities"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.case.case_number} - {self.action}"
