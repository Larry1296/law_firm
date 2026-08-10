from django.db import transaction
from django.db.models import Q
from rest_framework.exceptions import ValidationError
from apps.clients.services.admin.client_admin_create_service import ClientAdminCreateService

from apps.clients.models import (
    Client, ClientAddress, ClientBeneficialOwner, ClientContact, ClientDueDiligence,
    ClientPrivacyRecord, ClientRepresentative, ClientSectorProfile, CompanyClient, CompanyDirector,
    CooperativeClient, EducationCurriculum, EducationInstitutionProfile, EstateClient, EstatePersonalRepresentative,
    IndividualClient, InternationalOrganizationClient, LimitedLiabilityPartnershipClient, LLPPartner,
    NonProfitOrganizationClient, PartnershipClient, PartnershipPartner, PublicEntityClient,
    SocietyAssociationClient, SoleProprietorshipClient, TrustClient, TrustTrustee,
)


PROFILE_MODELS = {
    Client.ClientType.INDIVIDUAL: IndividualClient,
    Client.ClientType.SOLE_PROPRIETORSHIP: SoleProprietorshipClient,
    Client.ClientType.COMPANY: CompanyClient,
    Client.ClientType.PARTNERSHIP: PartnershipClient,
    Client.ClientType.LIMITED_LIABILITY_PARTNERSHIP: LimitedLiabilityPartnershipClient,
    Client.ClientType.COOPERATIVE: CooperativeClient,
    Client.ClientType.SOCIETY_OR_ASSOCIATION: SocietyAssociationClient,
    Client.ClientType.NON_PROFIT_ORGANIZATION: NonProfitOrganizationClient,
    Client.ClientType.TRUST: TrustClient,
    Client.ClientType.ESTATE: EstateClient,
    Client.ClientType.PUBLIC_ENTITY: PublicEntityClient,
    Client.ClientType.INTERNATIONAL_ORGANIZATION: InternationalOrganizationClient,
}


def _model_values(model, values, excluded=("id", "client", "created_at", "updated_at")):
    permitted = {field.name for field in model._meta.fields} - set(excluded)
    return {key: value for key, value in values.items() if key in permitted}


