import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from apps.common.models.timestamped_model import TimestampedModel


class MatterDocumentReference(TimestampedModel):
    class Purpose(models.TextChoices):
        CLIENT_INSTRUCTION = "CLIENT_INSTRUCTION", "Client instruction"
        EVIDENCE = "EVIDENCE", "Evidence"
        CORRESPONDENCE = "CORRESPONDENCE", "Correspondence"
        DEMAND_LETTER = "DEMAND_LETTER", "Demand letter"
        PLEADING = "PLEADING", "Pleading"
        COURT_DOCUMENT = "COURT_DOCUMENT", "Court document"
        OTHER = "OTHER", "Other"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case = models.ForeignKey("cases.Case", on_delete=models.CASCADE, related_name="document_references")
    document = models.ForeignKey(
        "clients.ClientDocument", on_delete=models.CASCADE, related_name="matter_references"
    )
    purpose = models.CharField(max_length=40, choices=Purpose.choices, default=Purpose.OTHER)
    notes = models.TextField(blank=True, default="")
    referenced_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="matter_document_references"
    )

    class Meta:
        db_table = "matter_document_references"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["case", "document"], name="unique_document_reference_per_matter")
        ]

    def clean(self):
        if self.case_id and self.document_id and self.case.client_id != self.document.client_id:
            raise ValidationError("A matter may only reference documents belonging to its client.")
