import uuid

from django.db import models

from apps.common.choices import CaseStatus
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
        JUDICIAL_REVIEW = "JUDICIAL_REVIEW", "Judicial Review"
        ELECTION_PETITION = "ELECTION_PETITION", "Election Petition"
        TRIBUNAL = "TRIBUNAL", "Tribunal"
        ARBITRATION = "ARBITRATION", "Arbitration"
        MEDIATION = "MEDIATION", "Mediation"
        CONVEYANCING = "CONVEYANCING", "Conveyancing"
        DEBT_RECOVERY = "DEBT_RECOVERY", "Debt Recovery"
        TRAFFIC = "TRAFFIC", "Traffic"
        CHILDREN = "CHILDREN", "Children Matter"
        SMALL_CLAIM = "SMALL_CLAIM", "Small Claim"

    class ProcedureTrack(models.TextChoices):
        CIVIL_SUIT = "CIVIL_SUIT", "Civil Suit"
        MISC_APPLICATION = "MISC_APPLICATION", "Miscellaneous Application"
        PETITION = "PETITION", "Petition"
        JUDICIAL_REVIEW = "JUDICIAL_REVIEW", "Judicial Review"
        APPEAL = "APPEAL", "Appeal"
        CRIMINAL_TRIAL = "CRIMINAL_TRIAL", "Criminal Trial"
        CRIMINAL_APPEAL = "CRIMINAL_APPEAL", "Criminal Appeal"
        SUCCESSION_CAUSE = "SUCCESSION_CAUSE", "Succession Cause"
        FAMILY_CAUSE = "FAMILY_CAUSE", "Family Cause"
        CHILDREN_MATTER = "CHILDREN_MATTER", "Children Matter"
        EMPLOYMENT_CLAIM = "EMPLOYMENT_CLAIM", "Employment Claim"
        ELC_SUIT = "ELC_SUIT", "Environment and Land Suit"
        SMALL_CLAIM = "SMALL_CLAIM", "Small Claim"
        TRIBUNAL_MATTER = "TRIBUNAL_MATTER", "Tribunal Matter"
        ADR = "ADR", "Alternative Dispute Resolution"
        NON_CONTENTIOUS = "NON_CONTENTIOUS", "Non-Contentious Matter"

    class CourtType(models.TextChoices):
        MAGISTRATE = "MAGISTRATE", "Magistrate Court"
        HIGH_COURT = "HIGH_COURT", "High Court"
        COURT_OF_APPEAL = "COURT_OF_APPEAL", "Court of Appeal"
        SUPREME_COURT = "SUPREME_COURT", "Supreme Court"
        ENVIRONMENT_LAND = "ENVIRONMENT_LAND", "Environment and Land Court"
        EMPLOYMENT_LABOUR = "EMPLOYMENT_LABOUR", "Employment and Labour Court"
        SMALL_CLAIMS = "SMALL_CLAIMS", "Small Claims Court"
        KADHI = "KADHI", "Kadhi Court"
        COURT_MARTIAL = "COURT_MARTIAL", "Court Martial"
        TRIBUNAL = "TRIBUNAL", "Tribunal"
        ADR = "ADR", "Alternative Dispute Resolution"
        OTHER = "OTHER", "Other"

    class CourtDivision(models.TextChoices):
        CIVIL = "CIVIL", "Civil Division"
        CRIMINAL = "CRIMINAL", "Criminal Division"
        COMMERCIAL_TAX = "COMMERCIAL_TAX", "Commercial and Tax Division"
        CONSTITUTIONAL_HUMAN_RIGHTS = "CONSTITUTIONAL_HUMAN_RIGHTS", "Constitutional and Human Rights Division"
        FAMILY = "FAMILY", "Family Division"
        JUDICIAL_REVIEW = "JUDICIAL_REVIEW", "Judicial Review Division"
        ANTI_CORRUPTION_ECONOMIC_CRIMES = "ANTI_CORRUPTION_ECONOMIC_CRIMES", "Anti-Corruption and Economic Crimes Division"
        ELC = "ELC", "Environment and Land Court"
        ELRC = "ELRC", "Employment and Labour Relations Court"
        SMALL_CLAIMS = "SMALL_CLAIMS", "Small Claims Court"
        KADHI = "KADHI", "Kadhi Court"
        TRIBUNAL = "TRIBUNAL", "Tribunal"
        APPELLATE = "APPELLATE", "Appellate"
        GENERAL = "GENERAL", "General Registry"
        OTHER = "OTHER", "Other"

    Status = CaseStatus

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
    procedure_track = models.CharField(
        max_length=60,
        choices=ProcedureTrack.choices,
        blank=True,
        default="",
    )
    status = models.CharField(max_length=40, choices=Status.choices, default=Status.PENDING)
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.MEDIUM)

    court_type = models.CharField(max_length=40, choices=CourtType.choices)
    court_division = models.CharField(
        max_length=60,
        choices=CourtDivision.choices,
        blank=True,
        default="",
    )
    court_name = models.CharField(max_length=255, blank=True, default="")
    court_station = models.CharField(max_length=255, blank=True, default="")
    registry = models.CharField(max_length=255, blank=True, default="")
    courtroom = models.CharField(max_length=100, blank=True, default="")
    judicial_officer = models.CharField(max_length=255, blank=True, default="")
    court_location = models.CharField(max_length=255, blank=True, default="")
    efiling_reference = models.CharField(max_length=120, blank=True, default="")
    cts_reference = models.CharField(max_length=120, blank=True, default="")
    payment_reference = models.CharField(max_length=120, blank=True, default="")
    filing_date = models.DateField(null=True, blank=True)
    next_court_date = models.DateTimeField(null=True, blank=True)
    next_action = models.CharField(max_length=255, blank=True, default="")

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
            models.Index(fields=["firm", "procedure_track"]),
            models.Index(fields=["firm", "court_type"]),
            models.Index(fields=["firm", "next_court_date"]),
            models.Index(fields=["client"]),
            models.Index(fields=["assigned_lawyer"]),
            models.Index(fields=["assigned_secretary"]),
        ]

    def __str__(self):
        return f"{self.case_number} - {self.title}"
