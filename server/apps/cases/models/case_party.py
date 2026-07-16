import uuid

from django.db import models

from apps.common.models.timestamped_model import TimestampedModel


class CaseParty(TimestampedModel):
    class PartyRole(models.TextChoices):
        PLAINTIFF = "PLAINTIFF", "Plaintiff"
        DEFENDANT = "DEFENDANT", "Defendant"
        PETITIONER = "PETITIONER", "Petitioner"
        RESPONDENT = "RESPONDENT", "Respondent"
        APPLICANT = "APPLICANT", "Applicant"
        APPELLANT = "APPELLANT", "Appellant"
        ACCUSED = "ACCUSED", "Accused"
        COMPLAINANT = "COMPLAINANT", "Complainant"
        VICTIM = "VICTIM", "Victim"
        CLAIMANT = "CLAIMANT", "Claimant"
        OBJECTOR = "OBJECTOR", "Objector"
        INTERESTED_PARTY = "INTERESTED_PARTY", "Interested Party"
        AMICUS_CURIAE = "AMICUS_CURIAE", "Amicus Curiae"
        BENEFICIARY = "BENEFICIARY", "Beneficiary"
        EXECUTOR = "EXECUTOR", "Executor"
        ADMINISTRATOR = "ADMINISTRATOR", "Administrator"
        DECEASED = "DECEASED", "Deceased"
        LANDLORD = "LANDLORD", "Landlord"
        TENANT = "TENANT", "Tenant"
        TAXPAYER = "TAXPAYER", "Taxpayer"
        COMMISSIONER = "COMMISSIONER", "Commissioner"
        ADVOCATE_ON_RECORD = "ADVOCATE_ON_RECORD", "Advocate on Record"
        OTHER = "OTHER", "Other"

    class PartyType(models.TextChoices):
        INDIVIDUAL = "INDIVIDUAL", "Individual"
        ORGANISATION = "ORGANISATION", "Organisation"
        GOVERNMENT = "GOVERNMENT", "Government Entity"
        ESTATE = "ESTATE", "Estate"
        MINOR = "MINOR", "Minor"
        OTHER = "OTHER", "Other"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case = models.ForeignKey("cases.Case", on_delete=models.CASCADE, related_name="parties")
    client = models.ForeignKey(
        "clients.Client",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="case_party_roles",
    )
    name = models.CharField(max_length=255)
    party_role = models.CharField(max_length=40, choices=PartyRole.choices)
    party_type = models.CharField(max_length=30, choices=PartyType.choices, default=PartyType.INDIVIDUAL)
    is_our_client = models.BooleanField(default=False)
    party_order = models.PositiveIntegerField(default=1)
    advocate_on_record = models.CharField(max_length=255, blank=True, default="")
    law_firm = models.CharField(max_length=255, blank=True, default="")
    phone_number = models.CharField(max_length=30, blank=True, default="")
    email = models.EmailField(blank=True, default="")
    national_id = models.CharField(max_length=50, blank=True, default="")
    kra_pin = models.CharField(max_length=50, blank=True, default="")
    notes = models.TextField(blank=True, default="")

    class Meta:
        db_table = "case_parties"
        ordering = ["party_order", "created_at"]
        indexes = [
            models.Index(fields=["case", "party_role"]),
            models.Index(fields=["client"]),
            models.Index(fields=["is_our_client"]),
        ]

    def __str__(self):
        return f"{self.name} - {self.get_party_role_display()}"
