from django.db import models


class RegistrationStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Active"
    INACTIVE = "INACTIVE", "Inactive"
    DORMANT = "DORMANT", "Dormant"
    SUSPENDED = "SUSPENDED", "Suspended"
    DISSOLVED = "DISSOLVED", "Dissolved"
    LEGACY_REQUIRES_REVIEW = "LEGACY_REQUIRES_REVIEW", "Legacy - requires review"
    UNKNOWN = "UNKNOWN", "Unknown"


class ClientRepresentative(models.Model):
    class RepresentativeCategory(models.TextChoices):
        PROPRIETOR = "PROPRIETOR", "Proprietor"
        PARTNER = "PARTNER", "Partner"
        DESIGNATED_PARTNER = "DESIGNATED_PARTNER", "Designated Partner"
        DIRECTOR = "DIRECTOR", "Director"
        COMPANY_SECRETARY = "COMPANY_SECRETARY", "Company Secretary"
        TRUSTEE = "TRUSTEE", "Trustee"
        EXECUTOR = "EXECUTOR", "Executor"
        ADMINISTRATOR = "ADMINISTRATOR", "Administrator"
        SOCIETY_OFFICIAL = "SOCIETY_OFFICIAL", "Society Official"
        PBO_OFFICIAL = "PBO_OFFICIAL", "PBO Official"
        COOPERATIVE_OFFICER = "COOPERATIVE_OFFICER", "Co-operative Officer"
        ACCOUNTING_OFFICER = "ACCOUNTING_OFFICER", "Accounting Officer"
        ATTORNEY_GENERAL_REPRESENTATIVE = (
            "ATTORNEY_GENERAL_REPRESENTATIVE",
            "Attorney-General Representative",
        )
        COUNTY_ATTORNEY = "COUNTY_ATTORNEY", "County Attorney"
        AUTHORIZED_PUBLIC_OFFICER = "AUTHORIZED_PUBLIC_OFFICER", "Authorized Public Officer"
        AUTHORIZED_AGENT = "AUTHORIZED_AGENT", "Authorized Agent"
        OTHER = "OTHER", "Other"

    client = models.ForeignKey(
        "clients.Client",
        on_delete=models.CASCADE,
        related_name="representatives",
    )
    full_legal_name = models.CharField(max_length=255)
    representative_category = models.CharField(
        max_length=80,
        choices=RepresentativeCategory.choices,
        default=RepresentativeCategory.AUTHORIZED_AGENT,
    )
    role_title = models.CharField(max_length=255, blank=True, default="")
    national_id_or_passport = models.CharField(max_length=100, blank=True, default="")
    email = models.EmailField(blank=True, default="")
    telephone = models.CharField(max_length=30, blank=True, default="")
    postal_address = models.TextField(blank=True, default="")
    physical_address = models.TextField(blank=True, default="")
    authority_type = models.CharField(max_length=100, blank=True, default="")
    authority_document_reference = models.CharField(max_length=150, blank=True, default="")
    authority_start_date = models.DateField(null=True, blank=True)
    authority_end_date = models.DateField(null=True, blank=True)
    is_primary = models.BooleanField(default=False)
    is_portal_contact = models.BooleanField(default=False)
    is_litigation_representative = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)
    verification_date = models.DateTimeField(null=True, blank=True)
    verified_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="verified_client_representatives",
    )
    notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "client_representatives"
        indexes = [
            models.Index(fields=["client", "representative_category"]),
            models.Index(fields=["client", "is_primary"]),
            models.Index(fields=["client", "is_litigation_representative"]),
        ]

    def __str__(self):
        return f"{self.full_legal_name} ({self.representative_category})"


