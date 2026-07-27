from django.db import models


class IndividualClient(models.Model):
    class OnboardingMethod(models.TextChoices):
        IN_PERSON = "IN_PERSON", "In person"
        PHONE = "PHONE", "Phone"
        STAFF_ASSISTED = "STAFF_ASSISTED", "Staff assisted"

    class PrivacyNoticeDeliveryMethod(models.TextChoices):
        PORTAL = "PORTAL", "Client portal"
        PAPER = "PAPER", "Paper copy"
        VERBAL = "VERBAL", "Read and explained verbally"

    class IdentificationType(models.TextChoices):
        NATIONAL_ID = "NATIONAL_ID", "National ID"
        PASSPORT = "PASSPORT", "Passport"
        ALIEN_ID = "ALIEN_ID", "Alien ID"
        REFUGEE_ID = "REFUGEE_ID", "Refugee ID"
        BIRTH_CERTIFICATE = "BIRTH_CERTIFICATE", "Birth Certificate"
        OTHER_GOVERNMENT_ID = "OTHER_GOVERNMENT_ID", "Other Government ID"

    class OccupationStatus(models.TextChoices):
        EMPLOYED = "EMPLOYED", "Employed"
        SELF_EMPLOYED = "SELF_EMPLOYED", "Self-employed"
        BUSINESS_OWNER = "BUSINESS_OWNER", "Business owner"
        STUDENT = "STUDENT", "Student"
        UNEMPLOYED = "UNEMPLOYED", "Unemployed"
        RETIRED = "RETIRED", "Retired"
        HOMEMAKER = "HOMEMAKER", "Homemaker"
        OTHER = "OTHER", "Other"
        NOT_DISCLOSED = "NOT_DISCLOSED", "Not disclosed"

    class PersonalDataSource(models.TextChoices):
        CLIENT = "CLIENT", "Client"
        AUTHORIZED_REPRESENTATIVE = "AUTHORIZED_REPRESENTATIVE", "Authorized representative"
        OTHER = "OTHER", "Other"

    class Gender(models.TextChoices):
        MALE = "MALE", "Male"
        FEMALE = "FEMALE", "Female"
        OTHER = "OTHER", "Other"

    class MaritalStatus(models.TextChoices):
        SINGLE = "SINGLE", "Single"
        MARRIED = "MARRIED", "Married"
        DIVORCED = "DIVORCED", "Divorced"
        WIDOWED = "WIDOWED", "Widowed"

    client = models.OneToOneField(
        "clients.Client",
        on_delete=models.CASCADE,
        related_name="individual_profile",
    )

    first_name = models.CharField(max_length=100, blank=True, default="")

    middle_name = models.CharField(max_length=100, blank=True, default="")

    last_name = models.CharField(max_length=100, blank=True, default="")

    preferred_name = models.CharField(max_length=100, blank=True, default="")
    onboarding_method = models.CharField(
        max_length=30,
        choices=OnboardingMethod.choices,
        blank=True,
        default="",
    )

    identification_type = models.CharField(max_length=40, choices=IdentificationType.choices, blank=True, default="")
    identification_number = models.CharField(max_length=80, blank=True, default="", db_index=True)
    identification_country = models.CharField(max_length=100, blank=True, default="")
    identification_expiry_date = models.DateField(null=True, blank=True)
    identification_document_reference = models.CharField(max_length=255, blank=True, default="")
    verification_method = models.CharField(max_length=100, blank=True, default="")
    verification_notes = models.TextField(blank=True, default="")

    gender = models.CharField(
        max_length=20,
        choices=Gender.choices,
        null=True,
        blank=True,
    )

    occupation = models.CharField(
        max_length=255,
        null=True,
        blank=True,
    )

    occupation_status = models.CharField(max_length=30, choices=OccupationStatus.choices, blank=True, default="")

    business_name = models.CharField(max_length=255, blank=True, default="")

    marital_status = models.CharField(
        max_length=20,
        choices=MaritalStatus.choices,
        null=True,
        blank=True,
    )

    employer = models.CharField(max_length=255, blank=True, default="")

    nationality = models.CharField(max_length=100, blank=True, default="Kenyan")

    citizenship = models.CharField(max_length=100, blank=True, default="Kenya")

    county_of_residence = models.CharField(max_length=100, blank=True, default="")

    physical_address = models.TextField(blank=True, default="")

    postal_address = models.TextField(blank=True, default="")

    preferred_language = models.CharField(max_length=50, blank=True, default="")

    preferred_contact_channel = models.CharField(max_length=20, blank=True, default="")

    disability_or_accessibility_notes = models.TextField(blank=True, default="")

    next_of_kin_name = models.CharField(max_length=255, blank=True, default="")

    next_of_kin_relationship = models.CharField(max_length=100, blank=True, default="")

    next_of_kin_phone = models.CharField(max_length=30, blank=True, default="")

    next_of_kin_email = models.EmailField(blank=True, default="")

    next_of_kin_national_id = models.CharField(max_length=50, blank=True, default="")

    next_of_kin_identification_number = models.CharField(max_length=80, blank=True, default="")

    next_of_kin_physical_address = models.TextField(blank=True, default="")

    next_of_kin_address = models.TextField(blank=True, default="")

    is_minor = models.BooleanField(default=False)
    guardian_name = models.CharField(max_length=255, blank=True, default="")
    guardian_relationship = models.CharField(max_length=100, blank=True, default="")
    guardian_phone = models.CharField(max_length=30, blank=True, default="")
    guardian_email = models.EmailField(blank=True, default="")

    identification_verified = models.BooleanField(default=False)

    identification_verified_at = models.DateTimeField(null=True, blank=True)

    identification_verified_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="verified_individual_client_profiles",
    )

    privacy_notice_version = models.CharField(max_length=50, blank=True, default="")
    privacy_notice_delivery_method = models.CharField(
        max_length=20,
        choices=PrivacyNoticeDeliveryMethod.choices,
        blank=True,
        default="",
    )
    privacy_notice_acknowledged = models.BooleanField(default=False)
    privacy_notice_acknowledged_at = models.DateTimeField(null=True, blank=True)
    privacy_acknowledgement_reference = models.CharField(max_length=255, blank=True, default="")
    privacy_lawful_basis = models.CharField(max_length=255, blank=True, default="")
    privacy_data_sharing_explanation = models.TextField(blank=True, default="")
    privacy_retention_category = models.CharField(max_length=100, blank=True, default="")
    privacy_notice_given_at = models.DateTimeField(null=True, blank=True)
    privacy_notice_given_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="individual_privacy_notices_given",
    )
    personal_data_source = models.CharField(max_length=40, choices=PersonalDataSource.choices, blank=True, default="")

    notes = models.TextField(blank=True, default="")

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        db_table = "individual_clients"
        verbose_name = "Individual Client"
        verbose_name_plural = "Individual Clients"

    def __str__(self):
        return self.client.full_name


