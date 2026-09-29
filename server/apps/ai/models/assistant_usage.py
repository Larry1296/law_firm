import uuid

from django.conf import settings
from django.db import models

from apps.common.models.timestamped_model import TimestampedModel


class AssistantUsage(TimestampedModel):
    """One question to a dashboard assistant: who asked, which assistant and how it was answered.

    Deliberately holds no question or answer text, so client and matter details
    are never copied out of the records they belong to.
    """

    class Audience(models.TextChoices):
        CLIENT = "CLIENT", "Client"
        ADVOCATE = "ADVOCATE", "Advocate"
        FIRM = "FIRM", "Firm owner"
        PLATFORM = "PLATFORM", "Platform administrator"

    class Outcome(models.TextChoices):
        ANSWERED = "ANSWERED", "Answered by the AI model"
        RECORDS_ONLY = "RECORDS_ONLY", "Answered from records (no AI service)"
        ERROR = "ERROR", "AI service failed; answered from records"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="assistant_usage")
    firm = models.ForeignKey("firm.LawFirm", null=True, blank=True, on_delete=models.CASCADE, related_name="assistant_usage")
    audience = models.CharField(max_length=20, choices=Audience.choices)
    outcome = models.CharField(max_length=20, choices=Outcome.choices)
    provider = models.CharField(max_length=40, blank=True, default="")
    model = models.CharField(max_length=120, blank=True, default="")
    matters_in_context = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ("-created_at",)
        indexes = [models.Index(fields=("firm", "audience", "created_at"))]
