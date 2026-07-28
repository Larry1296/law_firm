import re
from datetime import date

from django.utils import timezone
from rest_framework import serializers

from apps.clients.models import (
    Client,
    ClientDueDiligence,
    CommunicationChannel,
    IndividualClient,
)
from apps.clients.serializers.admin.admin_client_base_create_serializer import (
    AdminClientBaseCreateSerializer,
)
from apps.users.models import User


class IndividualAdminCreateClientSerializer(AdminClientBaseCreateSerializer):
    IDENTIFICATION_TYPES = tuple(value for value, _ in IndividualClient.IdentificationType.choices)
    OCCUPATION_STATUSES = tuple(value for value, _ in IndividualClient.OccupationStatus.choices)
    PERSONAL_DATA_SOURCES = tuple(value for value, _ in IndividualClient.PersonalDataSource.choices)

    full_name = serializers.CharField(max_length=255)
    access_type = serializers.ChoiceField(
        choices=Client.AccessType.choices,
        default=Client.AccessType.ASSISTED,
    )
    identification_type = serializers.ChoiceField(choices=IndividualClient.IdentificationType.choices, required=False)
    identification_number = serializers.CharField(max_length=80, required=False, allow_blank=True)
    identification_country = serializers.CharField(max_length=100, required=False, allow_blank=True)
    identification_expiry_date = serializers.DateField(required=False, allow_null=True)
    identification_document_reference = serializers.CharField(max_length=255, required=False, allow_blank=True)
    identification_verified = serializers.BooleanField(required=False, default=False)
    verification_method = serializers.ChoiceField(
        choices=(
            ("ORIGINAL_INSPECTED", "Original document inspected"),
            ("CERTIFIED_COPY", "Certified copy inspected"),
            ("OFFICIAL_ELECTRONIC_SOURCE", "Official electronic source"),
        ),
        required=False,
        allow_blank=True,
    )
    verification_notes = serializers.CharField(required=False, allow_blank=True)
    first_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    middle_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    preferred_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    onboarding_method = serializers.ChoiceField(
        choices=IndividualClient.OnboardingMethod.choices,
        required=True,
    )
    gender = serializers.ChoiceField(choices=IndividualClient.Gender.choices, required=False, allow_null=True, allow_blank=True)
    occupation_status = serializers.ChoiceField(choices=IndividualClient.OccupationStatus.choices, required=False, allow_blank=True)
    occupation = serializers.CharField(max_length=255, required=False, allow_blank=True)
    employer = serializers.CharField(max_length=255, required=False, allow_blank=True)
    business_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    marital_status = serializers.ChoiceField(choices=IndividualClient.MaritalStatus.choices, required=False, allow_null=True, allow_blank=True)
    nationality = serializers.CharField(max_length=100, required=False, allow_blank=True)
    citizenship = serializers.CharField(max_length=100, required=False, allow_blank=True)
    postal_address = serializers.CharField(required=False, allow_blank=True)
    preferred_language = serializers.CharField(max_length=50, required=False, allow_blank=True)
    preferred_contact_channel = serializers.ChoiceField(choices=CommunicationChannel.choices, required=False, allow_blank=True)
    disability_or_accessibility_notes = serializers.CharField(required=False, allow_blank=True)
    guardian_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    guardian_relationship = serializers.CharField(max_length=100, required=False, allow_blank=True)
    guardian_phone = serializers.CharField(max_length=30, required=False, allow_blank=True)
    guardian_email = serializers.EmailField(required=False, allow_blank=True, allow_null=True)
    next_of_kin_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    next_of_kin_relationship = serializers.CharField(max_length=100, required=False, allow_blank=True)
    next_of_kin_phone = serializers.CharField(max_length=30, required=False, allow_blank=True)
    next_of_kin_email = serializers.EmailField(required=False, allow_blank=True, allow_null=True)
    next_of_kin_identification_number = serializers.CharField(max_length=80, required=False, allow_blank=True)
    next_of_kin_address = serializers.CharField(required=False, allow_blank=True)
    privacy_notice_version = serializers.CharField(max_length=50, required=False, allow_blank=True)
    privacy_notice_delivery_method = serializers.ChoiceField(
        choices=IndividualClient.PrivacyNoticeDeliveryMethod.choices,
        required=False,
        allow_blank=True,
    )
    privacy_notice_acknowledged = serializers.BooleanField(required=False, default=False)
    privacy_acknowledgement_reference = serializers.CharField(max_length=255, required=False, allow_blank=True)
    privacy_lawful_basis = serializers.CharField(max_length=255, required=False, allow_blank=True)
    privacy_data_sharing_explanation = serializers.CharField(required=False, allow_blank=True)
    privacy_retention_category = serializers.CharField(max_length=100, required=False, allow_blank=True)
    personal_data_source = serializers.ChoiceField(choices=IndividualClient.PersonalDataSource.choices, required=False, allow_blank=True)
    acting_for_self = serializers.BooleanField(required=True)
    represented_person = serializers.CharField(max_length=255, required=False, allow_blank=True)
    representation_capacity = serializers.CharField(max_length=100, required=False, allow_blank=True)
    authority_document_reference = serializers.CharField(max_length=255, required=False, allow_blank=True)
    authority_verified = serializers.BooleanField(required=False, default=False)
    purpose_and_nature_of_relationship = serializers.CharField(required=True, allow_blank=False)
    pep_status = serializers.ChoiceField(
        choices=ClientDueDiligence.PepStatus.choices,
        default=ClientDueDiligence.PepStatus.PENDING,
    )
    pep_details = serializers.CharField(required=False, allow_blank=True)
    sanctions_screening_status = serializers.ChoiceField(
        choices=ClientDueDiligence.ScreeningStatus.choices,
        default=ClientDueDiligence.ScreeningStatus.PENDING,
    )
    screening_date = serializers.DateField(required=False, allow_null=True)
    screening_method = serializers.CharField(max_length=255, required=False, allow_blank=True)
    screening_result = serializers.CharField(required=False, allow_blank=True)
    risk_rating = serializers.ChoiceField(
        choices=ClientDueDiligence.RiskRating.choices,
        default=ClientDueDiligence.RiskRating.NOT_ASSESSED,
    )
    source_of_funds = serializers.CharField(required=False, allow_blank=True)
    source_of_wealth = serializers.CharField(required=False, allow_blank=True)
    risk_assessment_reason = serializers.CharField(required=False, allow_blank=True)
    enhanced_due_diligence_required = serializers.BooleanField(required=False, default=False)
    enhanced_due_diligence_reason = serializers.CharField(required=False, allow_blank=True)
    next_review_date = serializers.DateField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True)

    # Compatibility inputs retained while the frontend/API migrate.
    national_id = serializers.CharField(max_length=50, required=False, allow_blank=True)
    passport_number = serializers.CharField(max_length=50, required=False, allow_blank=True)
    country = serializers.CharField(max_length=100, required=False, allow_blank=True)
    county_or_region = serializers.CharField(max_length=100, required=False, allow_blank=True)
    city_or_town = serializers.CharField(max_length=100, required=False, allow_blank=True)
    street_or_locality = serializers.CharField(max_length=255, required=False, allow_blank=True)
    address_description = serializers.CharField(required=False, allow_blank=True)
    county = serializers.CharField(max_length=100, required=False, allow_blank=True)
    city = serializers.CharField(max_length=100, required=False, allow_blank=True)
    street = serializers.CharField(max_length=255, required=False, allow_blank=True)
    full_address = serializers.CharField(required=False, allow_blank=True)
    next_of_kin_national_id = serializers.CharField(max_length=50, required=False, allow_blank=True)
    next_of_kin_physical_address = serializers.CharField(required=False, allow_blank=True)
    county_of_residence = serializers.CharField(max_length=100, required=False, allow_blank=True)
    physical_address = serializers.CharField(required=False, allow_blank=True)

    @staticmethod
    def _collapse_spaces(value):
        return re.sub(r"\s+", " ", str(value).strip()) if value is not None else value

    def _normalize_phone(self, value):
        if not value:
            return value
        raw = str(value).strip().replace(" ", "").replace("-", "")
        if raw.startswith("07") and len(raw) == 10:
            return "+254" + raw[1:]
        if raw.startswith("01") and len(raw) == 10:
            return "+254" + raw[1:]
        if raw.startswith("254") and len(raw) == 12:
            return "+" + raw
        return raw

    def _normalize(self, attrs):
        name_fields = ["full_name", "first_name", "middle_name", "last_name", "preferred_name", "next_of_kin_name", "guardian_name"]
        upper_fields = ["identification_number", "passport_number", "kra_pin", "next_of_kin_identification_number", "next_of_kin_national_id"]
        string_fields = [
            "identification_country", "identification_document_reference", "phone_number", "occupation", "employer",
            "business_name", "nationality", "citizenship", "postal_address", "preferred_language", "preferred_contact_channel",
            "disability_or_accessibility_notes", "guardian_relationship", "next_of_kin_relationship", "country",
            "county_or_region", "city_or_town", "street_or_locality", "postal_code", "address_description", "county", "city",
            "street", "full_address", "notes", "privacy_notice_version", "personal_data_source",
            "privacy_notice_delivery_method", "represented_person",
            "onboarding_method", "privacy_acknowledgement_reference",
            "privacy_lawful_basis", "privacy_data_sharing_explanation",
            "privacy_retention_category", "representation_capacity",
            "authority_document_reference", "purpose_and_nature_of_relationship",
            "pep_details", "source_of_funds", "source_of_wealth",
            "screening_method", "screening_result", "risk_assessment_reason",
            "enhanced_due_diligence_reason",
        ]
        for field in name_fields:
            if field in attrs and attrs[field] is not None:
                attrs[field] = self._collapse_spaces(attrs[field])
        for field in string_fields:
            if field in attrs and attrs[field] is not None:
                attrs[field] = str(attrs[field]).strip()
        for field in upper_fields:
            if attrs.get(field):
                attrs[field] = str(attrs[field]).strip().upper()
        for field in ["email", "contact_email", "next_of_kin_email", "guardian_email"]:
            if attrs.get(field):
                attrs[field] = attrs[field].strip().lower()
        for field in ["phone_number", "contact_phone_number", "next_of_kin_phone", "guardian_phone"]:
            if attrs.get(field):
                attrs[field] = self._normalize_phone(attrs[field])
        return attrs

    def _apply_identification_compatibility(self, attrs):
        if not attrs.get("identification_type"):
            if attrs.get("national_id"):
                attrs["identification_type"] = IndividualClient.IdentificationType.NATIONAL_ID
                attrs["identification_number"] = attrs.get("national_id")
            elif attrs.get("passport_number"):
                attrs["identification_type"] = IndividualClient.IdentificationType.PASSPORT
                attrs["identification_number"] = attrs.get("passport_number")
        if attrs.get("identification_type") == IndividualClient.IdentificationType.NATIONAL_ID and not attrs.get("identification_country"):
            attrs["identification_country"] = "Kenya"
        if attrs.get("identification_type") == IndividualClient.IdentificationType.NATIONAL_ID:
            attrs["national_id"] = attrs.get("identification_number")
            attrs["passport_number"] = ""
        elif attrs.get("identification_type") == IndividualClient.IdentificationType.PASSPORT:
            attrs["passport_number"] = attrs.get("identification_number")
            attrs["national_id"] = ""
        return attrs

    def _apply_address_compatibility(self, attrs):
        attrs["county_or_region"] = attrs.get("county_or_region") or attrs.get("county") or attrs.get("county_of_residence") or ""
        attrs["city_or_town"] = attrs.get("city_or_town") or attrs.get("city") or ""
        attrs["street_or_locality"] = attrs.get("street_or_locality") or attrs.get("street") or attrs.get("physical_address") or ""
        attrs["address_description"] = attrs.get("address_description") or attrs.get("full_address") or attrs.get("physical_address") or ""
        attrs["county"] = attrs["county_or_region"]
        attrs["city"] = attrs["city_or_town"]
        attrs["street"] = attrs["street_or_locality"]
        parts = [attrs.get("street_or_locality"), attrs.get("city_or_town"), attrs.get("county_or_region"), attrs.get("country")]
        generated = ", ".join([part for part in parts if part])
        attrs["full_address"] = attrs.get("address_description") or generated
        return attrs

    def validate(self, attrs):
        attrs = self._normalize(attrs)
        attrs = self._apply_identification_compatibility(attrs)
        attrs = self._apply_address_compatibility(attrs)
        attrs = super().validate(attrs)
        firm = self.context.get("firm")
        access_type = attrs.get("access_type", Client.AccessType.ASSISTED)
        errors = {}

        if access_type not in {Client.AccessType.PORTAL_ENABLED, Client.AccessType.ASSISTED}:
            errors["access_type"] = "Individual clients must be portal enabled or assisted."
        if not attrs.get("full_name"):
            errors["full_name"] = "Full legal name as displayed on the identification document is required."
        if not attrs.get("identification_type"):
            errors["identification_type"] = "Identification type is required."
        if not attrs.get("identification_number"):
            errors["identification_number"] = "Identification number is required."
        elif (
            attrs.get("identification_type") == IndividualClient.IdentificationType.NATIONAL_ID
            and not re.fullmatch(r"\d{7,10}", attrs["identification_number"])
        ):
            errors["identification_number"] = "Enter a valid Kenyan National ID number."
        if not attrs.get("identification_country"):
            errors["identification_country"] = "Identification country is required."
        if attrs.get("identification_type") == IndividualClient.IdentificationType.PASSPORT:
            if not attrs.get("identification_expiry_date"):
                errors["identification_expiry_date"] = "Passport expiry date is required."
            elif attrs["identification_expiry_date"] <= timezone.localdate():
                errors["identification_expiry_date"] = "Passport expiry date must be in the future."
        if attrs.get("identification_verified"):
            if not attrs.get("verification_method"):
                errors["verification_method"] = "Record how the identity document was verified."
            if not attrs.get("identification_document_reference"):
                errors["identification_document_reference"] = "Record the inspected document or secure file reference."
        if not attrs.get("date_of_birth"):
            errors["date_of_birth"] = "Date of birth is required."
        elif attrs["date_of_birth"] >= timezone.localdate():
            errors["date_of_birth"] = "Date of birth must be in the past."
        else:
            today = timezone.localdate()
            age = today.year - attrs["date_of_birth"].year - ((today.month, today.day) < (attrs["date_of_birth"].month, attrs["date_of_birth"].day))
            attrs["is_minor"] = age < 18
            if attrs["is_minor"] and not (attrs.get("guardian_name") and (attrs.get("guardian_phone") or attrs.get("guardian_email"))):
                errors["guardian_name"] = "Minor clients require guardian or legal-representative details."
        if not attrs.get("nationality"):
            errors["nationality"] = "Nationality is required."
        if not attrs.get("occupation_status"):
            errors["occupation_status"] = "Occupation status is required."
        elif attrs.get("occupation_status") == IndividualClient.OccupationStatus.EMPLOYED and not attrs.get("employer"):
            errors["employer"] = "Employer is required for employed clients."
        elif attrs.get("occupation_status") == IndividualClient.OccupationStatus.BUSINESS_OWNER and not attrs.get("business_name"):
            errors["business_name"] = "Business name is required for business owners."
        if not attrs.get("preferred_contact_channel"):
            errors["preferred_contact_channel"] = "Preferred contact channel is required."
        if access_type == Client.AccessType.PORTAL_ENABLED and not attrs.get("phone_number") and not attrs.get("email"):
            errors["contact_method"] = "At least one reliable client contact method is required."
        if access_type == Client.AccessType.PORTAL_ENABLED:
            if attrs.get("onboarding_method") != IndividualClient.OnboardingMethod.STAFF_ASSISTED:
                errors["onboarding_method"] = "Portal onboarding must be recorded as staff assisted until the client self-service onboarding workflow is available."
            if not attrs.get("email"):
                errors["email"] = "Portal individual clients require a login email address."
            if not attrs.get("phone_number"):
                errors["phone_number"] = "Portal individual clients require a phone number."
            if attrs.get("privacy_notice_delivery_method") != IndividualClient.PrivacyNoticeDeliveryMethod.PORTAL:
                errors["privacy_notice_delivery_method"] = "Portal clients must receive the privacy notice through the portal."
        if access_type == Client.AccessType.ASSISTED:
            if attrs.get("onboarding_method") not in {
                IndividualClient.OnboardingMethod.IN_PERSON,
                IndividualClient.OnboardingMethod.PHONE,
                IndividualClient.OnboardingMethod.STAFF_ASSISTED,
            }:
                errors["onboarding_method"] = "Choose in-person, phone or staff-assisted onboarding."
            email_fields = {
                "email": attrs.get("email"),
                "contact_email": attrs.get("contact_email"),
                "guardian_email": attrs.get("guardian_email"),
                "next_of_kin_email": attrs.get("next_of_kin_email"),
            }
            for field, value in email_fields.items():
                if value:
                    errors[field] = "Email is not collected for a fully assisted client."
            if attrs.get("preferred_contact_channel") not in {
                CommunicationChannel.IN_PERSON,
                CommunicationChannel.PHONE,
            }:
                errors["preferred_contact_channel"] = "Assisted clients may choose in-person or phone communication."
            if attrs.get("preferred_contact_channel") == CommunicationChannel.PHONE and not attrs.get("phone_number"):
                errors["phone_number"] = "Enter a phone number or choose in-person communication."
            if attrs.get("privacy_notice_delivery_method") not in {
                IndividualClient.PrivacyNoticeDeliveryMethod.PAPER,
                IndividualClient.PrivacyNoticeDeliveryMethod.VERBAL,
            }:
                errors["privacy_notice_delivery_method"] = "Record whether the assisted client received a paper notice or had it explained verbally."
        if attrs.get("preferred_contact_channel") == CommunicationChannel.EMAIL and not attrs.get("email"):
            errors["preferred_contact_channel"] = "Email is required when preferred contact channel is email."
        if attrs.get("preferred_contact_channel") in {CommunicationChannel.PHONE, CommunicationChannel.SMS, CommunicationChannel.WHATSAPP} and not attrs.get("phone_number"):
            errors["preferred_contact_channel"] = "A phone number is required for this preferred contact channel."
        if attrs.get("phone_number") and not re.match(r"^\+?[1-9]\d{7,14}$", attrs["phone_number"]):
            errors["phone_number"] = "Enter a valid Kenyan or international phone number."
        if not attrs.get("country"):
            errors["country"] = "Residential address country is required."
        if not attrs.get("city_or_town") and not attrs.get("street_or_locality"):
            errors["city_or_town"] = "Residential city, town or locality is required."
        if not attrs.get("address_description"):
            errors["address_description"] = "Residential address description is required."
        if (attrs.get("country") or "").lower() == "kenya" and not attrs.get("county_or_region"):
            errors["county_or_region"] = "County is required for Kenyan residential addresses when known."
        if not attrs.get("privacy_notice_version"):
            errors["privacy_notice_version"] = "Privacy notice version is required."
        if not attrs.get("privacy_notice_acknowledged"):
            errors["privacy_notice_acknowledged"] = "Confirm that the privacy notice was delivered and acknowledged."
        if not attrs.get("privacy_acknowledgement_reference"):
            errors["privacy_acknowledgement_reference"] = "Record the signed form, signature or staff acknowledgement reference."
        if not attrs.get("privacy_lawful_basis"):
            errors["privacy_lawful_basis"] = "Record the applicable lawful basis for processing."
        if not attrs.get("personal_data_source"):
            errors["personal_data_source"] = "Personal data source is required."
        if not attrs.get("acting_for_self"):
            if not attrs.get("represented_person"):
                errors["represented_person"] = "Name the person for whom the client is acting."
            if not attrs.get("representation_capacity"):
                errors["representation_capacity"] = "Record the representative's relationship or legal capacity."
            if not attrs.get("authority_document_reference"):
                errors["authority_document_reference"] = "Record the document or other authority to act."
            if not attrs.get("authority_verified"):
                errors["authority_verified"] = "The authority to give instructions must be verified."
        if not attrs.get("purpose_and_nature_of_relationship"):
            errors["purpose_and_nature_of_relationship"] = "Record the legal service sought and intended nature of the relationship."
        if attrs.get("pep_status") in {
            ClientDueDiligence.PepStatus.POTENTIAL_MATCH,
            ClientDueDiligence.PepStatus.CONFIRMED_MATCH,
        } and not attrs.get("pep_details"):
            errors["pep_details"] = "Record the relevant politically exposed person details."
        if attrs.get("sanctions_screening_status") not in {
            ClientDueDiligence.ScreeningStatus.NOT_CHECKED,
            ClientDueDiligence.ScreeningStatus.PENDING,
        }:
            if not attrs.get("screening_date"):
                errors["screening_date"] = "Record the screening date."
            if not attrs.get("screening_result"):
                errors["screening_result"] = "Record the screening result."
        if attrs.get("risk_rating") != ClientDueDiligence.RiskRating.NOT_ASSESSED and not attrs.get("risk_assessment_reason"):
            errors["risk_assessment_reason"] = "Record the reason for the risk rating."
        if attrs.get("enhanced_due_diligence_required") and not attrs.get("enhanced_due_diligence_reason"):
            errors["enhanced_due_diligence_reason"] = "Record why enhanced due diligence is required."

        if attrs.get("kra_pin") and not re.fullmatch(r"A\d{9}[A-Z]", attrs["kra_pin"]):
            errors["kra_pin"] = "Enter a valid individual KRA PIN, for example A123456789B."
        if firm:
            ident_type = attrs.get("identification_type")
            ident_number = attrs.get("identification_number")
            if ident_type and ident_number:
                if IndividualClient.objects.filter(client__firm=firm, identification_type=ident_type, identification_number__iexact=ident_number).exists():
                    errors["identification_number"] = "An individual client with this identification type and number already exists."
            if attrs.get("kra_pin") and Client.objects.filter(firm=firm, client_type=Client.ClientType.INDIVIDUAL, kra_pin__iexact=attrs["kra_pin"]).exists():
                errors["kra_pin"] = "An individual client with this KRA PIN already exists."
            email = attrs.get("email")
            if access_type == Client.AccessType.PORTAL_ENABLED and email and User.objects.filter(email__iexact=email).exists():
                errors["email"] = "This email already has portal access."
        if errors:
            raise serializers.ValidationError(errors)
        return attrs
