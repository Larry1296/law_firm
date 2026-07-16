import uuid

from django.db import models

from apps.common.models.timestamped_model import TimestampedModel


class CaseAttachment(TimestampedModel):
    class AttachmentType(models.TextChoices):
        PLEADING = "PLEADING", "Pleading"
        AFFIDAVIT = "AFFIDAVIT", "Affidavit"
        EVIDENCE = "EVIDENCE", "Evidence"
        CORRESPONDENCE = "CORRESPONDENCE", "Correspondence"
        COURT_ORDER = "COURT_ORDER", "Court Order"
        RULING = "RULING", "Ruling"
        JUDGMENT = "JUDGMENT", "Judgment"
        DECREE = "DECREE", "Decree"
        RECEIPT = "RECEIPT", "Receipt"
        AUTHORITY_TO_ACT = "AUTHORITY_TO_ACT", "Authority to Act"
        CLIENT_IDENTIFICATION = "CLIENT_IDENTIFICATION", "Client Identification"
        OTHER = "OTHER", "Other"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case = models.ForeignKey("cases.Case", on_delete=models.CASCADE, related_name="attachments")
    filing = models.ForeignKey(
        "cases.CaseFiling",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="attachments",
    )
    attachment_type = models.CharField(max_length=40, choices=AttachmentType.choices, default=AttachmentType.OTHER)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    file = models.FileField(upload_to="case_attachments/")
    file_name = models.CharField(max_length=255, blank=True, default="")
    mime_type = models.CharField(max_length=100, blank=True, default="")
    uploaded_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="uploaded_case_attachments",
    )
    is_client_visible = models.BooleanField(default=False)
    is_confidential = models.BooleanField(default=True)

    class Meta:
        db_table = "case_attachments"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["case", "attachment_type"]),
            models.Index(fields=["filing"]),
            models.Index(fields=["is_client_visible"]),
        ]

    def __str__(self):
        return self.title