class SoleProprietorshipClient(models.Model):
    client = models.OneToOneField(
        "clients.Client",
        on_delete=models.CASCADE,
        related_name="sole_proprietorship_profile",
    )
    registered_business_name = models.CharField(max_length=255)
    business_registration_number = models.CharField(max_length=100, blank=True, default="")
    registration_date = models.DateField(null=True, blank=True)
    proprietor_name = models.CharField(max_length=255)
    proprietor_identifier = models.CharField(max_length=100, blank=True, default="")
    proprietor_kra_pin = models.CharField(max_length=50, blank=True, default="")
    business_kra_pin = models.CharField(max_length=50, blank=True, default="")
    trading_name = models.CharField(max_length=255, blank=True, default="")
    business_sector = models.CharField(max_length=150, blank=True, default="")
    registered_address = models.TextField(blank=True, default="")
    operational_address = models.TextField(blank=True, default="")
    status = models.CharField(
        max_length=50,
        choices=RegistrationStatus.choices,
        default=RegistrationStatus.UNKNOWN,
    )
    registration_verified = models.BooleanField(default=False)
    registration_verified_at = models.DateTimeField(null=True, blank=True)
    registration_verified_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="verified_sole_proprietorship_clients",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "sole_proprietorship_clients"
        indexes = [
            models.Index(fields=["business_registration_number"]),
            models.Index(fields=["business_sector"]),
        ]

    def __str__(self):
        return f"{self.proprietor_name} t/a {self.registered_business_name}"