class ClientOnboardingService:
    @staticmethod
    def possible_duplicates(firm, base, legal_profile):
        query = Q(full_name__iexact=base.get("full_name", ""))
        for key in ("national_id", "passport_number", "kra_pin"):
            if base.get(key):
                query |= Q(**{f"{key}__iexact": base[key]})
        results = Client.objects.filter(firm=firm).filter(query)[:10]
        return [{"id": str(item.id), "full_name": item.full_name, "client_type": item.client_type} for item in results]

    @staticmethod
    @transaction.atomic
    def create(*, firm, created_by, validated_data):
        base = dict(validated_data["client"])
        sectors = base.pop("sectors", [])
        client_type = base["client_type"]
        duplicates = ClientOnboardingService.possible_duplicates(firm, base, validated_data.get("legal_profile", {}))
        allowed = {
            "full_name", "email", "phone_number", "client_type", "access_type", "national_id",
            "passport_number", "kra_pin", "date_of_birth", "provisional_legal_description",
            "classification_evidence_reference", "classification_review_reason",
        }
        client = Client.objects.create(
            firm=firm,
            created_by=created_by,
            lifecycle_status=Client.LifecycleStatus.PROSPECTIVE,
            classification_review_status=(
                Client.ClassificationReviewStatus.REQUIRES_REVIEW
                if client_type == Client.ClientType.OTHER_REQUIRES_REVIEW
                else Client.ClassificationReviewStatus.NOT_REQUIRED
            ),
            **{key: value for key, value in base.items() if key in allowed},
        )

        profile = None
        profile_model = PROFILE_MODELS.get(client_type)
        legal_profile = dict(validated_data.get("legal_profile") or {})
        if client_type == Client.ClientType.NON_PROFIT_ORGANIZATION:
            legal_profile.setdefault("nonprofit_form", "PUBLIC_BENEFIT_ORGANIZATION")
            legal_profile.setdefault("registration_authority", "PBORA")
        if profile_model:
            try:
                profile = profile_model(client=client, **_model_values(profile_model, legal_profile))
                profile.full_clean()
                profile.save()
            except Exception as exc:
                raise ValidationError({"legal_profile": getattr(exc, "message_dict", str(exc))}) from exc
        elif client_type != Client.ClientType.OTHER_REQUIRES_REVIEW:
            raise ValidationError({"legal_profile": "No canonical profile is configured for this legal type."})

        representatives = []
        for values in validated_data.get("representatives", []):
            rep = ClientRepresentative(client=client, **values)
            if rep.is_verified:
                rep.verified_by = created_by
            rep.full_clean()
            rep.save()
            representatives.append(rep)
            if profile and rep.representative_category == "DIRECTOR" and client_type == Client.ClientType.COMPANY:
                CompanyDirector.objects.create(company=profile, full_legal_name=rep.full_legal_name, national_id_or_passport=rep.national_id_or_passport, nationality=rep.nationality, role=rep.role_title or "DIRECTOR", authority_to_instruct=rep.is_authorized_to_give_instructions, identity_verified=rep.is_verified, verification_document_reference=rep.authority_document_reference)
            elif profile and rep.representative_category == "PARTNER" and client_type == Client.ClientType.PARTNERSHIP:
                PartnershipPartner.objects.create(partnership=profile, partner_type="INDIVIDUAL", legal_name=rep.full_legal_name, identifier=rep.national_id_or_passport, authority_to_instruct=rep.is_authorized_to_give_instructions, is_verified=rep.is_verified)
            elif profile and rep.representative_category in {"PARTNER", "DESIGNATED_PARTNER"} and client_type == Client.ClientType.LIMITED_LIABILITY_PARTNERSHIP:
                LLPPartner.objects.create(llp=profile, partner_kind="INDIVIDUAL", legal_name=rep.full_legal_name, identifier=rep.national_id_or_passport, is_designated_partner=rep.representative_category == "DESIGNATED_PARTNER", authority_to_instruct=rep.is_authorized_to_give_instructions)
            elif profile and rep.representative_category == "TRUSTEE" and client_type == Client.ClientType.TRUST:
                TrustTrustee.objects.create(trust=profile, trustee_type="INDIVIDUAL", legal_name=rep.full_legal_name, identifier=rep.national_id_or_passport, authority_to_instruct=rep.is_authorized_to_give_instructions, is_primary_contact=rep.is_primary, is_verified=rep.is_verified)
            elif profile and rep.representative_category in {"EXECUTOR", "ADMINISTRATOR"} and client_type == Client.ClientType.ESTATE:
                EstatePersonalRepresentative.objects.create(estate=profile, representative_type=rep.representative_category, full_legal_name=rep.full_legal_name, identifier=rep.national_id_or_passport, phone_number=rep.telephone, email=rep.email, grant_reference=rep.authority_document_reference, authority_start_date=rep.authority_start_date, authority_end_date=rep.authority_end_date, is_primary=rep.is_primary, is_verified=rep.is_verified)
        contacts = []
        for values in validated_data.get("contacts", []):
            contact = ClientContact(client=client, **values)
            contact.full_clean()
            contact.save()
            contacts.append(contact)
        addresses = []
        for values in validated_data.get("addresses", []):
            address = ClientAddress(client=client, **values)
            address.full_clean()
            address.save()
            addresses.append(address)

        portal_user = None
        temp_password = None
        if client.access_type == Client.AccessType.PORTAL_ENABLED:
            portal_rep = next((item for item in representatives if item.is_portal_contact), None)
            portal_contact = next((item for item in contacts if item.is_portal_contact), None)
            portal_email = (portal_rep.email if portal_rep else "") or (portal_contact.email if portal_contact else "") or client.email
            portal_phone = (portal_rep.telephone if portal_rep else "") or (portal_contact.phone_number if portal_contact else "") or client.phone_number
            portal_name = (portal_rep.full_legal_name if portal_rep else "") or (portal_contact.full_name if portal_contact else "") or client.full_name
            portal_identifier = (portal_rep.national_id_or_passport if portal_rep else "") or (portal_contact.national_id_number if portal_contact else "")
            portal_user, temp_password = ClientAdminCreateService._create_portal_user(
                client, {"email": portal_email, "phone_number": portal_phone, "national_id": portal_identifier},
                {"contact_full_name": portal_name, "contact_phone_number": portal_phone, "contact_national_id_number": portal_identifier},
            )

        beneficial_owners = []
        for values in validated_data.get("beneficial_owners", []):
            owner = ClientBeneficialOwner(client=client, **values)
            if owner.verification_status == "VERIFIED":
                owner.verified_by = created_by
            owner.full_clean()
            owner.save()
            beneficial_owners.append(owner)

        due_data = validated_data.get("due_diligence")
        due_diligence = None
        if due_data is not None:
            due_data = dict(due_data)
            if due_data.get("identity_verification_status") == "VERIFIED":
                due_data["identity_verified_by"] = created_by
            if due_data.get("authority_verified"):
                due_data["authority_verified_by"] = created_by
            due_diligence = ClientDueDiligence.objects.create(client=client, **due_data)

        privacy_data = validated_data.get("privacy")
        privacy = None
        if privacy_data is not None:
            privacy_data = dict(privacy_data)
            if privacy_data.get("privacy_notice_delivered"):
                privacy_data["delivered_by"] = created_by
            privacy = ClientPrivacyRecord.objects.create(client=client, **privacy_data)

        sector_profiles = []
        for sector in sectors:
            sector_profiles.append(ClientSectorProfile.objects.create(client=client, sector=sector))

        education_profile = None
        education_data = (validated_data.get("regulatory_profiles") or {}).get("education")
        if education_data:
            education_data = dict(education_data)
            curricula = education_data.pop("curricula", [])
            if education_data.get("verification_status") == "VERIFIED":
                education_data["verified_by"] = created_by
            education_profile = EducationInstitutionProfile(client=client, **education_data)
            education_profile.full_clean()
            education_profile.save()
            for values in curricula:
                curriculum = EducationCurriculum(education_profile=education_profile, **values)
                curriculum.full_clean()
                curriculum.save()

        return {
            "client": client, "profile": profile, "representatives": representatives,
            "contacts": contacts, "addresses": addresses, "beneficial_owners": beneficial_owners,
            "due_diligence": due_diligence, "privacy": privacy, "sector_profiles": sector_profiles,
            "education_profile": education_profile, "possible_duplicates": duplicates,
            "user": portal_user, "temp_password": temp_password,
        }
