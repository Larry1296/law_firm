import uuid

from django.db import models


class Client(models.Model):

    class ClientType(models.TextChoices):
        INDIVIDUAL = "INDIVIDUAL", "Individual"
        COMPANY = "COMPANY", "Company"
        PARTNERSHIP = "PARTNERSHIP", "Partnership"
        NGO = "NGO", "NGO"
        TRUST = "TRUST", "Trust"
        GOVERNMENT = "GOVERNMENT", "Government"
        BUSINESS_ENTITY = "BUSINESS_ENTITY", "Business Entity"
        GOVERNMENT_BODY = "GOVERNMENT_BODY", "Government Body"
        FINANCIAL_INSTITUTION = "FINANCIAL_INSTITUTION", "Financial Institution"
        NGO_ASSOCIATION = "NGO_ASSOCIATION", "NGO / Association"
        EDUCATIONAL_INSTITUTION = "EDUCATIONAL_INSTITUTION", "Educational Institution"
        ESTATE = "ESTATE", "Estate"
        REPRESENTATIVE = "REPRESENTATIVE", "Representative"
        COOPERATIVE = "COOPERATIVE", "Cooperative"
        INTERNATIONAL_ENTITY = "INTERNATIONAL_ENTITY", "International Entity"

    class AccessType(models.TextChoices):
        PORTAL_CLIENT = "PORTAL_CLIENT", "Portal Client"
        ASSISTED_CLIENT = "ASSISTED_CLIENT", "Assisted Client"

    class LifecycleStatus(models.TextChoices):
        PROSPECT = "PROSPECT", "Prospect"
        OFFICIAL_CLIENT = "OFFICIAL_CLIENT", "Official Client"
        ARCHIVED = "ARCHIVED", "Archived"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    firm = models.ForeignKey(
        "firm.LawFirm",
        on_delete=models.CASCADE,
        related_name="clients",
    )

    created_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_clients",
    )

    user = models.OneToOneField(
        "users.User",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="client_profile",
    )

    # Core Identity

    full_name = models.CharField(
        max_length=255,
    )

    email = models.EmailField(
        null=True,
        blank=True,
    )

    phone_number = models.CharField(
        max_length=30,
        blank=True,
        default="",
    )

    # Classification

    client_type = models.CharField(
        max_length=50,
        choices=ClientType.choices,
    )

    access_type = models.CharField(
        max_length=30,
        choices=AccessType.choices,
        default=AccessType.ASSISTED_CLIENT,
    )

    # Identification

    national_id = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        db_index=True,
    )

    passport_number = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        db_index=True,
    )

    kra_pin = models.CharField(
        max_length=50,
        null=True,
        blank=True,
    )

    date_of_birth = models.DateField(
        null=True,
        blank=True,
    )

    # Lifecycle

    lifecycle_status = models.CharField(
        max_length=30,
        choices=LifecycleStatus.choices,
        default=LifecycleStatus.PROSPECT,
    )

    is_active = models.BooleanField(
        default=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        db_table = "clients"
        indexes = [
            models.Index(fields=["client_type"]),
            models.Index(fields=["access_type"]),
            models.Index(fields=["national_id"]),
            models.Index(fields=["passport_number"]),
        ]

    def __str__(self):
        return self.full_name
