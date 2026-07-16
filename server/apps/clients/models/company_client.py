from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


class CompanyClient(models.Model):
    class CompanyStatus(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        DORMANT = "DORMANT", "Dormant"
        UNDER_ADMINISTRATION = (
            "UNDER_ADMINISTRATION",
            "Under Administration",
        )
        IN_RECEIVERSHIP = "IN_RECEIVERSHIP", "In Receivership"
        INSOLVENT = "INSOLVENT", "Insolvent"
        LIQUIDATION = "LIQUIDATION", "In Liquidation"
        DISSOLVED = "DISSOLVED", "Dissolved"
        STRUCK_OFF = "STRUCK_OFF", "Struck Off"
        OTHER = "OTHER", "Other"

    class CompanyType(models.TextChoices):
        PRIVATE_LIMITED = (
            "PRIVATE_LIMITED",
            "Private Company Limited by Shares",
        )
        PUBLIC_LIMITED = (
            "PUBLIC_LIMITED",
            "Public Limited Company",
        )
        COMPANY_LIMITED_BY_GUARANTEE = (
            "COMPANY_LIMITED_BY_GUARANTEE",
            "Company Limited by Guarantee",
        )
        FOREIGN_COMPANY = "FOREIGN_COMPANY", "Foreign Company"
        UNLIMITED_COMPANY = "UNLIMITED_COMPANY", "Unlimited Company"
        OTHER = "OTHER", "Other"

    # ---------------------------------------------------------
    # Base client relationship
    # ---------------------------------------------------------

    client = models.OneToOneField(
        "clients.Client",
        on_delete=models.CASCADE,
        related_name="company_profile",
    )

    # ---------------------------------------------------------
    # Legal identity
    # ---------------------------------------------------------

    company_name = models.CharField(
        max_length=255,
        help_text="Company name as shown on the certificate of incorporation.",
    )

    trading_name = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text="Business or trading name, where different from legal name.",
    )

    registration_number = models.CharField(
        max_length=100,
        unique=True,
        db_index=True,
        help_text="Registration number shown on the incorporation certificate.",
    )

    company_type = models.CharField(
        max_length=50,
        choices=CompanyType.choices,
        default=CompanyType.PRIVATE_LIMITED,
    )

    incorporation_date = models.DateField(
        null=True,
        blank=True,
    )

    country_of_incorporation = models.CharField(
        max_length=100,
        default="Kenya",
    )

    company_status = models.CharField(
        max_length=50,
        choices=CompanyStatus.choices,
        default=CompanyStatus.ACTIVE,
        db_index=True,
    )

    # ---------------------------------------------------------
    # Business details
    # ---------------------------------------------------------

    industry = models.CharField(
        max_length=150,
        blank=True,
        default="",
        db_index=True,
    )

    nature_of_business = models.TextField(
        blank=True,
        default="",
        help_text="Brief description of the company's principal activities.",
    )

    website = models.URLField(
        blank=True,
        default="",
    )

    director_count = models.PositiveIntegerField(
        default=0,
    )

    employee_count = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    # ---------------------------------------------------------
    # Compliance and due diligence
    # ---------------------------------------------------------

    beneficial_ownership_declared = models.BooleanField(
        default=False,
        help_text="Whether beneficial ownership information has been provided.",
    )

    annual_returns_up_to_date = models.BooleanField(
        default=False,
        help_text="Whether the company confirms that annual returns are current.",
    )

    compliance_notes = models.TextField(
        blank=True,
        default="",
    )

    # ---------------------------------------------------------
    # Internal verification
    # ---------------------------------------------------------

    registration_verified = models.BooleanField(
        default=False,
        help_text="Whether registration details have been verified by the firm.",
    )

    registration_verified_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    registration_verified_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="verified_company_clients",
    )

    # ---------------------------------------------------------
    # Audit timestamps
    # ---------------------------------------------------------

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        db_table = "company_clients"
        verbose_name = "Company Client"
        verbose_name_plural = "Company Clients"
        ordering = ["company_name"]
        indexes = [
            models.Index(
                fields=["company_status"],
                name="company_status_idx",
            ),
            models.Index(
                fields=["industry"],
                name="company_industry_idx",
            ),
            models.Index(
                fields=["company_type"],
                name="company_type_idx",
            ),
            models.Index(
                fields=["country_of_incorporation"],
                name="company_country_idx",
            ),
        ]

    def __str__(self):
        return self.company_name

    def clean(self):
        """
        Validate consistency between CompanyClient and the base Client.
        """
        super().clean()

        if self.client_id:
            from apps.clients.models import Client

            if self.client.client_type != Client.ClientType.COMPANY:
                raise ValidationError(
                    {
                        "client": (
                            "A CompanyClient profile must be connected to a "
                            "Client whose client_type is COMPANY."
                        )
                    }
                )

        if (
            self.incorporation_date
            and self.incorporation_date > timezone.localdate()
        ):
            raise ValidationError(
                {
                    "incorporation_date": (
                        "The incorporation date cannot be in the future."
                    )
                }
            )

        if (
            self.registration_verified
            and not self.registration_verified_at
        ):
            raise ValidationError(
                {
                    "registration_verified_at": (
                        "Provide the date and time when registration was "
                        "verified."
                    )
                }
            )

        if (
            not self.registration_verified
            and self.registration_verified_at
        ):
            raise ValidationError(
                {
                    "registration_verified": (
                        "Registration must be marked as verified when a "
                        "verification date is provided."
                    )
                }
            )

    def save(self, *args, **kwargs):
        self.company_name = self.company_name.strip()
        self.registration_number = self.registration_number.strip().upper()
        self.trading_name = self.trading_name.strip()

        self.full_clean()
        super().save(*args, **kwargs)

    @property
    def kra_pin(self):
        """
        Retrieve the company's KRA PIN from the base Client record.
        """
        return self.client.kra_pin

    @property
    def portal_user(self):
        """
        Retrieve the company's portal account from the base Client record.
        """
        return self.client.user

    @property
    def has_portal_access(self):
        return self.client.user_id is not None

    @property
    def primary_email(self):
        return self.client.email

    @property
    def primary_phone_number(self):
        return self.client.phone_number