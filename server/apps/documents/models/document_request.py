import uuid

from django.conf import settings
from django.db import models

from apps.common.models.timestamped_model import TimestampedModel


class DocumentRequest(TimestampedModel):
    class Status(models.TextChoices):
        OPEN = "OPEN", "Required"
        UPLOADED = "UPLOADED", "Uploaded - awaiting review"
        ACCEPTED = "ACCEPTED", "Accepted"
        REPLACEMENT_REQUIRED = "REPLACEMENT_REQUIRED", "Replacement required"
        CANCELLED = "CANCELLED", "Cancelled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey("firm.LawFirm", on_delete=models.CASCADE, related_name="document_requests")
    client = models.ForeignKey("clients.Client", on_delete=models.CASCADE, related_name="document_requests")
    case = models.ForeignKey("cases.Case", on_delete=models.CASCADE, related_name="document_requests")
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="created_document_requests"
    )
    title = models.CharField(max_length=255)
    document_type = models.CharField(max_length=50)
    instructions = models.TextField(blank=True, default="")
    due_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.OPEN, db_index=True)
    fulfilled_document = models.ForeignKey(
        "clients.ClientDocument", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="fulfilled_requests"
    )
    fulfilled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="fulfilled_document_requests"
    )
    fulfilled_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "document_requests"
        ordering = ["status", "due_date", "-created_at"]
        indexes = [models.Index(fields=["case", "status"]), models.Index(fields=["client", "status"])]
