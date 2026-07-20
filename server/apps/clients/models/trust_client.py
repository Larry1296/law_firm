from django.db import models


class TrustClient(models.Model):
    class TrustSubtype(models.TextChoices):
        PRIVATE_TRUST = "PRIVATE_TRUST", "Private Trust"
        CHARITABLE_TRUST = "CHARITABLE_TRUST", "Charitable Trust"
        INCORPORATED_TRUSTEES = "INCORPORATED_TRUSTEES", "Incorporated Trustees"
        PUBLIC_TRUST = "PUBLIC_TRUST", "Public Trust"
        OTHER = "OTHER", "Other"

    client = models.OneToOneField(
        "clients.Client",
        on_delete=models.CASCADE,
        related_name="trust_profile"
    )

    trust_name = models.CharField(max_length=255)

    trust_type = models.CharField(
        max_length=100,
        choices=TrustSubtype.choices,
        null=True,
        blank=True,
    )

    trust_deed_reference = models.CharField(max_length=100, null=True, blank=True)

    trust_deed_date = models.DateField(null=True, blank=True)

    registration_number = models.CharField(max_length=100, blank=True, default="")

    incorporation_details = models.TextField(blank=True, default="")

    formation_date = models.DateField(null=True, blank=True)

    jurisdiction = models.CharField(max_length=100, null=True, blank=True)

    purpose = models.TextField(blank=True, default="")

    principal_address = models.TextField(blank=True, default="")

    settlor_details = models.TextField(blank=True, default="")

    status = models.CharField(max_length=50, blank=True, default="UNKNOWN")

    verification_notes = models.TextField(blank=True, default="")

    trustee_count = models.PositiveIntegerField(default=0)

    primary_trustee_name = models.CharField(max_length=255, null=True, blank=True)
    primary_trustee_contact = models.CharField(max_length=30, null=True, blank=True)

    beneficiary_details = models.TextField(null=True, blank=True)

    assets_under_trust = models.TextField(null=True, blank=True)

    legal_representative = models.CharField(max_length=255, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.trust_name


class TrustTrustee(models.Model):
    class TrusteeType(models.TextChoices):
        INDIVIDUAL = "INDIVIDUAL", "Individual"
        CORPORATE = "CORPORATE", "Corporate Trustee"

    trust = models.ForeignKey(
        TrustClient,
        on_delete=models.CASCADE,
        related_name="trustees",
    )
    trustee_type = models.CharField(max_length=20, choices=TrusteeType.choices)
    linked_client = models.ForeignKey(
        "clients.Client",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="trustee_roles",
    )
    legal_name = models.CharField(max_length=255)
    identifier = models.CharField(max_length=100, blank=True, default="")
    address = models.TextField(blank=True, default="")
    appointment_date = models.DateField(null=True, blank=True)
    cessation_date = models.DateField(null=True, blank=True)
    is_primary_contact = models.BooleanField(default=False)
    authority_to_instruct = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "trust_trustees"
        indexes = [
            models.Index(fields=["trust", "is_primary_contact"]),
            models.Index(fields=["trust", "authority_to_instruct"]),
        ]

    def __str__(self):
        return self.legal_name
