from django.core.exceptions import ValidationError
from django.db import models


class ClientSectorProfile(models.Model):
    class Sector(models.TextChoices):
        EDUCATION = "EDUCATION", "Education"
        FINANCIAL_SERVICES = "FINANCIAL_SERVICES", "Financial Services"
        HEALTHCARE = "HEALTHCARE", "Healthcare"
        RELIGION_FAITH = "RELIGION_FAITH", "Religion / Faith"
        INSURANCE = "INSURANCE", "Insurance"
        PROFESSIONAL_REGULATED_BODY = "PROFESSIONAL_REGULATED_BODY", "Professional Regulated Body"
        REAL_ESTATE = "REAL_ESTATE", "Real Estate"
        OTHER_REGULATED_SECTOR = "OTHER_REGULATED_SECTOR", "Other Regulated Sector"

    client = models.ForeignKey("clients.Client", on_delete=models.CASCADE, related_name="sector_profiles")
    sector = models.CharField(max_length=50, choices=Sector.choices)
    description = models.CharField(max_length=255, blank=True, default="")
    regulator = models.CharField(max_length=255, blank=True, default="")
    registration_or_licence_reference = models.CharField(max_length=150, blank=True, default="")
    verification_status = models.CharField(max_length=30, default="NOT_VERIFIED")
    verification_source = models.CharField(max_length=255, blank=True, default="")
    verification_date = models.DateField(null=True, blank=True)
    verified_by = models.ForeignKey("users.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="verified_client_sectors")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "client_sector_profiles"
        constraints = [models.UniqueConstraint(fields=["client", "sector"], name="unique_client_sector")]


class ClientPrivacyRecord(models.Model):
    class LawfulBasis(models.TextChoices):
        CONSENT = "CONSENT", "Consent"
        CONTRACTUAL_NECESSITY = "CONTRACTUAL_NECESSITY", "Contractual necessity"
        LEGAL_OBLIGATION = "LEGAL_OBLIGATION", "Legal obligation"
        PUBLIC_INTEREST = "PUBLIC_INTEREST", "Public interest"
        LEGITIMATE_INTERESTS = "LEGITIMATE_INTERESTS", "Legitimate interests"
        VITAL_INTERESTS = "VITAL_INTERESTS", "Vital interests"
        MULTIPLE_APPLICABLE_BASES = "MULTIPLE_APPLICABLE_BASES", "Multiple applicable lawful bases"

    client = models.OneToOneField("clients.Client", on_delete=models.CASCADE, related_name="privacy")
    lawful_basis = models.CharField(max_length=50, choices=LawfulBasis.choices)
    privacy_notice_version = models.CharField(max_length=50)
    privacy_notice_delivered = models.BooleanField(default=False)
    delivery_method = models.CharField(max_length=30, blank=True, default="")
    delivered_at = models.DateTimeField(null=True, blank=True)
    delivered_by = models.ForeignKey("users.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="delivered_client_privacy_notices")
    acknowledged = models.BooleanField(default=False)
    acknowledgement_reference = models.CharField(max_length=255, blank=True, default="")
    data_source = models.CharField(max_length=100, blank=True, default="")
    data_sharing_notice = models.TextField(blank=True, default="")
    retention_category = models.CharField(max_length=100, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "client_privacy_records"


class ClientBeneficialOwner(models.Model):
    class OwnershipMode(models.TextChoices):
        DIRECT = "DIRECT", "Direct"
        INDIRECT = "INDIRECT", "Indirect"
        CONTROL = "CONTROL", "Control without ownership percentage"
        SENIOR_MANAGING_OFFICIAL = "SENIOR_MANAGING_OFFICIAL", "Senior managing official identified for CDD"

    client = models.ForeignKey("clients.Client", on_delete=models.CASCADE, related_name="beneficial_owners")
    linked_client = models.ForeignKey("clients.Client", on_delete=models.SET_NULL, null=True, blank=True, related_name="beneficial_owner_roles")
    full_legal_name = models.CharField(max_length=255)
    nationality = models.CharField(max_length=100, blank=True, default="")
    date_of_birth = models.DateField(null=True, blank=True)
    identifier_type = models.CharField(max_length=40, blank=True, default="")
    identifier = models.CharField(max_length=100, blank=True, default="")
    kra_pin = models.CharField(max_length=50, blank=True, default="")
    residential_address = models.TextField(blank=True, default="")
    business_address = models.TextField(blank=True, default="")
    phone = models.CharField(max_length=30, blank=True, default="")
    email = models.EmailField(blank=True, default="")
    occupation = models.CharField(max_length=150, blank=True, default="")
    ownership_percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    voting_percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    capital_or_profit_percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    ownership_mode = models.CharField(max_length=40, choices=OwnershipMode.choices)
    nature_of_ownership_or_control = models.TextField(blank=True, default="")
    can_appoint_or_remove_management = models.BooleanField(default=False)
    has_significant_influence_or_control = models.BooleanField(default=False)
    effective_control_description = models.TextField(blank=True, default="")
    date_became_owner = models.DateField(null=True, blank=True)
    date_ceased = models.DateField(null=True, blank=True)
    evidence_reference = models.CharField(max_length=255, blank=True, default="")
    verification_status = models.CharField(max_length=30, default="NOT_VERIFIED")
    verification_date = models.DateField(null=True, blank=True)
    verified_by = models.ForeignKey("users.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="verified_beneficial_owners")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "client_beneficial_owners"
        indexes = [models.Index(fields=["client", "full_legal_name"]), models.Index(fields=["identifier"])]

    def clean(self):
        for field in ("ownership_percentage", "voting_percentage", "capital_or_profit_percentage"):
            value = getattr(self, field)
            if value is not None and not 0 <= value <= 100:
                raise ValidationError({field: "Percentage must be between 0 and 100."})
        if self.verification_status == "VERIFIED" and not (self.verification_date and self.evidence_reference and self.verified_by_id):
            raise ValidationError("Verified ownership requires evidence, date, and verifier.")


class EducationInstitutionProfile(models.Model):
    class Regime(models.TextChoices):
        BASIC_EDUCATION = "BASIC_EDUCATION", "Basic Education Institution"
        UNIVERSITY = "UNIVERSITY", "University / University-Level Institution"
        TVET = "TVET", "Technical & Vocational Education and Training (TVET)"
        TEACHER_EDUCATION = "TEACHER_EDUCATION", "Teacher Education"
        ADULT_CONTINUING_EDUCATION = "ADULT_CONTINUING_EDUCATION", "Adult & Continuing Education"
        OTHER_RECOGNIZED_EDUCATION = "OTHER_RECOGNIZED_EDUCATION", "Other Recognized Education Institution"
    class Ownership(models.TextChoices):
        PUBLIC = "PUBLIC", "Public"
        PRIVATE = "PRIVATE", "Private"
        FOREIGN = "FOREIGN", "Foreign"
        OTHER = "OTHER", "Other / requires review"
    class UniversityCategory(models.TextChoices):
        PUBLIC_UNIVERSITY = "PUBLIC_UNIVERSITY", "Public University"
        PUBLIC_UNIVERSITY_CONSTITUENT_COLLEGE = "PUBLIC_UNIVERSITY_CONSTITUENT_COLLEGE", "Public University Constituent College"
        CHARTERED_PRIVATE_UNIVERSITY = "CHARTERED_PRIVATE_UNIVERSITY", "Chartered Private University"
        PRIVATE_UNIVERSITY_CONSTITUENT_COLLEGE = "PRIVATE_UNIVERSITY_CONSTITUENT_COLLEGE", "Private University Constituent College"
        LETTER_OF_INTERIM_AUTHORITY = "LETTER_OF_INTERIM_AUTHORITY", "Institution with Letter of Interim Authority"
        FOREIGN_UNIVERSITY = "FOREIGN_UNIVERSITY", "Foreign University"
        FOREIGN_UNIVERSITY_CAMPUS = "FOREIGN_UNIVERSITY_CAMPUS", "Foreign University Campus"
        OTHER_CUE_RECOGNIZED = "OTHER_CUE_RECOGNIZED", "Other CUE-Recognized Institution"
    class TVETCategory(models.TextChoices):
        VOCATIONAL_TRAINING_CENTRE = "VOCATIONAL_TRAINING_CENTRE", "Vocational Training Centre"
        TECHNICAL_VOCATIONAL_COLLEGE = "TECHNICAL_VOCATIONAL_COLLEGE", "Technical and Vocational College"
        TECHNICAL_TRAINER_COLLEGE = "TECHNICAL_TRAINER_COLLEGE", "Technical Trainer College"
        NATIONAL_POLYTECHNIC = "NATIONAL_POLYTECHNIC", "National Polytechnic"
        OTHER_STATUTORY_TVET = "OTHER_STATUTORY_TVET", "Other Statutory TVET Institution"

    client = models.OneToOneField("clients.Client", on_delete=models.CASCADE, related_name="education_profile")
    education_regime = models.CharField(max_length=50, choices=Regime.choices)
    institution_official_name = models.CharField(max_length=255)
    ownership = models.CharField(max_length=20, choices=Ownership.choices)
    operator_legal_name = models.CharField(max_length=255, blank=True, default="")
    registration_number = models.CharField(max_length=120, blank=True, default="")
    registration_status = models.CharField(max_length=50, default="NOT_VERIFIED")
    registration_date = models.DateField(null=True, blank=True)
    regulator = models.CharField(max_length=255, blank=True, default="")
    county = models.CharField(max_length=100, blank=True, default="")
    physical_location = models.TextField(blank=True, default="")
    postal_or_electronic_address = models.TextField(blank=True, default="")
    education_levels = models.JSONField(default=list, blank=True)
    institution_form = models.CharField(max_length=100, blank=True, default="")
    proprietor_or_operator = models.CharField(max_length=255, blank=True, default="")
    governance_body = models.CharField(max_length=255, blank=True, default="")
    head_of_institution = models.CharField(max_length=255, blank=True, default="")
    sponsor = models.CharField(max_length=255, blank=True, default="")
    institution_code = models.CharField(max_length=100, blank=True, default="")
    university_category = models.CharField(max_length=80, choices=UniversityCategory.choices, blank=True, default="")
    cue_reference = models.CharField(max_length=150, blank=True, default="")
    charter_reference = models.CharField(max_length=150, blank=True, default="")
    charter_date = models.DateField(null=True, blank=True)
    interim_authority_reference = models.CharField(max_length=150, blank=True, default="")
    interim_authority_date = models.DateField(null=True, blank=True)
    interim_authority_expiry = models.DateField(null=True, blank=True)
    establishing_instrument = models.CharField(max_length=255, blank=True, default="")
    parent_university = models.CharField(max_length=255, blank=True, default="")
    foreign_country = models.CharField(max_length=100, blank=True, default="")
    tvet_category = models.CharField(max_length=80, choices=TVETCategory.choices, blank=True, default="")
    licence_expiry = models.DateField(null=True, blank=True)
    accredited_programmes = models.TextField(blank=True, default="")
    awarding_or_examining_body = models.CharField(max_length=255, blank=True, default="")
    main_campus = models.CharField(max_length=255, blank=True, default="")
    additional_campuses = models.JSONField(default=list, blank=True)
    other_institution_type = models.CharField(max_length=255, blank=True, default="")
    registration_document_reference = models.CharField(max_length=255, blank=True, default="")
    verification_status = models.CharField(max_length=30, default="NOT_VERIFIED")
    verification_source = models.CharField(max_length=255, blank=True, default="")
    verification_date = models.DateField(null=True, blank=True)
    verified_by = models.ForeignKey("users.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="verified_education_profiles")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "education_institution_profiles"
        indexes = [models.Index(fields=["education_regime", "registration_number"])]

    def clean(self):
        if self.ownership == self.Ownership.PRIVATE and not self.operator_legal_name:
            raise ValidationError({"operator_legal_name": "Identify the private institution's legal proprietor/operator."})
        if self.education_regime == self.Regime.BASIC_EDUCATION and not self.education_levels:
            raise ValidationError({"education_levels": "Select at least one education level."})
        if self.education_regime == self.Regime.UNIVERSITY:
            if not self.university_category:
                raise ValidationError({"university_category": "University category is required."})
            if self.university_category in {self.UniversityCategory.PUBLIC_UNIVERSITY_CONSTITUENT_COLLEGE, self.UniversityCategory.PRIVATE_UNIVERSITY_CONSTITUENT_COLLEGE} and not self.parent_university:
                raise ValidationError({"parent_university": "Parent university is required for a constituent college."})
        if self.education_regime == self.Regime.TVET and not self.tvet_category:
            raise ValidationError({"tvet_category": "TVET category is required."})
        if self.verification_status == "VERIFIED" and not (self.verification_source and self.verification_date and self.verified_by_id and self.registration_document_reference):
            raise ValidationError("Verified registration requires source, evidence, date, and verifier.")


class EducationCurriculum(models.Model):
    class Framework(models.TextChoices):
        KENYA_CBE_CBC = "KENYA_CBE_CBC", "Kenya Competency-Based Education (CBE/CBC)"
        INTERNATIONAL_FOREIGN = "INTERNATIONAL_FOREIGN", "International / Foreign Curriculum"
        MULTIPLE = "MULTIPLE", "Multiple Curriculum Frameworks"
        SPECIAL_NEEDS_ADAPTED = "SPECIAL_NEEDS_ADAPTED", "Special Needs / Adapted Curriculum"
        OTHER_APPROVED = "OTHER_APPROVED", "Other Approved Curriculum"

    education_profile = models.ForeignKey(EducationInstitutionProfile, on_delete=models.CASCADE, related_name="curricula")
    framework = models.CharField(max_length=40, choices=Framework.choices)
    curriculum_name = models.CharField(max_length=255, blank=True, default="")
    awarding_or_development_body = models.CharField(max_length=255, blank=True, default="")
    country_or_framework = models.CharField(max_length=150, blank=True, default="")
    approval_or_recognition_reference = models.CharField(max_length=255, blank=True, default="")
    education_levels = models.JSONField(default=list, blank=True)

    class Meta:
        db_table = "education_curricula"

    def clean(self):
        if self.framework == self.Framework.INTERNATIONAL_FOREIGN and not (self.curriculum_name and self.awarding_or_development_body and self.country_or_framework):
            raise ValidationError("Foreign curriculum requires its name, responsible body, and country/framework.")
