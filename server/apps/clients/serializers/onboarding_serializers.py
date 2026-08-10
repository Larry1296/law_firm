from django.utils import timezone
from rest_framework import serializers

from apps.clients.models import (
    Client, ClientAddress, ClientBeneficialOwner, ClientContact, ClientDueDiligence,
    ClientPrivacyRecord, ClientRepresentative, ClientSectorProfile, EducationCurriculum,
    EducationInstitutionProfile,
)
from apps.clients.onboarding_metadata import CANONICAL_CLIENT_TYPES


class RepresentativeOnboardingSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientRepresentative
        exclude = ("client", "verified_by", "verification_date", "created_at", "updated_at")


class ContactOnboardingSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientContact
        exclude = ("client", "created_at", "updated_at")


class AddressOnboardingSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientAddress
        exclude = ("client", "created_at", "updated_at")


class BeneficialOwnerOnboardingSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientBeneficialOwner
        exclude = ("client", "verified_by", "created_at", "updated_at")


class DueDiligenceOnboardingSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientDueDiligence
        exclude = (
            "client", "identity_verified_by", "authority_verified_by", "screening_reviewed_by",
            "enhanced_due_diligence_approved_by", "reviewed_by", "created_at", "updated_at",
        )


class PrivacyOnboardingSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientPrivacyRecord
        exclude = ("client", "delivered_by", "created_at", "updated_at")


class CurriculumOnboardingSerializer(serializers.ModelSerializer):
    class Meta:
        model = EducationCurriculum
        exclude = ("education_profile",)


class EducationOnboardingSerializer(serializers.ModelSerializer):
    curricula = CurriculumOnboardingSerializer(many=True, required=False, default=list)

    class Meta:
        model = EducationInstitutionProfile
        exclude = ("client", "verified_by", "created_at", "updated_at")

    def validate(self, attrs):
        instance = EducationInstitutionProfile(**{k: v for k, v in attrs.items() if k != "curricula"})
        instance.full_clean(exclude=["client", "verified_by"])
        for curriculum in attrs.get("curricula", []):
            EducationCurriculum(**curriculum).full_clean(exclude=["education_profile"])
        return attrs


