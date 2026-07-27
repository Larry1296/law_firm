from django.utils import timezone
from rest_framework import serializers

from apps.clients.models import Client, CompanyClient
from apps.clients.serializers.admin.admin_client_base_create_serializer import (
    AdminClientBaseCreateSerializer,
)
from apps.users.models import User


class CompanyPersonInputSerializer(serializers.Serializer):
    full_legal_name = serializers.CharField(max_length=255)
    person_type = serializers.ChoiceField(choices=("INDIVIDUAL", "LEGAL_ENTITY"), default="INDIVIDUAL")
    national_id_or_passport = serializers.CharField(max_length=100, required=False, allow_blank=True)
    nationality = serializers.CharField(max_length=100, required=False, allow_blank=True)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    residential_address = serializers.CharField(required=False, allow_blank=True)
    role = serializers.CharField(max_length=100, required=False, allow_blank=True)
    appointment_date = serializers.DateField(required=False, allow_null=True)
    is_active = serializers.BooleanField(default=True)
    is_beneficial_owner = serializers.BooleanField(default=False)
    authority_to_instruct = serializers.BooleanField(default=False)
    identity_verified = serializers.BooleanField(default=False)
    verification_document_reference = serializers.CharField(max_length=255, required=False, allow_blank=True)

    def validate(self, attrs):
        if attrs["person_type"] == "INDIVIDUAL" and not attrs.get("national_id_or_passport"):
            raise serializers.ValidationError({"national_id_or_passport": "Identification is required for an individual."})
        if attrs.get("identity_verified") and not attrs.get("verification_document_reference"):
            raise serializers.ValidationError({"verification_document_reference": "Record the identity evidence reference."})
        return attrs


class BeneficialOwnerInputSerializer(serializers.Serializer):
    full_legal_name = serializers.CharField(max_length=255)
    person_type = serializers.ChoiceField(choices=("INDIVIDUAL", "LEGAL_ENTITY"), default="INDIVIDUAL")
    national_id_or_passport = serializers.CharField(max_length=100, required=False, allow_blank=True)
    nationality = serializers.CharField(max_length=100, required=False, allow_blank=True)
    residential_address = serializers.CharField(required=False, allow_blank=True)
    ownership_percentage = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, allow_null=True, min_value=0, max_value=100)
    voting_rights_percentage = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, allow_null=True, min_value=0, max_value=100)
    control_method = serializers.CharField(max_length=100)
    identity_verified = serializers.BooleanField(default=False)
    ownership_evidence_reference = serializers.CharField(max_length=255)
    pep_status = serializers.CharField(max_length=30, default="PENDING")
    sanctions_screening_status = serializers.CharField(max_length=30, default="PENDING")
    is_controlling_official = serializers.BooleanField(default=False)
    control_reason = serializers.CharField(required=False, allow_blank=True)


class CompanyRepresentativeInputSerializer(serializers.Serializer):
    full_legal_name = serializers.CharField(max_length=255)
    role_title = serializers.CharField(
        max_length=255,
        required=False,
        allow_blank=True,
    )
    national_id_or_passport = serializers.CharField(max_length=100)
    telephone = serializers.CharField(max_length=30)
    email = serializers.EmailField(required=False, allow_blank=True)
    authority_type = serializers.CharField(max_length=100)
    authority_document_reference = serializers.CharField(max_length=150)
    authority_start_date = serializers.DateField(required=False, allow_null=True)
    is_primary = serializers.BooleanField(default=False)
    is_portal_contact = serializers.BooleanField(default=False)
    authority_verified = serializers.BooleanField(default=False)


