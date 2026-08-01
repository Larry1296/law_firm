import uuid

from django.db import models

from apps.common.models.timestamped_model import TimestampedModel
from .client import Client


class DocumentType(models.TextChoices):
    IDENTIFICATION = "IDENTIFICATION", "Identification Document"
    REGISTRATION = "REGISTRATION", "Registration Document"
    CONTRACT = "CONTRACT", "Contract"
    COURT_ORDER = "COURT_ORDER", "Court Order"
    EVIDENCE = "EVIDENCE", "Evidence"
    TAX = "TAX", "Tax Document"
    FINANCIAL = "FINANCIAL", "Financial Document"
    LEGAL = "LEGAL", "Legal Document"
    OTHER = "OTHER", "Other"


class ClientDocument(TimestampedModel):

    class ReviewStatus(models.TextChoices):
        PENDING = "PENDING", "Pending review"
        ACCEPTED = "ACCEPTED", "Accepted"
        NEEDS_REPLACEMENT = "NEEDS_REPLACEMENT", "Replacement required"

    class SourceCopyType(models.TextChoices):
        ORIGINAL_INSPECTED = "ORIGINAL_INSPECTED", "Original inspected and scanned"
        CERTIFIED_COPY = "CERTIFIED_COPY", "Certified copy scanned"
        CLIENT_COPY = "CLIENT_COPY", "Client-supplied copy"
        OFFICIAL_ELECTRONIC = "OFFICIAL_ELECTRONIC", "Official electronic record"

    class ReceivedVia(models.TextChoices):
        CLIENT_PORTAL = "CLIENT_PORTAL", "Client portal"
        IN_PERSON = "IN_PERSON", "Delivered in person"
        EMAIL = "EMAIL", "Email"
        WHATSAPP = "WHATSAPP", "WhatsApp"
        COURIER = "COURIER", "Courier"
        OTHER = "OTHER", "Other"

    client = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        related_name="documents",
    )

    document_type = models.CharField(
        max_length=50,
        choices=DocumentType.choices,
    )

    title = models.CharField(
        max_length=255,
    )

    description = models.TextField(
        blank=True,
    )

    file = models.FileField(
        upload_to="client_documents/",
    )

    file_name = models.CharField(
        max_length=255,
        blank=True,
    )

    mime_type = models.CharField(
        max_length=100,
        blank=True,
    )

    reference = models.CharField(max_length=40, unique=True, blank=True, db_index=True)

    review_status = models.CharField(
        max_length=30,
        choices=ReviewStatus.choices,
        default=ReviewStatus.PENDING,
    )

    review_notes = models.TextField(blank=True, default="")

    source_reference = models.CharField(max_length=255, blank=True, default="")
    source_copy_type = models.CharField(
        max_length=30, choices=SourceCopyType.choices, default=SourceCopyType.CLIENT_COPY
    )
    physical_copy_retained = models.BooleanField(default=False)
    physical_storage_location = models.CharField(max_length=255, blank=True, default="")
    custody_notes = models.TextField(blank=True, default="")
    received_via = models.CharField(
        max_length=30, choices=ReceivedVia.choices, default=ReceivedVia.CLIENT_PORTAL
    )

    uploaded_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="uploaded_client_documents",
    )

    is_verified = models.BooleanField(
        default=False,
    )

    is_confidential = models.BooleanField(
        default=True,
    )

    class Meta:
        db_table = "client_documents"
        verbose_name = "Client Document"
        verbose_name_plural = "Client Documents"
        indexes = [
            models.Index(fields=["client", "document_type"]),
        ]

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.file_name and self.file:
            self.file_name = self.file.name.rsplit("/", 1)[-1]
        if not self.reference:
            self.reference = f"DOC-{uuid.uuid4().hex[:10].upper()}"
        super().save(*args, **kwargs)
