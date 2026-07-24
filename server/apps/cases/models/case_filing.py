import uuid

from django.db import models

from apps.common.models.timestamped_model import TimestampedModel


class CaseFiling(TimestampedModel):
    class FilingType(models.TextChoices):
        PLAINT = "PLAINT", "Plaint"
        DEFENCE = "DEFENCE", "Defence"
        PETITION = "PETITION", "Petition"
        NOTICE_OF_MOTION = "NOTICE_OF_MOTION", "Notice of Motion"
        CHAMBER_SUMMONS = "CHAMBER_SUMMONS", "Chamber Summons"
        APPLICATION = "APPLICATION", "Application"
        AFFIDAVIT = "AFFIDAVIT", "Affidavit"
        REPLYING_AFFIDAVIT = "REPLYING_AFFIDAVIT", "Replying Affidavit"
        FURTHER_AFFIDAVIT = "FURTHER_AFFIDAVIT", "Further Affidavit"
        WITNESS_STATEMENT = "WITNESS_STATEMENT", "Witness Statement"
        LIST_OF_DOCUMENTS = "LIST_OF_DOCUMENTS", "List of Documents"
        SUBMISSIONS = "SUBMISSIONS", "Submissions"
        MEMORANDUM_OF_APPEAL = "MEMORANDUM_OF_APPEAL", "Memorandum of Appeal"
        RECORD_OF_APPEAL = "RECORD_OF_APPEAL", "Record of Appeal"
        NOTICE_OF_APPEAL = "NOTICE_OF_APPEAL", "Notice of Appeal"
        DEMAND_LETTER = "DEMAND_LETTER", "Demand Letter"
        CONSENT = "CONSENT", "Consent"
        ORDER = "ORDER", "Court Order"
        DECREE = "DECREE", "Decree"
        RULING = "RULING", "Ruling"
        JUDGMENT = "JUDGMENT", "Judgment"
        AFFIDAVIT_OF_SERVICE = "AFFIDAVIT_OF_SERVICE", "Affidavit of Service"
        ORIGINATING_CLAIM = "ORIGINATING_CLAIM", "Originating claim"
        OTHER = "OTHER", "Other"

    class FilingStatus(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        READY_FOR_FILING = "READY_FOR_FILING", "Ready for Filing"
        FILED = "FILED", "Filed"
        SERVED = "SERVED", "Served"
        REJECTED = "REJECTED", "Rejected"
        WITHDRAWN = "WITHDRAWN", "Withdrawn"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case = models.ForeignKey("cases.Case", on_delete=models.CASCADE, related_name="filings")
    filing_type = models.CharField(max_length=60, choices=FilingType.choices)
    status = models.CharField(max_length=30, choices=FilingStatus.choices, default=FilingStatus.DRAFT)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    filed_at = models.DateTimeField(null=True, blank=True)
    served_at = models.DateTimeField(null=True, blank=True)
    official_court_case_number = models.CharField(max_length=120, blank=True, default="")
    efiling_reference = models.CharField(max_length=120, blank=True, default="")
    assessment_reference = models.CharField(max_length=120, blank=True, default="")
    court_fee_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    payment_reference = models.CharField(max_length=120, blank=True, default="")
    payment_date = models.DateField(null=True, blank=True)
    receipt_number = models.CharField(max_length=120, blank=True, default="")
    source = models.CharField(max_length=120, blank=True, default="")
    filed_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="case_filings",
    )
    is_client_visible = models.BooleanField(default=True)

    class Meta:
        db_table = "case_filings"
        ordering = ["-filed_at", "-created_at"]
        indexes = [
            models.Index(fields=["case", "filing_type"]),
            models.Index(fields=["status"]),
            models.Index(fields=["efiling_reference"]),
            models.Index(fields=["is_client_visible"]),
        ]

    def __str__(self):
        return f"{self.case.case_number} - {self.title}"
