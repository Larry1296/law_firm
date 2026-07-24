import uuid

from django.db import models

from apps.common.models.timestamped_model import TimestampedModel


class CourtProceeding(TimestampedModel):
    class JurisdictionVerificationStatus(models.TextChoices):
        PENDING = "PENDING", "Pending"
        VERIFIED = "VERIFIED", "Verified"
        WARNING_OVERRIDDEN = "WARNING_OVERRIDDEN", "Warning overridden"
        REQUIRES_REVIEW = "REQUIRES_REVIEW", "Requires review"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    matter = models.OneToOneField("cases.Case", on_delete=models.CASCADE, related_name="court_proceeding")
    official_court_case_number = models.CharField(max_length=120, blank=True, default="")
    filing_date = models.DateField(null=True, blank=True)
    court_type = models.CharField(max_length=40, blank=True, default="")
    court_level = models.CharField(max_length=80, blank=True, default="")
    court_name = models.CharField(max_length=255, blank=True, default="")
    court_station = models.CharField(max_length=255, blank=True, default="")
    registry = models.CharField(max_length=255, blank=True, default="")
    division = models.CharField(max_length=60, blank=True, default="")
    courtroom = models.CharField(max_length=100, blank=True, default="")
    judicial_officer = models.CharField(max_length=255, blank=True, default="")
    court_location = models.CharField(max_length=255, blank=True, default="")
    efiling_reference = models.CharField(max_length=120, blank=True, default="")
    assessment_reference = models.CharField(max_length=120, blank=True, default="")
    court_fee_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    payment_reference = models.CharField(max_length=120, blank=True, default="")
    payment_date = models.DateField(null=True, blank=True)
    cts_reference = models.CharField(max_length=120, blank=True, default="")
    court_stage = models.CharField(max_length=50, blank=True, default="")
    jurisdiction_verification_status = models.CharField(
        max_length=40,
        choices=JurisdictionVerificationStatus.choices,
        default=JurisdictionVerificationStatus.PENDING,
    )
    jurisdiction_notes = models.TextField(blank=True, default="")

    class Meta:
        db_table = "case_court_proceedings"
        indexes = [
            models.Index(fields=["court_type"]),
            models.Index(fields=["official_court_case_number"]),
        ]


