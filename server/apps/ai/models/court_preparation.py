import uuid

from django.db import models

from apps.common.models.timestamped_model import TimestampedModel


class CourtPreparationBrief(TimestampedModel):
    """Preparation guidance for one upcoming court date, written for one audience.

    A new version is stored whenever the matter's records change, so what an
    advocate or client was shown on a given day can always be reconstructed.
    """

    class Audience(models.TextChoices):
        ADVOCATE = "ADVOCATE", "Advocate"
        CLIENT = "CLIENT", "Client"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event = models.ForeignKey("cases.CaseEvent", on_delete=models.CASCADE, related_name="preparation_briefs")
    case = models.ForeignKey("cases.Case", on_delete=models.CASCADE, related_name="preparation_briefs")
    audience = models.CharField(max_length=20, choices=Audience.choices)
    version = models.PositiveIntegerField(default=1)
    readiness = models.PositiveSmallIntegerField(default=0)
    checks = models.JSONField(default=list, blank=True)
    guidance = models.JSONField(default=dict, blank=True)
    tailored = models.JSONField(default=dict, blank=True)
    provider = models.CharField(max_length=40, default="structured")
    model = models.CharField(max_length=120, blank=True, default="")
    prompt_version = models.CharField(max_length=40, default="court-preparation-v1")
    source_state_at = models.DateTimeField()
    generated_at = models.DateTimeField()
    is_current = models.BooleanField(default=True)

    class Meta:
        db_table = "ai_court_preparation_briefs"
        ordering = ["-generated_at"]
        constraints = [
            models.UniqueConstraint(fields=["event", "audience", "version"], name="unique_court_preparation_brief_version"),
        ]
        indexes = [models.Index(fields=["event", "audience", "is_current"])]