class CompanyAdminCreateClientSerializer(AdminClientBaseCreateSerializer):
    access_type = serializers.ChoiceField(
        choices=(Client.AccessType.PORTAL_ENABLED, Client.AccessType.ASSISTED),
        default=Client.AccessType.ASSISTED,
    )
    legal_name = serializers.CharField(max_length=255)
    company_name = serializers.CharField(max_length=255, required=False)
    trading_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    registration_number = serializers.CharField(max_length=100)
    company_type = serializers.ChoiceField(
        choices=CompanyClient.CompanyType.choices,
        default=CompanyClient.CompanyType.PRIVATE_LIMITED_COMPANY,
    )
    incorporation_date = serializers.DateField(required=False, allow_null=True)
    country_of_incorporation = serializers.CharField(
        max_length=100,
        required=False,
        allow_blank=True,
        default="Kenya",
    )
    registration_authority = serializers.CharField(max_length=255)
    country_of_registration = serializers.CharField(max_length=100, default="Kenya")
    registration_date = serializers.DateField()
    industry = serializers.CharField(max_length=150, required=False, allow_blank=True)
    nature_of_business = serializers.CharField(required=False, allow_blank=True)
    website = serializers.URLField(required=False, allow_blank=True)
    company_status = serializers.ChoiceField(
        choices=CompanyClient.CompanyStatus.choices,
        default=CompanyClient.CompanyStatus.ACTIVE,
    )
    director_count = serializers.IntegerField(required=False, min_value=0, default=0)
    employee_count = serializers.IntegerField(required=False, min_value=0, allow_null=True)
    beneficial_ownership_declared = serializers.BooleanField(required=False, default=False)
    annual_returns_up_to_date = serializers.BooleanField(required=False, default=False)
    compliance_notes = serializers.CharField(required=False, allow_blank=True)
    onboarding_method = serializers.ChoiceField(choices=("IN_PERSON", "PHONE", "STAFF_ASSISTED", "PORTAL"))
    preferred_contact_channel = serializers.ChoiceField(choices=("IN_PERSON", "PHONE", "EMAIL", "SMS", "WHATSAPP"))
    privacy_notice_version = serializers.CharField(max_length=50)
    privacy_notice_delivery_method = serializers.ChoiceField(choices=("PORTAL", "PAPER", "VERBAL"))
    privacy_notice_acknowledged = serializers.BooleanField()
    personal_data_source = serializers.ChoiceField(choices=("ENTITY", "AUTHORISED_REPRESENTATIVE", "PUBLIC_REGISTER"))
    privacy_lawful_basis = serializers.CharField(max_length=100)
    registration_verified = serializers.BooleanField()
    registration_verification_source = serializers.CharField(max_length=100, required=False, allow_blank=True)
    registration_document_reference = serializers.CharField(max_length=255)
    beneficial_ownership_verified = serializers.BooleanField(default=False)
    directors = CompanyPersonInputSerializer(many=True)
    beneficial_owners = BeneficialOwnerInputSerializer(many=True)
    authorised_representatives = CompanyRepresentativeInputSerializer(many=True)
    purpose_and_nature_of_relationship = serializers.CharField()
    pep_status = serializers.CharField(max_length=30, default="PENDING")
    sanctions_screening_status = serializers.CharField(max_length=30, default="PENDING")
    screening_date = serializers.DateField(required=False, allow_null=True)
    screening_method = serializers.CharField(max_length=255, required=False, allow_blank=True)
    screening_result = serializers.CharField(required=False, allow_blank=True)
    risk_rating = serializers.ChoiceField(choices=("NOT_ASSESSED", "LOW", "MEDIUM", "HIGH"), default="NOT_ASSESSED")
    risk_assessment_reason = serializers.CharField(required=False, allow_blank=True)
    enhanced_due_diligence_required = serializers.BooleanField(default=False)
    enhanced_due_diligence_reason = serializers.CharField(required=False, allow_blank=True)
    source_of_funds = serializers.CharField(required=False, allow_blank=True)
    source_of_wealth = serializers.CharField(required=False, allow_blank=True)
    next_review_date = serializers.DateField(required=False, allow_null=True)
    engagement_letter_status = serializers.CharField(max_length=30, default="PENDING")
    fee_agreement_status = serializers.CharField(max_length=30, default="PENDING")
    client_instructions_confirmed = serializers.BooleanField()

    def validate_company_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Company name is required.")
        return value

    def validate_registration_number(self, value):
        value = value.strip().upper()
        if not value:
            raise serializers.ValidationError("Registration number is required.")

        if CompanyClient.objects.filter(registration_number__iexact=value).exists():
            raise serializers.ValidationError(
                "A company client with this registration number already exists."
            )
        return value

    def validate_incorporation_date(self, value):
        if value and value > timezone.localdate():
            raise serializers.ValidationError(
                "The incorporation date cannot be in the future."
            )
        return value

    def validate_registration_date(self, value):
        return self.validate_incorporation_date(value)

    def validate(self, attrs):
        attrs = super().validate(attrs)
        attrs["company_name"] = attrs["legal_name"].strip()
        attrs["incorporation_date"] = attrs["registration_date"]
        attrs["country_of_incorporation"] = attrs["country_of_registration"]

        attrs["country_of_incorporation"] = (
            attrs.get("country_of_incorporation") or "Kenya"
        ).strip()
        attrs["company_type"] = attrs.get(
            "company_type",
            CompanyClient.CompanyType.PRIVATE_LIMITED_COMPANY,
        )
        attrs["company_status"] = attrs.get(
            "company_status",
            CompanyClient.CompanyStatus.ACTIVE,
        )

        if attrs.get("access_type") not in {Client.AccessType.PORTAL_ENABLED, Client.AccessType.ASSISTED}:
            raise serializers.ValidationError({"access_type": "Use PORTAL_ENABLED or ASSISTED."})

        representatives = attrs.get("authorised_representatives") or []
        if not representatives:
            raise serializers.ValidationError({"authorised_representatives": "Record at least one authorised representative."})
        if not any(rep.get("is_primary") for rep in representatives):
            raise serializers.ValidationError({"authorised_representatives": "Mark one authorised representative as primary."})
        if any(not rep.get("authority_verified") for rep in representatives):
            raise serializers.ValidationError({"authorised_representatives": "Verify each representative's authority."})

        owners = attrs.get("beneficial_owners") or []
        if attrs.get("beneficial_ownership_declared") and not owners:
            raise serializers.ValidationError({"beneficial_owners": "Record the beneficial owners or controlling official."})
        if attrs.get("beneficial_ownership_verified") and (not owners or any(not owner.get("identity_verified") for owner in owners)):
            raise serializers.ValidationError({"beneficial_ownership_verified": "Every recorded beneficial owner must have verified identity."})
        if not attrs.get("registration_verified"):
            raise serializers.ValidationError({"registration_verified": "Company registration must be verified before onboarding is completed."})
        if not attrs.get("registration_verification_source"):
            raise serializers.ValidationError({"registration_verification_source": "Record the independent verification source."})
        if not attrs.get("privacy_notice_acknowledged"):
            raise serializers.ValidationError({"privacy_notice_acknowledged": "Confirm privacy notice acknowledgement."})
        if attrs.get("enhanced_due_diligence_required") and not attrs.get("enhanced_due_diligence_reason"):
            raise serializers.ValidationError({"enhanced_due_diligence_reason": "Record the EDD reason."})

        if attrs.get("access_type") == Client.AccessType.PORTAL_ENABLED:
            errors = {}
            email = attrs.get("email")
            phone_number = attrs.get("phone_number")
            contact_phone_number = attrs.get("contact_phone_number")
            contact_full_name = (attrs.get("contact_full_name") or "").strip()

            if not email:
                errors["email"] = "Record the company's primary email address."

            if not (phone_number or contact_phone_number):
                errors["phone_number"] = (
                    "Client portal access requires a company phone number or "
                    "authorised contact phone number."
                )

            portal_reps = [rep for rep in representatives if rep.get("is_portal_contact")]
            if not portal_reps:
                errors["authorised_representatives"] = "Mark an authorised representative as the portal contact."
            elif any(not rep.get("email") for rep in portal_reps):
                errors["authorised_representatives"] = "The portal representative requires an email address."
            elif any(
                User.objects.filter(email__iexact=rep["email"]).exists()
                for rep in portal_reps
            ):
                errors["authorised_representatives"] = (
                    "A user account already exists for the portal representative email."
                )
            if attrs.get("privacy_notice_delivery_method") != "PORTAL":
                errors["privacy_notice_delivery_method"] = "Portal clients receive the notice through the portal."

            if errors:
                raise serializers.ValidationError(errors)

        return attrs
