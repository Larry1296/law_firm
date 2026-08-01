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
        KYC_DOCUMENT = "KYC_DOCUMENT", "KYC document"
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

    @property
    def full_reference(self):
        """Return the full custody reference for the linked document.

        This is what an advocate sees when working on a matter — e.g.
        ``KYC-2026-039/D2`` — and can immediately look up the document
        type, title and description from the same record.
        """
        if self.document_id:
            return self.document.full_reference
        return ""

    @property
    def document_identity(self):
        """A dict that tells the advocate exactly what this reference is.

        Example return value::

            {
                "reference": "KYC-2026-039/D2",
                "kyc_folder": "KYC-2026-039",
                "document_index": 2,
                "title": "KRA PIN Certificate – Mutiso",
                "document_type": "KRA_PIN",
                "document_type_label": "KRA PIN Certificate",
                "description": "...",
                "physical_storage_location": "Cabinet B, Drawer 3",
                "physical_copy_retained": True,
            }
        """
        doc = self.document
        if doc is None:
            return {}
        return {
            "reference": doc.full_reference,
            "kyc_folder": doc.kyc_folder.reference if doc.kyc_folder_id else None,
            "document_index": doc.document_index,
            "title": doc.title,
            "document_type": doc.document_type,
            "document_type_label": doc.get_document_type_display(),
            "description": doc.description,
            "physical_storage_location": doc.physical_storage_location,
            "physical_copy_retained": doc.physical_copy_retained,
            "review_status": doc.review_status,
        }
