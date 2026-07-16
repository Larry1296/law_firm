import uuid

from django.db import models
from django.utils import timezone


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
        RELIGIOUS_ORGANIZATION = "RELIGIOUS_ORGANIZATION", "Religious Organization"
        EDUCATIONAL_INSTITUTION = "EDUCATIONAL_INSTITUTION", "Educational Institution"
        ESTATE = "ESTATE", "Estate"
        REPRESENTATIVE = "REPRESENTATIVE", "Representative"
        COOPERATIVE = "COOPERATIVE", "Cooperative"
        SACCO = "SACCO", "SACCO"
        INTERNATIONAL_ENTITY = "INTERNATIONAL_ENTITY", "International Entity"

    class AccessType(models.TextChoices):
        PROSPECT = "PROSPECT", "Prospect"
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

    is_verified = models.BooleanField(
        default=False,
    )

    is_active = models.BooleanField(
        default=True,
    )

    previous_lifecycle_status = models.CharField(
        max_length=30,
        choices=LifecycleStatus.choices,
        null=True,
        blank=True,
    )

    previous_access_type = models.CharField(
        max_length=30,
        choices=AccessType.choices,
        null=True,
        blank=True,
    )

    previous_is_active = models.BooleanField(
        null=True,
        blank=True,
    )

    soft_deleted_at = models.DateTimeField(
        null=True,
        blank=True,
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

    @property
    def has_cases(self):
        return self.cases.exists()

    @property
    def can_hard_delete(self):
        return not self.has_cases

    @property
    def can_archive(self):
        return self.has_cases and self.lifecycle_status != self.LifecycleStatus.ARCHIVED

    @property
    def can_restore(self):
        return self.lifecycle_status == self.LifecycleStatus.ARCHIVED or self.soft_deleted_at is not None

    def snapshot_state_for_archive(self):
        if self.lifecycle_status != self.LifecycleStatus.ARCHIVED:
            self.previous_lifecycle_status = self.lifecycle_status
        if self.access_type:
            self.previous_access_type = self.access_type
        self.previous_is_active = self.is_active
        self.soft_deleted_at = timezone.now()
