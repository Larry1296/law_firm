from django.db import models


class EstateClient(models.Model):
    class GrantType(models.TextChoices):
        PROBATE = "PROBATE", "Grant of Probate"
        LETTERS_OF_ADMINISTRATION = "LETTERS_OF_ADMINISTRATION", "Letters of Administration"
        LIMITED_GRANT = "LIMITED_GRANT", "Limited Grant"
        PUBLIC_TRUSTEE = "PUBLIC_TRUSTEE", "Public Trustee"
        PRE_GRANT_ADVISORY = "PRE_GRANT_ADVISORY", "Pre-grant Advisory"
        OTHER = "OTHER", "Other"

    class GrantStatus(models.TextChoices):
        NOT_APPLIED = "NOT_APPLIED", "Not Applied"
        APPLIED = "APPLIED", "Applied"
        ISSUED = "ISSUED", "Issued"
        CONFIRMED = "CONFIRMED", "Confirmed"
        REVOKED = "REVOKED", "Revoked"
        DISPUTED = "DISPUTED", "Disputed"
        UNKNOWN = "UNKNOWN", "Unknown"

    client = models.OneToOneField(
        "clients.Client",
        on_delete=models.CASCADE,
        related_name="estate_profile"
    )

    estate_name = models.CharField(max_length=255)

    deceased_full_name = models.CharField(max_length=255)

    deceased_id_number = models.CharField(max_length=50, null=True, blank=True)

    date_of_death = models.DateField(null=True, blank=True)

    deceased_last_address = models.TextField(blank=True, default="")

    grant_type = models.CharField(
        max_length=50,
        choices=GrantType.choices,
        blank=True,
        default="",
    )

    grant_issue_date = models.DateField(null=True, blank=True)

    grant_confirmation_date = models.DateField(null=True, blank=True)

    grant_status = models.CharField(
        max_length=50,
        choices=GrantStatus.choices,
        default=GrantStatus.UNKNOWN,
    )

    probate_number = models.CharField(max_length=100, null=True, blank=True)

    court_reference = models.CharField(max_length=100, null=True, blank=True)

    executor_name = models.CharField(max_length=255, null=True, blank=True)
    executor_contact = models.CharField(max_length=30, null=True, blank=True)

    administrator_name = models.CharField(max_length=255, null=True, blank=True)
    administrator_contact = models.CharField(max_length=30, null=True, blank=True)

    estate_value_estimate = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True
    )

    beneficiaries = models.TextField(null=True, blank=True)

    assets_description = models.TextField(null=True, blank=True)

    liabilities_description = models.TextField(null=True, blank=True)

    court_status = models.CharField(max_length=100, null=True, blank=True)

    verification_notes = models.TextField(blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.estate_name


class EstatePersonalRepresentative(models.Model):
    class RepresentativeType(models.TextChoices):
        EXECUTOR = "EXECUTOR", "Executor"
        ADMINISTRATOR = "ADMINISTRATOR", "Administrator"
        PUBLIC_TRUSTEE = "PUBLIC_TRUSTEE", "Public Trustee"
        OTHER_LAWFUL_REPRESENTATIVE = (
            "OTHER_LAWFUL_REPRESENTATIVE",
            "Other Lawful Representative",
        )

    estate = models.ForeignKey(
        EstateClient,
        on_delete=models.CASCADE,
        related_name="personal_representatives",
    )
    representative_type = models.CharField(max_length=50, choices=RepresentativeType.choices)
    full_legal_name = models.CharField(max_length=255)
    identifier = models.CharField(max_length=100, blank=True, default="")
    phone_number = models.CharField(max_length=30, blank=True, default="")
    email = models.EmailField(blank=True, default="")
    address = models.TextField(blank=True, default="")
    grant_reference = models.CharField(max_length=150, blank=True, default="")
    authority_start_date = models.DateField(null=True, blank=True)
    authority_end_date = models.DateField(null=True, blank=True)
    is_primary = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "estate_personal_representatives"
        indexes = [
            models.Index(fields=["estate", "representative_type"]),
            models.Index(fields=["estate", "is_primary"]),
        ]

    def __str__(self):
        return self.full_legal_name
