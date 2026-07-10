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