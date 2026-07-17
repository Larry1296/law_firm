import uuid

from django.db import models

from apps.common.models.timestamped_model import TimestampedModel


class CaseLifecycleTransition(TimestampedModel):
    class Dimension(models.TextChoices):
        MATTER_STATUS = "MATTER_STATUS", "Matter status"
        COURT_STAGE = "COURT_STAGE", "Court stage"
        OUTCOME_STATUS = "OUTCOME_STATUS", "Outcome status"
        ENFORCEMENT_STATUS = "ENFORCEMENT_STATUS", "Enforcement status"
        APPEAL_STATUS = "APPEAL_STATUS", "Appeal or review status"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case = models.ForeignKey(
        "cases.Case",
        on_delete=models.CASCADE,
        related_name="lifecycle_transitions",
    )
    dimension = models.CharField(max_length=40, choices=Dimension.choices)
    from_state = models.CharField(max_length=60, blank=True, default="")
    to_state = models.CharField(max_length=60)
    effective_at = models.DateTimeField()
    recorded_at = models.DateTimeField(auto_now_add=True)
    actor = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="case_lifecycle_transitions",
    )
    reason = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)
    source_event = models.ForeignKey(
        "cases.CaseEvent",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="source_lifecycle_transitions",
    )
    correction_of = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="corrections",
    )
    is_correction = models.BooleanField(default=False)

    class Meta:
        db_table = "case_lifecycle_transitions"
        ordering = ["effective_at", "recorded_at"]
        indexes = [
            models.Index(fields=["case", "dimension", "effective_at"]),
            models.Index(fields=["dimension", "to_state"]),
        ]

    def __str__(self):
        return f"{self.case.case_number} {self.dimension}: {self.from_state} -> {self.to_state}"