class ClientOnboardingCreateSerializer(serializers.Serializer):
    client = serializers.DictField()
    legal_profile = serializers.DictField(required=False, default=dict)
    representatives = RepresentativeOnboardingSerializer(many=True, required=False, default=list)
    contacts = ContactOnboardingSerializer(many=True, required=False, default=list)
    addresses = AddressOnboardingSerializer(many=True, required=False, default=list)
    beneficial_owners = BeneficialOwnerOnboardingSerializer(many=True, required=False, default=list)
    due_diligence = DueDiligenceOnboardingSerializer(required=False, allow_null=True)
    privacy = PrivacyOnboardingSerializer(required=False, allow_null=True)
    regulatory_profiles = serializers.DictField(required=False, default=dict)

    def validate(self, attrs):
        base = attrs["client"]
        client_type = base.get("client_type")
        if client_type not in CANONICAL_CLIENT_TYPES:
            raise serializers.ValidationError({"client": {"client_type": "Select a canonical legal client type from onboarding metadata."}})
        if not base.get("full_name"):
            raise serializers.ValidationError({"client": {"full_name": "Legal/display name is required."}})
        if base.get("lifecycle_status") and base["lifecycle_status"] != Client.LifecycleStatus.PROSPECTIVE:
            raise serializers.ValidationError({"client": {"lifecycle_status": "Onboarding creates prospective clients only."}})
        if client_type == Client.ClientType.OTHER_REQUIRES_REVIEW:
            if not base.get("provisional_legal_description") or not base.get("classification_evidence_reference"):
                raise serializers.ValidationError({"client": "Classification description and supporting evidence reference are required."})
        elif base.get("classification_review_status") == Client.ClassificationReviewStatus.REQUIRES_REVIEW:
            raise serializers.ValidationError({"client": {"classification_review_status": "Canonical classifications cannot be marked unresolved during normal creation."}})
        if client_type == Client.ClientType.INDIVIDUAL:
            profile = attrs.get("legal_profile") or {}
            id_type = profile.get("identification_type")
            if id_type not in {"NATIONAL_ID", "PASSPORT", "ALIEN_ID", "REFUGEE_ID", "BIRTH_CERTIFICATE", "OTHER_GOVERNMENT_ID"}:
                raise serializers.ValidationError({"legal_profile": {"identification_type": "Select a supported identification type."}})
            if not profile.get("identification_number"):
                raise serializers.ValidationError({"legal_profile": {"identification_number": "Identification number is required."}})
            if id_type == "PASSPORT" and not profile.get("identification_country"):
                raise serializers.ValidationError({"legal_profile": {"identification_country": "Passport issuing country is required."}})
            dob = base.get("date_of_birth")
            if dob:
                dob = serializers.DateField().to_internal_value(dob)
                base["date_of_birth"] = dob
                age = timezone.localdate().year - dob.year - ((timezone.localdate().month, timezone.localdate().day) < (dob.month, dob.day))
                if age < 18 and not any(r.get("representative_category") == "AUTHORIZED_AGENT" for r in attrs.get("representatives", [])):
                    raise serializers.ValidationError({"representatives": "A minor requires a guardian/authorized representative record."})

        education_data = (attrs.get("regulatory_profiles") or {}).get("education")
        sectors = base.get("sectors", [])
        if "EDUCATION" in sectors and not education_data:
            raise serializers.ValidationError({"regulatory_profiles": {"education": "Education sector requires an institution profile."}})
        if education_data:
            education = EducationOnboardingSerializer(data=education_data)
            education.is_valid(raise_exception=True)
            attrs["regulatory_profiles"]["education"] = education.validated_data

        representatives = attrs.get("representatives") or []
        if client_type != Client.ClientType.INDIVIDUAL and not any(r.get("is_authorized_to_give_instructions") for r in representatives):
            raise serializers.ValidationError({"representatives": "Record at least one person authorized to give instructions."})
        required_capacity = {
            Client.ClientType.COMPANY: {"DIRECTOR", "COMPANY_SECRETARY"},
            Client.ClientType.PARTNERSHIP: {"PARTNER"},
            Client.ClientType.LIMITED_LIABILITY_PARTNERSHIP: {"DESIGNATED_PARTNER"},
            Client.ClientType.COOPERATIVE: {"COOPERATIVE_OFFICER"},
            Client.ClientType.SOCIETY_OR_ASSOCIATION: {"SOCIETY_OFFICIAL"},
            Client.ClientType.NON_PROFIT_ORGANIZATION: {"PBO_OFFICIAL"},
            Client.ClientType.TRUST: {"TRUSTEE"},
            Client.ClientType.ESTATE: {"EXECUTOR", "ADMINISTRATOR"},
        }.get(client_type)
        if required_capacity and not any(r.get("representative_category") in required_capacity for r in representatives):
            raise serializers.ValidationError({"representatives": f"Record at least one applicable management/authority capacity: {', '.join(sorted(required_capacity))}."})
        if base.get("access_type") == Client.AccessType.PORTAL_ENABLED:
            portal_reps = [r for r in representatives if r.get("is_portal_contact")]
            portal_contacts = [c for c in attrs.get("contacts", []) if c.get("is_portal_contact")]
            if not portal_reps and not portal_contacts and client_type != Client.ClientType.INDIVIDUAL:
                raise serializers.ValidationError({"representatives": "Portal-enabled entities require an authorized portal contact."})
            portal_email = base.get("email") or next((r.get("email") for r in portal_reps if r.get("email")), None) or next((c.get("email") for c in portal_contacts if c.get("email")), None)
            if not portal_email:
                raise serializers.ValidationError({"client": {"email": "Portal access requires a portal contact email."}})
        for rep in representatives:
            if rep.get("is_verified") and not rep.get("authority_document_reference"):
                raise serializers.ValidationError({"representatives": "Verified authority requires an evidence reference."})
        return attrs
