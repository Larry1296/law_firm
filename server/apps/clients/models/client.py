import uuid

from django.db import models
from django.utils import timezone


class Client(models.Model):

    class ClientType(models.TextChoices):
        INDIVIDUAL = "INDIVIDUAL", "Individual"
        SOLE_PROPRIETORSHIP = "SOLE_PROPRIETORSHIP", "Sole Proprietorship"
        COMPANY = "COMPANY", "Company"
        PARTNERSHIP = "PARTNERSHIP", "Partnership"
        LIMITED_LIABILITY_PARTNERSHIP = (
            "LIMITED_LIABILITY_PARTNERSHIP",
            "Limited Liability Partnership",
        )
        COOPERATIVE = "COOPERATIVE", "Cooperative"
        SOCIETY_OR_ASSOCIATION = "SOCIETY_OR_ASSOCIATION", "Society or Association"
        NON_PROFIT_ORGANIZATION = "NON_PROFIT_ORGANIZATION", "Non-Profit Organization"
        TRUST = "TRUST", "Trust"
        ESTATE = "ESTATE", "Estate"
        PUBLIC_ENTITY = "PUBLIC_ENTITY", "Public Entity"
        INTERNATIONAL_ORGANIZATION = (
            "INTERNATIONAL_ORGANIZATION",
            "International Organization",
        )

        # Legacy values retained temporarily for data migrations/API compatibility.
        NGO = "NGO", "NGO"
        GOVERNMENT = "GOVERNMENT", "Government"
        BUSINESS_ENTITY = "BUSINESS_ENTITY", "Business Entity"
        GOVERNMENT_BODY = "GOVERNMENT_BODY", "Government Body"
        FINANCIAL_INSTITUTION = "FINANCIAL_INSTITUTION", "Financial Institution"
        NGO_ASSOCIATION = "NGO_ASSOCIATION", "NGO / Association"
        RELIGIOUS_ORGANIZATION = "RELIGIOUS_ORGANIZATION", "Religious Organization"
        EDUCATIONAL_INSTITUTION = "EDUCATIONAL_INSTITUTION", "Educational Institution"
        REPRESENTATIVE = "REPRESENTATIVE", "Representative"
        SACCO = "SACCO", "SACCO"
        INTERNATIONAL_ENTITY = "INTERNATIONAL_ENTITY", "International Entity"

    class AccessType(models.TextChoices):
        PORTAL_ENABLED = "PORTAL_ENABLED", "Portal enabled"
        ASSISTED = "ASSISTED", "Assisted"

        # Legacy values retained temporarily for API/data compatibility.
        PROSPECT = "PROSPECT", "Prospect"
        ASSISTED_CLIENT = "ASSISTED_CLIENT", "Assisted Client"

    class LifecycleStatus(models.TextChoices):
        PROSPECTIVE = "PROSPECTIVE", "Prospective"
        OFFICIAL = "OFFICIAL", "Official"
        ARCHIVED = "ARCHIVED", "Archived"

        # Legacy values retained temporarily for API/data compatibility.
        PROSPECT = "PROSPECT", "Prospect"
        OFFICIAL_CLIENT = "OFFICIAL_CLIENT", "Official Client"

    class ClassificationReviewStatus(models.TextChoices):
        NOT_REQUIRED = "NOT_REQUIRED", "Not Required"
        REQUIRES_REVIEW = "REQUIRES_REVIEW", "Requires Review"
        REVIEWED = "REVIEWED", "Reviewed"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    kyc_drawer_reference = models.CharField(
        max_length=40,
        blank=True,
        null=True,
        db_index=True,
    )
    kyc_cabinet_location = models.CharField(max_length=255, blank=True, default="")
    kyc_reference_assigned_by = models.ForeignKey(
        "users.User", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="assigned_client_kyc_references",
    )
    kyc_reference_assigned_at = models.DateTimeField(null=True, blank=True)

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

    legacy_client_type = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        help_text="Original client_type preserved during legal-capacity classification migration.",
    )

    classification_review_status = models.CharField(
        max_length=30,
        choices=ClassificationReviewStatus.choices,
        default=ClassificationReviewStatus.NOT_REQUIRED,
    )

    access_type = models.CharField(
        max_length=30,
        choices=AccessType.choices,
        default=AccessType.ASSISTED,
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
        default=LifecycleStatus.PROSPECTIVE,
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
    previous_user_is_active = models.BooleanField(
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
        constraints = [
            models.UniqueConstraint(
                fields=["firm", "kyc_drawer_reference"],
                condition=models.Q(kyc_drawer_reference__isnull=False) & ~models.Q(kyc_drawer_reference=""),
                name="unique_client_kyc_reference_per_firm",
            ),
        ]

    def __str__(self):
        return self.full_name

    @property
    def has_cases(self):
        return self.cases.exists()

    @property
    def can_hard_delete(self):
        if self.has_cases:
            return False
        if self.matter_conflict_checks.exists():
            return False
        if self.documents.exists():
            return False
        if self.kyc_reference_history.exists():
            return False
        if self.document_receipts.exists():
            return False
        if self.document_requirements.exists():
            return False
        return True

    @property
    def can_archive(self):
        return not self.can_hard_delete and self.lifecycle_status != self.LifecycleStatus.ARCHIVED

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


class ClientKYCReferenceHistory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    client = models.ForeignKey(Client, on_delete=models.PROTECT, related_name="kyc_reference_history")
    previous_reference = models.CharField(max_length=40, blank=True, default="")
    new_reference = models.CharField(max_length=40)
    previous_cabinet_location = models.CharField(max_length=255, blank=True, default="")
    new_cabinet_location = models.CharField(max_length=255, blank=True, default="")
    reason = models.TextField()
    changed_by = models.ForeignKey("users.User", on_delete=models.PROTECT, related_name="client_kyc_reference_changes")
    changed_at = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        db_table = "client_kyc_reference_history"
        ordering = ["-changed_at"]
