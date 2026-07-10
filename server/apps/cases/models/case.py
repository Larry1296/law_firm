import uuid

from django.db import models

from apps.common.models.timestamped_model import TimestampedModel


class Case(TimestampedModel):
    class CaseType(models.TextChoices):
        CIVIL = "CIVIL", "Civil"
        CRIMINAL = "CRIMINAL", "Criminal"
        FAMILY = "FAMILY", "Family"
        LAND = "LAND", "Land"
        EMPLOYMENT = "EMPLOYMENT", "Employment"
        COMMERCIAL = "COMMERCIAL", "Commercial"
        SUCCESSION = "SUCCESSION", "Succession"
        CONSTITUTIONAL = "CONSTITUTIONAL", "Constitutional"
        TAX = "TAX", "Tax"
        IMMIGRATION = "IMMIGRATION", "Immigration"

    class CourtType(models.TextChoices):
        MAGISTRATE = "MAGISTRATE", "Magistrate Court"
        HIGH_COURT = "HIGH_COURT", "High Court"
        COURT_OF_APPEAL = "COURT_OF_APPEAL", "Court of Appeal"
        SUPREME_COURT = "SUPREME_COURT", "Supreme Court"
        ENVIRONMENT_LAND = "ENVIRONMENT_LAND", "Environment and Land Court"
        EMPLOYMENT_LABOUR = "EMPLOYMENT_LABOUR", "Employment and Labour Court"
        SMALL_CLAIMS = "SMALL_CLAIMS", "Small Claims Court"
        KADHI = "KADHI", "Kadhi Court"
        TRIBUNAL = "TRIBUNAL", "Tribunal"
        OTHER = "OTHER", "Other"

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        IN_PROGRESS = "IN_PROGRESS", "In Progress"
        ON_HOLD = "ON_HOLD", "On Hold"
        CLOSED = "CLOSED", "Closed"
        DISMISSED = "DISMISSED", "Dismissed"
        JUDGMENT_DELIVERED = "JUDGMENT_DELIVERED", "Judgment Delivered"
        ARCHIVED = "ARCHIVED", "Archived"

    class Priority(models.TextChoices):
        LOW = "LOW", "Low"
        MEDIUM = "MEDIUM", "Medium"
        HIGH = "HIGH", "High"
        URGENT = "URGENT", "Urgent"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey("firm.LawFirm", on_delete=models.CASCADE, related_name="cases")
    client = models.ForeignKey("clients.Client", on_delete=models.PROTECT, related_name="cases")
    created_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_cases",
    )

    case_number = models.CharField(max_length=60)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    case_type = models.CharField(max_length=40, choices=CaseType.choices)
    status = models.CharField(max_length=40, choices=Status.choices, default=Status.PENDING)
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.MEDIUM)

    court_type = models.CharField(max_length=40, choices=CourtType.choices)
    court_name = models.CharField(max_length=255, blank=True, default="")
    court_location = models.CharField(max_length=255, blank=True, default="")
    filing_date = models.DateField(null=True, blank=True)

    plaintiff = models.CharField(max_length=255, blank=True, default="")
    defendant = models.CharField(max_length=255, blank=True, default="")

    assigned_lawyer = models.ForeignKey(
        "staff.Lawyer",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_cases",
    )
    assigned_secretary = models.ForeignKey(
        "staff.Secretary",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_cases",
    )

    is_active = models.BooleanField(default=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "cases"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["firm", "case_number"],
                name="unique_case_number_per_firm",
            )
        ]
        indexes = [
            models.Index(fields=["firm", "status"]),
            models.Index(fields=["firm", "priority"]),
            models.Index(fields=["firm", "case_type"]),
            models.Index(fields=["client"]),
            models.Index(fields=["assigned_lawyer"]),
            models.Index(fields=["assigned_secretary"]),
        ]

    def __str__(self):
        return f"{self.case_number} - {self.title}"