class TribunalProceeding(TimestampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    matter = models.OneToOneField("cases.Case", on_delete=models.CASCADE, related_name="tribunal_proceeding")
    tribunal_name = models.CharField(max_length=255)
    tribunal_reference = models.CharField(max_length=120, blank=True, default="")
    filing_date = models.DateField(null=True, blank=True)
    registry_or_location = models.CharField(max_length=255, blank=True, default="")
    panel_or_adjudicator = models.CharField(max_length=255, blank=True, default="")
    next_date = models.DateTimeField(null=True, blank=True)
    next_action = models.CharField(max_length=255, blank=True, default="")

    class Meta:
        db_table = "case_tribunal_proceedings"


class ArbitrationProceeding(TimestampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    matter = models.OneToOneField("cases.Case", on_delete=models.CASCADE, related_name="arbitration_proceeding")
    arbitration_reference = models.CharField(max_length=120, blank=True, default="")
    arbitration_agreement = models.TextField(blank=True, default="")
    institution = models.CharField(max_length=255, blank=True, default="")
    seat = models.CharField(max_length=120, blank=True, default="")
    rules = models.CharField(max_length=255, blank=True, default="")
    arbitrator = models.CharField(max_length=255, blank=True, default="")
    commencement_date = models.DateField(null=True, blank=True)
    next_date = models.DateTimeField(null=True, blank=True)
    next_action = models.CharField(max_length=255, blank=True, default="")

    class Meta:
        db_table = "case_arbitration_proceedings"


class NonContentiousMatterDetails(TimestampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    matter = models.OneToOneField("cases.Case", on_delete=models.CASCADE, related_name="non_contentious_details")
    instruction_type = models.CharField(max_length=120, blank=True, default="")
    deliverable = models.CharField(max_length=255, blank=True, default="")
    target_completion_date = models.DateField(null=True, blank=True)
    counterparty = models.CharField(max_length=255, blank=True, default="")
    transaction_value = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    scope_of_work = models.TextField(blank=True, default="")

    class Meta:
        db_table = "case_non_contentious_details"


class LandMatterDetails(TimestampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    matter = models.OneToOneField("cases.Case", on_delete=models.CASCADE, related_name="land_details")
    property_description = models.TextField(blank=True, default="")
    title_number = models.CharField(max_length=120, blank=True, default="")
    parcel_number = models.CharField(max_length=120, blank=True, default="")
    land_reference_number = models.CharField(max_length=120, blank=True, default="")
    county = models.CharField(max_length=120, blank=True, default="")
    location = models.CharField(max_length=255, blank=True, default="")
    registered_owner = models.CharField(max_length=255, blank=True, default="")
    estimated_property_value = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    nature_of_land_interest = models.CharField(max_length=120, blank=True, default="")
    possession_status = models.CharField(max_length=120, blank=True, default="")
    boundary_dispute = models.BooleanField(default=False)
    environment_issue = models.TextField(blank=True, default="")
    orders_sought = models.TextField(blank=True, default="")

    class Meta:
        db_table = "case_land_details"


class SuccessionMatterDetails(TimestampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    matter = models.OneToOneField("cases.Case", on_delete=models.CASCADE, related_name="succession_details")
    deceased_full_name = models.CharField(max_length=255, blank=True, default="")
    date_of_death = models.DateField(null=True, blank=True)
    place_of_death = models.CharField(max_length=255, blank=True, default="")
    testate_status = models.CharField(max_length=40, blank=True, default="")
    will_date = models.DateField(null=True, blank=True)
    estimated_gross_estate_value = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    known_liabilities = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    estimated_net_estate_value = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    disputed_asset_value = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    grant_type = models.CharField(max_length=120, blank=True, default="")
    proposed_administrator = models.CharField(max_length=255, blank=True, default="")

    class Meta:
        db_table = "case_succession_details"


class InsuranceMatterDetails(TimestampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    matter = models.OneToOneField("cases.Case", on_delete=models.CASCADE, related_name="insurance_details")
    insurer = models.CharField(max_length=255, blank=True, default="")
    policy_number = models.CharField(max_length=120, blank=True, default="")
    policy_type = models.CharField(max_length=120, blank=True, default="")
    insured_party = models.CharField(max_length=255, blank=True, default="")
    claim_number = models.CharField(max_length=120, blank=True, default="")
    date_of_loss = models.DateField(null=True, blank=True)
    cause_of_loss = models.TextField(blank=True, default="")
    amount_claimed = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    amount_admitted = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    amount_paid = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    outstanding_amount = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    policy_limit = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    repudiation_date = models.DateField(null=True, blank=True)
    repudiation_reason = models.TextField(blank=True, default="")

    class Meta:
        db_table = "case_insurance_details"


class EmploymentMatterDetails(TimestampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    matter = models.OneToOneField("cases.Case", on_delete=models.CASCADE, related_name="employment_details")
    employer = models.CharField(max_length=255, blank=True, default="")
    employee = models.CharField(max_length=255, blank=True, default="")
    employment_start_date = models.DateField(null=True, blank=True)
    termination_date = models.DateField(null=True, blank=True)
    monthly_salary = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    employment_status = models.CharField(max_length=80, blank=True, default="")
    nature_of_complaint = models.TextField(blank=True, default="")
    dismissal_type = models.CharField(max_length=120, blank=True, default="")
    disciplinary_process = models.TextField(blank=True, default="")
    labour_officer_reference = models.CharField(max_length=120, blank=True, default="")

    class Meta:
        db_table = "case_employment_details"


class CriminalMatterDetails(TimestampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    matter = models.OneToOneField("cases.Case", on_delete=models.CASCADE, related_name="criminal_details")
    accused_person = models.CharField(max_length=255, blank=True, default="")
    charge = models.CharField(max_length=255, blank=True, default="")
    statutory_provision = models.CharField(max_length=255, blank=True, default="")
    plea = models.CharField(max_length=120, blank=True, default="")
    arrest_date = models.DateField(null=True, blank=True)
    police_station = models.CharField(max_length=255, blank=True, default="")
    ob_number = models.CharField(max_length=120, blank=True, default="")
    bond_bail_status = models.CharField(max_length=120, blank=True, default="")
    bond_amount = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    custody_status = models.CharField(max_length=120, blank=True, default="")
    prosecution_agency = models.CharField(max_length=255, blank=True, default="")

    class Meta:
        db_table = "case_criminal_details"


class MonetaryRelief(TimestampedModel):
    class ReliefType(models.TextChoices):
        QUANTIFIED = "QUANTIFIED", "Yes - quantified"
        PARTLY_QUANTIFIED = "PARTLY_QUANTIFIED", "Yes - partly quantified"
        TO_BE_ASSESSED = "TO_BE_ASSESSED", "Yes - amount to be assessed"
        NO_MONETARY_RELIEF = "NO_MONETARY_RELIEF", "No monetary relief"
        VALUE_ONLY = "VALUE_ONLY", "Value only, not a claim"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    matter = models.OneToOneField("cases.Case", on_delete=models.CASCADE, related_name="monetary_relief")
    relief_type = models.CharField(max_length=40, choices=ReliefType.choices, default=ReliefType.NO_MONETARY_RELIEF)
    currency = models.CharField(max_length=3, blank=True, default="KES")
    principal_amount = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    special_damages = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    general_damages_status = models.CharField(max_length=80, blank=True, default="")
    general_damages_estimate = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    interest_claimed = models.BooleanField(default=False)
    interest_rate = models.DecimalField(max_digits=7, decimal_places=4, null=True, blank=True)
    interest_basis = models.CharField(max_length=255, blank=True, default="")
    costs_claimed = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    amount_already_paid = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    outstanding_amount = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    estimated_matter_value = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    amount_to_be_assessed = models.BooleanField(default=False)
    property_value = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    mesne_profits = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    rent_arrears = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    damages = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    gross_estate_value = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    liabilities = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    net_estate_value = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    disputed_asset_value = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    amount_claimed = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    amount_admitted = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    amount_paid = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    policy_limit = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    general_damages = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    salary_arrears = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    notice_pay = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    leave_pay = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    service_or_severance_pay = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    compensation_months = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    other_contractual_benefits = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    future_medical_expenses = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    loss_of_earnings = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    loss_of_earning_capacity = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)

    class Meta:
        db_table = "case_monetary_relief"


class ConflictRecordAtRegistration(TimestampedModel):
    class Status(models.TextChoices):
        NOT_YET_RECORDED = "NOT_YET_RECORDED", "Not yet recorded"
        PREVIOUSLY_CLEARED = "PREVIOUSLY_CLEARED", "Previously cleared"
        PREVIOUSLY_WAIVED = "PREVIOUSLY_WAIVED", "Previously waived"
        REQUIRES_VERIFICATION = "REQUIRES_VERIFICATION", "Requires verification"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    matter = models.OneToOneField("cases.Case", on_delete=models.CASCADE, related_name="conflict_record")
    status = models.CharField(max_length=40, choices=Status.choices, default=Status.REQUIRES_VERIFICATION)
    effective_date = models.DateField(null=True, blank=True)
    result_summary = models.TextField(blank=True, default="")
    reason = models.TextField(blank=True, default="")
    notes = models.TextField(blank=True, default="")
    recorded_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="recorded_conflict_histories",
    )
    recorded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "case_conflict_records_at_registration"