class LimitedLiabilityPartnershipClient(models.Model):
    class LLPStatus(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        DORMANT = "DORMANT", "Dormant"
        UNDER_RECEIVERSHIP = "UNDER_RECEIVERSHIP", "Under Receivership"
        DISSOLVED = "DISSOLVED", "Dissolved"
        FOREIGN = "FOREIGN", "Foreign"
        UNKNOWN = "UNKNOWN", "Unknown"

    client = models.OneToOneField(
        "clients.Client",
        on_delete=models.CASCADE,
        related_name="llp_profile",
    )
    registered_name = models.CharField(max_length=255)
    llp_registration_number = models.CharField(max_length=100, db_index=True)
    kra_pin = models.CharField(max_length=50, blank=True, default="")
    registration_date = models.DateField(null=True, blank=True)
    country_of_registration = models.CharField(max_length=100, default="Kenya")
    registered_office = models.TextField(blank=True, default="")
    principal_business_address = models.TextField(blank=True, default="")
    sector = models.CharField(max_length=150, blank=True, default="")
    status = models.CharField(max_length=50, choices=LLPStatus.choices, default=LLPStatus.UNKNOWN)
    compliance_notes = models.TextField(blank=True, default="")
    registration_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "llp_clients"
        indexes = [
            models.Index(fields=["llp_registration_number"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return self.registered_name


class LLPPartner(models.Model):
    class PartnerKind(models.TextChoices):
        INDIVIDUAL = "INDIVIDUAL", "Individual"
        ENTITY = "ENTITY", "Entity"

    llp = models.ForeignKey(
        LimitedLiabilityPartnershipClient,
        on_delete=models.CASCADE,
        related_name="partners",
    )
    partner_kind = models.CharField(max_length=20, choices=PartnerKind.choices)
    linked_client = models.ForeignKey(
        "clients.Client",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="llp_partner_roles",
    )
    legal_name = models.CharField(max_length=255)
    identifier = models.CharField(max_length=100, blank=True, default="")
    kra_pin = models.CharField(max_length=50, blank=True, default="")
    address = models.TextField(blank=True, default="")
    is_designated_partner = models.BooleanField(default=False)
    authority_to_instruct = models.BooleanField(default=False)
    date_joined = models.DateField(null=True, blank=True)
    date_ceased = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "llp_partners"
        indexes = [
            models.Index(fields=["llp", "is_active"]),
            models.Index(fields=["llp", "is_designated_partner"]),
        ]

    def __str__(self):
        return self.legal_name


class CooperativeClient(models.Model):
    class CooperativeSubtype(models.TextChoices):
        PRIMARY_COOPERATIVE = "PRIMARY_COOPERATIVE", "Primary Co-operative"
        COOPERATIVE_UNION = "COOPERATIVE_UNION", "Co-operative Union"
        APEX_COOPERATIVE = "APEX_COOPERATIVE", "Apex Co-operative"
        SACCO = "SACCO", "SACCO"
        OTHER_COOPERATIVE = "OTHER_COOPERATIVE", "Other Co-operative"

    client = models.OneToOneField(
        "clients.Client",
        on_delete=models.CASCADE,
        related_name="cooperative_profile",
    )
    registered_name = models.CharField(max_length=255)
    registration_number = models.CharField(max_length=100, db_index=True)
    subtype = models.CharField(max_length=50, choices=CooperativeSubtype.choices)
    registration_date = models.DateField(null=True, blank=True)
    kra_pin = models.CharField(max_length=50, blank=True, default="")
    registered_office = models.TextField(blank=True, default="")
    area_of_operation = models.CharField(max_length=255, blank=True, default="")
    activity_sector = models.CharField(max_length=150, blank=True, default="")
    regulator_name = models.CharField(max_length=255, blank=True, default="")
    license_number = models.CharField(max_length=100, blank=True, default="")
    license_status = models.CharField(max_length=100, blank=True, default="")
    status = models.CharField(
        max_length=50,
        choices=RegistrationStatus.choices,
        default=RegistrationStatus.UNKNOWN,
    )
    compliance_notes = models.TextField(blank=True, default="")
    registration_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "cooperative_clients"
        indexes = [
            models.Index(fields=["registration_number"]),
            models.Index(fields=["subtype"]),
        ]

    def __str__(self):
        return self.registered_name


class SocietyAssociationClient(models.Model):
    class RegistrationStatusChoice(models.TextChoices):
        REGISTERED = "REGISTERED", "Registered"
        UNREGISTERED = "UNREGISTERED", "Unregistered"
        EXEMPTED = "EXEMPTED", "Exempted"
        UNKNOWN = "UNKNOWN", "Unknown"

    client = models.OneToOneField(
        "clients.Client",
        on_delete=models.CASCADE,
        related_name="society_association_profile",
    )
    legal_name = models.CharField(max_length=255)
    common_name = models.CharField(max_length=255, blank=True, default="")
    registration_status = models.CharField(
        max_length=50,
        choices=RegistrationStatusChoice.choices,
        default=RegistrationStatusChoice.UNKNOWN,
    )
    registration_number = models.CharField(max_length=100, blank=True, default="")
    registration_authority = models.CharField(max_length=255, blank=True, default="")
    constitution_reference = models.CharField(max_length=150, blank=True, default="")
    formation_date = models.DateField(null=True, blank=True)
    registration_date = models.DateField(null=True, blank=True)
    objectives = models.TextField(blank=True, default="")
    sector = models.CharField(max_length=150, blank=True, default="")
    principal_office = models.TextField(blank=True, default="")
    litigation_authority_reference = models.CharField(max_length=150, blank=True, default="")
    status = models.CharField(
        max_length=50,
        choices=RegistrationStatus.choices,
        default=RegistrationStatus.UNKNOWN,
    )
    registration_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "society_association_clients"
        indexes = [
            models.Index(fields=["registration_number"]),
            models.Index(fields=["registration_status"]),
        ]

    def __str__(self):
        return self.legal_name


class NonProfitOrganizationClient(models.Model):
    class NonProfitForm(models.TextChoices):
        PUBLIC_BENEFIT_ORGANIZATION = "PUBLIC_BENEFIT_ORGANIZATION", "Public Benefit Organization"
        LEGACY_NGO_OR_TRANSITIONAL = "LEGACY_NGO_OR_TRANSITIONAL", "Legacy NGO or Transitional"
        COMPANY_LIMITED_BY_GUARANTEE = "COMPANY_LIMITED_BY_GUARANTEE", "Company Limited by Guarantee"
        CHARITABLE_TRUST = "CHARITABLE_TRUST", "Charitable Trust"
        SOCIETY = "SOCIETY", "Society"
        FAITH_BASED_ORGANIZATION = "FAITH_BASED_ORGANIZATION", "Faith Based Organization"
        OTHER_NON_PROFIT = "OTHER_NON_PROFIT", "Other Non-Profit"

    client = models.OneToOneField(
        "clients.Client",
        on_delete=models.CASCADE,
        related_name="nonprofit_profile",
    )
    registered_name = models.CharField(max_length=255)
    registration_number = models.CharField(max_length=100, blank=True, default="")
    registration_authority = models.CharField(max_length=255, blank=True, default="")
    nonprofit_form = models.CharField(max_length=80, choices=NonProfitForm.choices)
    canonical_legal_form = models.CharField(max_length=80, blank=True, default="")
    pbo_or_ngo_status = models.CharField(max_length=100, blank=True, default="")
    registration_date = models.DateField(null=True, blank=True)
    objectives = models.TextField(blank=True, default="")
    sector = models.CharField(max_length=150, blank=True, default="")
    operational_scope = models.TextField(blank=True, default="")
    funding_compliance_notes = models.TextField(blank=True, default="")
    status = models.CharField(
        max_length=50,
        choices=RegistrationStatus.choices,
        default=RegistrationStatus.UNKNOWN,
    )
    registration_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "nonprofit_clients"
        indexes = [
            models.Index(fields=["registration_number"]),
            models.Index(fields=["nonprofit_form"]),
        ]

    def __str__(self):
        return self.registered_name


class PublicEntityClient(models.Model):
    class PublicEntitySubtype(models.TextChoices):
        NATIONAL_GOVERNMENT = "NATIONAL_GOVERNMENT", "National Government"
        COUNTY_GOVERNMENT = "COUNTY_GOVERNMENT", "County Government"
        MINISTRY_OR_DEPARTMENT = "MINISTRY_OR_DEPARTMENT", "Ministry or Department"
        CONSTITUTIONAL_COMMISSION = "CONSTITUTIONAL_COMMISSION", "Constitutional Commission"
        INDEPENDENT_OFFICE = "INDEPENDENT_OFFICE", "Independent Office"
        STATE_CORPORATION = "STATE_CORPORATION", "State Corporation"
        COUNTY_ENTITY = "COUNTY_ENTITY", "County Entity"
        PUBLIC_UNIVERSITY = "PUBLIC_UNIVERSITY", "Public University"
        OTHER_STATUTORY_BODY = "OTHER_STATUTORY_BODY", "Other Statutory Body"

    client = models.OneToOneField(
        "clients.Client",
        on_delete=models.CASCADE,
        related_name="public_entity_profile",
    )
    official_name = models.CharField(max_length=255)
    subtype = models.CharField(max_length=80, choices=PublicEntitySubtype.choices)
    enabling_instrument = models.CharField(max_length=255, blank=True, default="")
    parent_ministry_or_county = models.CharField(max_length=255, blank=True, default="")
    legal_capacity_notes = models.TextField(blank=True, default="")
    official_address = models.TextField(blank=True, default="")
    legal_department_contact = models.CharField(max_length=255, blank=True, default="")
    statutory_representative = models.CharField(max_length=255, blank=True, default="")
    jurisdiction_level = models.CharField(max_length=100, blank=True, default="")
    status = models.CharField(
        max_length=50,
        choices=RegistrationStatus.choices,
        default=RegistrationStatus.UNKNOWN,
    )
    verification_notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "public_entity_clients"
        indexes = [
            models.Index(fields=["subtype"]),
            models.Index(fields=["jurisdiction_level"]),
        ]

    def __str__(self):
        return self.official_name


class InternationalOrganizationClient(models.Model):
    class OrganizationType(models.TextChoices):
        INTERGOVERNMENTAL = "INTERGOVERNMENTAL", "Intergovernmental Organization"
        TREATY_BODY = "TREATY_BODY", "Treaty Body"
        DIPLOMATIC_OR_MISSION_ENTITY = "DIPLOMATIC_OR_MISSION_ENTITY", "Diplomatic or Mission Entity"
        OTHER = "OTHER", "Other"

    client = models.OneToOneField(
        "clients.Client",
        on_delete=models.CASCADE,
        related_name="international_organization_profile",
    )
    official_name = models.CharField(max_length=255)
    organization_type = models.CharField(max_length=80, choices=OrganizationType.choices)
    founding_instrument = models.CharField(max_length=255, blank=True, default="")
    headquarters_country = models.CharField(max_length=100, blank=True, default="")
    kenya_recognition_details = models.TextField(blank=True, default="")
    privileges_immunities_status = models.TextField(blank=True, default="")
    kenya_office_address = models.TextField(blank=True, default="")
    status = models.CharField(
        max_length=50,
        choices=RegistrationStatus.choices,
        default=RegistrationStatus.UNKNOWN,
    )
    verification_notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "international_organization_clients"
        indexes = [
            models.Index(fields=["organization_type"]),
        ]

    def __str__(self):
        return self.official_name
