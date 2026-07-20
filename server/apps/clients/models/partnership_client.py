from django.db import models


class PartnershipClient(models.Model):
    class PartnershipSubtype(models.TextChoices):
        GENERAL_PARTNERSHIP = "GENERAL_PARTNERSHIP", "General Partnership"
        LIMITED_PARTNERSHIP = "LIMITED_PARTNERSHIP", "Limited Partnership"
        FOREIGN_PARTNERSHIP = "FOREIGN_PARTNERSHIP", "Foreign Partnership"

    class AgreementType(models.TextChoices):
        GENERAL_PARTNERSHIP = "GENERAL_PARTNERSHIP", "General Partnership Agreement"
        LIMITED_PARTNERSHIP = "LIMITED_PARTNERSHIP", "Limited Partnership Agreement"
        FOREIGN_PARTNERSHIP = "FOREIGN_PARTNERSHIP", "Foreign Partnership Agreement"

    client = models.OneToOneField(
        "clients.Client",
        on_delete=models.CASCADE,
        related_name="partnership_profile"
    )

    # --------------------------------
    # Partnership Identity
    # --------------------------------

    partnership_name = models.CharField(
        max_length=255
    )

    registration_number = models.CharField(
        max_length=100,
        null=True,
        blank=True
    )

    tax_pin = models.CharField(
        max_length=100,
        null=True,
        blank=True
    )

    subtype = models.CharField(
        max_length=50,
        choices=PartnershipSubtype.choices,
        default=PartnershipSubtype.GENERAL_PARTNERSHIP,
    )

    formation_date = models.DateField(
        null=True,
        blank=True
    )

    registration_date = models.DateField(null=True, blank=True)

    country_of_registration = models.CharField(max_length=100, default="Kenya")

    registration_authority = models.CharField(max_length=255, blank=True, default="")

    principal_place_of_business = models.TextField(blank=True, default="")

    business_sector = models.CharField(max_length=150, blank=True, default="")

    # --------------------------------
    # Partnership Structure
    # --------------------------------

    partner_count = models.PositiveIntegerField(
        default=0
    )

    agreement_type = models.CharField(
        max_length=100,
        choices=AgreementType.choices,
        null=True,
        blank=True
    )

    partnership_agreement_reference = models.CharField(max_length=150, blank=True, default="")

    status = models.CharField(max_length=50, blank=True, default="UNKNOWN")

    compliance_notes = models.TextField(blank=True, default="")

    registration_verified = models.BooleanField(default=False)

    # --------------------------------
    # Metadata
    # --------------------------------

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    class Meta:
        db_table = "partnership_clients"

    def __str__(self):
        return self.partnership_name


class PartnershipPartner(models.Model):
    class PartnerType(models.TextChoices):
        INDIVIDUAL = "INDIVIDUAL", "Individual"
        ENTITY = "ENTITY", "Entity"

    class PartnerDesignation(models.TextChoices):
        GENERAL_PARTNER = "GENERAL_PARTNER", "General Partner"
        LIMITED_PARTNER = "LIMITED_PARTNER", "Limited Partner"

    partnership = models.ForeignKey(
        PartnershipClient,
        on_delete=models.CASCADE,
        related_name="partners",
    )
    partner_type = models.CharField(max_length=20, choices=PartnerType.choices)
    linked_client = models.ForeignKey(
        "clients.Client",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="partnership_partner_roles",
    )
    legal_name = models.CharField(max_length=255)
    identifier = models.CharField(max_length=100, blank=True, default="")
    kra_pin = models.CharField(max_length=50, blank=True, default="")
    address = models.TextField(blank=True, default="")
    designation = models.CharField(
        max_length=50,
        choices=PartnerDesignation.choices,
        default=PartnerDesignation.GENERAL_PARTNER,
    )
    profit_share = models.DecimalField(max_digits=7, decimal_places=4, null=True, blank=True)
    authority_to_instruct = models.BooleanField(default=False)
    date_joined = models.DateField(null=True, blank=True)
    date_ceased = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "partnership_partners"
        indexes = [
            models.Index(fields=["partnership", "is_active"]),
            models.Index(fields=["partnership", "designation"]),
        ]

    def __str__(self):
        return self.legal_name