class ClientDueDiligence(models.Model):
    class PepStatus(models.TextChoices):
        NOT_CHECKED = "NOT_CHECKED", "Not checked"
        PENDING = "PENDING", "Pending"
        NO_MATCH = "NO_MATCH", "No match"
        POTENTIAL_MATCH = "POTENTIAL_MATCH", "Potential match"
        CONFIRMED_MATCH = "CONFIRMED_MATCH", "Confirmed match"

    class ScreeningStatus(models.TextChoices):
        NOT_CHECKED = "NOT_CHECKED", "Not checked"
        PENDING = "PENDING", "Pending"
        NO_MATCH = "NO_MATCH", "No match"
        POTENTIAL_MATCH = "POTENTIAL_MATCH", "Potential match"
        CONFIRMED_MATCH = "CONFIRMED_MATCH", "Confirmed match"

    class RiskRating(models.TextChoices):
        NOT_ASSESSED = "NOT_ASSESSED", "Not assessed"
        LOW = "LOW", "Low"
        MEDIUM = "MEDIUM", "Medium"
        HIGH = "HIGH", "High"

    client = models.OneToOneField("clients.Client", on_delete=models.CASCADE, related_name="due_diligence")
    acting_for_self = models.BooleanField(null=True, blank=True)
    represented_person = models.CharField(max_length=255, blank=True, default="")
    representation_capacity = models.CharField(max_length=100, blank=True, default="")
    authority_document_reference = models.CharField(max_length=255, blank=True, default="")
    authority_verified = models.BooleanField(default=False)
    authority_verified_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="verified_client_representative_authorities",
    )
    authority_verified_at = models.DateTimeField(null=True, blank=True)
    purpose_and_nature_of_relationship = models.TextField(blank=True, default="")
    pep_status = models.CharField(max_length=30, choices=PepStatus.choices, default=PepStatus.NOT_CHECKED)
    pep_details = models.TextField(blank=True, default="")
    sanctions_screening_status = models.CharField(max_length=30, choices=ScreeningStatus.choices, default=ScreeningStatus.NOT_CHECKED)
    screening_date = models.DateField(null=True, blank=True)
    screening_method = models.CharField(max_length=255, blank=True, default="")
    screening_result = models.TextField(blank=True, default="")
    risk_rating = models.CharField(max_length=30, choices=RiskRating.choices, default=RiskRating.NOT_ASSESSED)
    risk_assessment_reason = models.TextField(blank=True, default="")
    source_of_funds = models.TextField(blank=True, default="")
    source_of_wealth = models.TextField(blank=True, default="")
    enhanced_due_diligence_required = models.BooleanField(default=False)
    enhanced_due_diligence_reason = models.TextField(blank=True, default="")
    reviewed_by = models.ForeignKey("users.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="reviewed_client_due_diligence_records")
    reviewed_at = models.DateTimeField(null=True, blank=True)
    next_review_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "client_due_diligence"
        verbose_name = "Client Due Diligence"
        verbose_name_plural = "Client Due Diligence Records"

    def __str__(self):
        return f"Due diligence - {self.client.full_name}"
