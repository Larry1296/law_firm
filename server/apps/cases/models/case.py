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
        COMMERCIAL_PETITION = "COMMERCIAL_PETITION", "Commercial Petition"
        CONSTITUTIONAL_PETITION = "CONSTITUTIONAL_PETITION", "Constitutional Petition"
        MISC_APPLICATION = "MISC_APPLICATION", "Miscellaneous Application"
        PETITION = "PETITION", "Petition"
        JUDICIAL_REVIEW = "JUDICIAL_REVIEW", "Judicial Review"
        APPEAL = "APPEAL", "Appeal"
        CRIMINAL_CASE = "CRIMINAL_CASE", "Criminal Case"
        CRIMINAL_TRIAL = "CRIMINAL_TRIAL", "Criminal Trial"
        CRIMINAL_APPEAL = "CRIMINAL_APPEAL", "Criminal Appeal"
        SUCCESSION_CAUSE = "SUCCESSION_CAUSE", "Succession Cause"
        FAMILY_CAUSE = "FAMILY_CAUSE", "Family Cause"
        CHILDREN_MATTER = "CHILDREN_MATTER", "Children Matter"
        EMPLOYMENT_CLAIM = "EMPLOYMENT_CLAIM", "Employment Claim"
        ELC_SUIT = "ELC_SUIT", "Environment and Land Suit"
        SMALL_CLAIM = "SMALL_CLAIM", "Small Claim"
        TRIBUNAL_MATTER = "TRIBUNAL_MATTER", "Tribunal Matter"
        ARBITRATION = "ARBITRATION", "Arbitration"
        MEDIATION = "MEDIATION", "Mediation"
        ADR = "ADR", "Alternative Dispute Resolution"
        NON_CONTENTIOUS = "NON_CONTENTIOUS", "Non-Contentious Matter"

    class MatterStatus(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        INSTRUCTIONS_RECEIVED = "INSTRUCTIONS_RECEIVED", "Instructions received"
        CONFLICT_CHECK_PENDING = "CONFLICT_CHECK_PENDING", "Conflict check pending"
        CONFLICT_CLEARED = "CONFLICT_CLEARED", "Conflict cleared"
        CONFLICT_IDENTIFIED = "CONFLICT_IDENTIFIED", "Conflict identified"
        ENGAGEMENT_PENDING = "ENGAGEMENT_PENDING", "Engagement pending"
        ENGAGEMENT_CONFIRMED = "ENGAGEMENT_CONFIRMED", "Engagement confirmed"
        MATTER_OPEN = "MATTER_OPEN", "Matter open"
        ON_HOLD = "ON_HOLD", "On hold"
        SETTLEMENT_IN_PROGRESS = "SETTLEMENT_IN_PROGRESS", "Settlement in progress"
        CLOSURE_PENDING = "CLOSURE_PENDING", "Closure pending"
        CLOSED = "CLOSED", "Closed"
        ARCHIVED = "ARCHIVED", "Archived"
        CANCELLED = "CANCELLED", "Cancelled"

    class CourtStage(models.TextChoices):
        NOT_FILED = "NOT_FILED", "Not filed"
        READY_FOR_FILING = "READY_FOR_FILING", "Ready for filing"
        FILED = "FILED", "Filed"
        AWAITING_ASSESSMENT_OR_PAYMENT = "AWAITING_ASSESSMENT_OR_PAYMENT", "Awaiting assessment or payment"
        AWAITING_SERVICE = "AWAITING_SERVICE", "Awaiting service"
        SERVICE_IN_PROGRESS = "SERVICE_IN_PROGRESS", "Service in progress"
        AWAITING_RESPONSE = "AWAITING_RESPONSE", "Awaiting response"
        PLEADINGS_OPEN = "PLEADINGS_OPEN", "Pleadings open"
        PLEADINGS_CLOSED = "PLEADINGS_CLOSED", "Pleadings closed"
        CASE_MANAGEMENT = "CASE_MANAGEMENT", "Case management"
        PRE_TRIAL = "PRE_TRIAL", "Pre-trial"
        AWAITING_HEARING = "AWAITING_HEARING", "Awaiting hearing"
        HEARING_IN_PROGRESS = "HEARING_IN_PROGRESS", "Hearing in progress"
        SUBMISSIONS = "SUBMISSIONS", "Submissions"
        JUDGMENT_RESERVED = "JUDGMENT_RESERVED", "Judgment reserved"
        JUDGMENT_DELIVERED = "JUDGMENT_DELIVERED", "Judgment delivered"
        DECREE_EXTRACTION = "DECREE_EXTRACTION", "Decree extraction"
        EXECUTION = "EXECUTION", "Execution"
        APPEAL_OR_REVIEW = "APPEAL_OR_REVIEW", "Appeal or review"
        CONCLUDED = "CONCLUDED", "Concluded"

    class OutcomeStatus(models.TextChoices):
        PENDING = "PENDING", "Pending"
        WON = "WON", "Won"
        PARTLY_WON = "PARTLY_WON", "Partly won"
        LOST = "LOST", "Lost"
        SETTLED = "SETTLED", "Settled"
        WITHDRAWN = "WITHDRAWN", "Withdrawn"
        STRUCK_OUT = "STRUCK_OUT", "Struck out"
        DISMISSED = "DISMISSED", "Dismissed"
        CONSENT_RECORDED = "CONSENT_RECORDED", "Consent recorded"
        ABATED = "ABATED", "Abated"
        OTHER = "OTHER", "Other"

    class EnforcementStatus(models.TextChoices):
        NOT_APPLICABLE = "NOT_APPLICABLE", "Not applicable"
        NOT_STARTED = "NOT_STARTED", "Not started"
        DECREE_PENDING = "DECREE_PENDING", "Decree pending"
        DECREE_ISSUED = "DECREE_ISSUED", "Decree issued"
        DEMAND_FOR_COMPLIANCE = "DEMAND_FOR_COMPLIANCE", "Demand for compliance"
        PART_PAYMENT = "PART_PAYMENT", "Part payment"
        SATISFIED = "SATISFIED", "Satisfied"
        EXECUTION_IN_PROGRESS = "EXECUTION_IN_PROGRESS", "Execution in progress"
        STAYED = "STAYED", "Stayed"
        UNSUCCESSFUL = "UNSUCCESSFUL", "Unsuccessful"
        CLOSED = "CLOSED", "Closed"

    class AppealStatus(models.TextChoices):
        NONE = "NONE", "None"
        UNDER_CONSIDERATION = "UNDER_CONSIDERATION", "Under consideration"
        REVIEW_FILED = "REVIEW_FILED", "Review filed"
        APPEAL_FILED = "APPEAL_FILED", "Appeal filed"
        STAY_REQUESTED = "STAY_REQUESTED", "Stay requested"
        STAY_GRANTED = "STAY_GRANTED", "Stay granted"
        STAY_DENIED = "STAY_DENIED", "Stay denied"
        APPEAL_PENDING = "APPEAL_PENDING", "Appeal pending"
        APPEAL_DETERMINED = "APPEAL_DETERMINED", "Appeal determined"

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
    status = models.CharField(
        max_length=40,
        choices=Status.choices,
        default=Status.PENDING,
        help_text=(
            "Deprecated compatibility field. Use matter_status, court_stage, "
            "outcome_status, enforcement_status and appeal_status for lifecycle logic."
        ),
    )
    matter_status = models.CharField(
        max_length=50,
        choices=MatterStatus.choices,
        default=MatterStatus.INSTRUCTIONS_RECEIVED,
        db_index=True,
    )
    court_stage = models.CharField(
        max_length=50,
        choices=CourtStage.choices,
        default=CourtStage.NOT_FILED,
        db_index=True,
    )
    outcome_status = models.CharField(
        max_length=40,
        choices=OutcomeStatus.choices,
        default=OutcomeStatus.PENDING,
        db_index=True,
    )
    enforcement_status = models.CharField(
        max_length=40,
        choices=EnforcementStatus.choices,
        default=EnforcementStatus.NOT_APPLICABLE,
        db_index=True,
    )
    appeal_status = models.CharField(
        max_length=40,
        choices=AppealStatus.choices,
        default=AppealStatus.NONE,
        db_index=True,
    )
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
    assessment_reference = models.CharField(max_length=120, blank=True, default="")
    court_fee_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    payment_date = models.DateField(null=True, blank=True)
    official_court_case_number = models.CharField(max_length=120, blank=True, default="")
    filing_date = models.DateField(null=True, blank=True)
    filed_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="filed_cases",
    )
    claim_amount = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    currency = models.CharField(max_length=3, blank=True, default="KES")
    court_level = models.CharField(max_length=80, blank=True, default="")
    judicial_officer_rank = models.CharField(max_length=80, blank=True, default="")
    jurisdiction_notes = models.TextField(blank=True, default="")
    jurisdiction_verified = models.BooleanField(default=False)
    jurisdiction_verified_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="jurisdiction_verified_cases",
    )
    jurisdiction_verified_at = models.DateTimeField(null=True, blank=True)
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
