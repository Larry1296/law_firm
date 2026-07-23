from django.db import transaction
from rest_framework.exceptions import ValidationError

from apps.common.choices import UserRole
from apps.clients.models import (
    Client,
    ClientAddress,
    ClientContact,
    ClientRepresentative,
    CompanyClient,
    CommunicationChannel,
    CooperativeClient,
    ContactType,
    EstateClient,
    EstatePersonalRepresentative,
    GovernmentClient,
    IndividualClient,
    InternationalOrganizationClient,
    LimitedLiabilityPartnershipClient,
    LLPPartner,
    NGOClient,
    NonProfitOrganizationClient,
    PartnershipClient,
    PartnershipPartner,
    PublicEntityClient,
    SocietyAssociationClient,
    SoleProprietorshipClient,
    TrustClient,
    TrustTrustee,
)
from apps.users.services.auth_service import AuthService
from apps.users.models import User


class ClientAdminCreateService:
    COMPANY_PROFILE_TYPES = {
        Client.ClientType.COMPANY,
        Client.ClientType.BUSINESS_ENTITY,
        Client.ClientType.FINANCIAL_INSTITUTION,
        Client.ClientType.COOPERATIVE,
        Client.ClientType.SACCO,
        Client.ClientType.INTERNATIONAL_ENTITY,
    }
    NGO_PROFILE_TYPES = {
        Client.ClientType.NGO,
        Client.ClientType.NGO_ASSOCIATION,
        Client.ClientType.RELIGIOUS_ORGANIZATION,
    }
    GOVERNMENT_PROFILE_TYPES = {
        Client.ClientType.GOVERNMENT,
        Client.ClientType.GOVERNMENT_BODY,
        Client.ClientType.EDUCATIONAL_INSTITUTION,
    }

    BASE_FIELDS = {
        "full_name",
        "email",
        "phone_number",
        "access_type",
        "national_id",
        "passport_number",
        "kra_pin",
        "date_of_birth",
    }
    ADDRESS_FIELDS = {"country", "county", "city", "street", "postal_code", "full_address"}
    CONTACT_FIELDS = {
        "contact_full_name",
        "contact_role_or_designation",
        "contact_email",
        "contact_phone_number",
        "contact_national_id_number",
    }
    INDIVIDUAL_PROFILE_FIELDS = {
        "first_name",
        "middle_name",
        "last_name",
        "preferred_name",
        "gender",
        "occupation",
        "marital_status",
        "employer",
        "nationality",
        "citizenship",
        "county_of_residence",
        "physical_address",
        "postal_address",
        "preferred_language",
        "preferred_contact_channel",
        "disability_or_accessibility_notes",
        "next_of_kin_name",
        "next_of_kin_relationship",
        "next_of_kin_phone",
        "next_of_kin_email",
        "next_of_kin_national_id",
        "next_of_kin_physical_address",
        "notes",
    }
    NEXT_OF_KIN_FIELDS = {
        "next_of_kin_name",
        "next_of_kin_relationship",
        "next_of_kin_phone",
        "next_of_kin_email",
        "next_of_kin_national_id",
        "next_of_kin_physical_address",
    }

    CANONICAL_ENTITY_TYPES = {
        Client.ClientType.SOLE_PROPRIETORSHIP,
        Client.ClientType.PARTNERSHIP,
        Client.ClientType.LIMITED_LIABILITY_PARTNERSHIP,
        Client.ClientType.COOPERATIVE,
        Client.ClientType.SOCIETY_OR_ASSOCIATION,
        Client.ClientType.NON_PROFIT_ORGANIZATION,
        Client.ClientType.TRUST,
        Client.ClientType.ESTATE,
        Client.ClientType.PUBLIC_ENTITY,
        Client.ClientType.INTERNATIONAL_ORGANIZATION,
    }

    @staticmethod
    def _pop_fields(data, fields):
        return {field: data.pop(field) for field in list(fields) if field in data}

    @staticmethod
    def _display_name(client_type, data):
        return (
            data.get("full_name")
            or data.get("company_name")
            or data.get("partnership_name")
            or data.get("ngo_name")
            or data.get("trust_name")
            or data.get("estate_name")
            or data.get("government_entity_name")
            or client_type
        )

    @staticmethod
    def _create_address(client, address_data, default_type):
        if not address_data.get("full_address"):
            return None

        return ClientAddress.objects.create(
            client=client,
            address_type=default_type,
            country=address_data.get("country", ""),
            county=address_data.get("county", ""),
            city=address_data.get("city", ""),
            street=address_data.get("street", ""),
            postal_code=address_data.get("postal_code", ""),
            full_address=address_data["full_address"],
            is_primary=True,
        )

    @staticmethod
    def _create_contact(client, contact_data, fallback_name, fallback_email, fallback_phone):
        full_name = contact_data.get("contact_full_name") or fallback_name
        email = contact_data.get("contact_email") or fallback_email or ""
        phone_number = contact_data.get("contact_phone_number") or fallback_phone or ""

        if not full_name and not email and not phone_number:
            return None

        return ClientContact.objects.create(
            client=client,
            contact_type=ContactType.PRIMARY,
            full_name=full_name,
            role_or_designation=contact_data.get("contact_role_or_designation", ""),
            national_id_number=contact_data.get("contact_national_id_number", ""),
            email=email,
            phone_number=phone_number,
            is_primary=True,
        )

    @staticmethod
    def _create_next_of_kin_contact(client, individual_data):
        full_name = individual_data.get("next_of_kin_name", "")
        phone_number = individual_data.get("next_of_kin_phone", "")
        email = individual_data.get("next_of_kin_email", "") or ""

        if not full_name and not phone_number and not email:
            return None

        return ClientContact.objects.create(
            client=client,
            contact_type=ContactType.EMERGENCY,
            full_name=full_name,
            role_or_designation=individual_data.get("next_of_kin_relationship", ""),
            national_id_number=individual_data.get("next_of_kin_national_id", ""),
            email=email,
            phone_number=phone_number or client.phone_number,
            preferred_channel=CommunicationChannel.PHONE,
            is_primary=False,
            notes=individual_data.get("next_of_kin_physical_address", ""),
        )

    @staticmethod
    def _split_name(full_name):
        parts = (full_name or "").strip().split()
        first_name = parts[0] if parts else "Client"
        last_name = " ".join(parts[1:]) if len(parts) > 1 else "-"
        return first_name, last_name

    @staticmethod
    def _create_portal_user(client, base_data, contact_data):
        if client.access_type not in {Client.AccessType.PORTAL_ENABLED, Client.AccessType.PROSPECT}:
            return None, None

        if User.objects.filter(email__iexact=client.email).exists():
            raise ValidationError(
                {"email": "A user account with this email already exists."}
            )

        full_name = client.full_name
        if client.client_type != Client.ClientType.INDIVIDUAL:
            full_name = contact_data.get("contact_full_name") or client.full_name
        first_name, last_name = ClientAdminCreateService._split_name(full_name)
        national_id_number = (
            base_data.get("national_id")
            or base_data.get("passport_number")
            or contact_data.get("contact_national_id_number")
            or f"CLIENT-{str(client.id)[:13]}"
        )

        user, temp_password = AuthService.create_user_with_temp_password(
            email=client.email,
            first_name=first_name,
            last_name=last_name,
            phone_number=base_data.get("phone_number") or contact_data.get("contact_phone_number"),
            national_id_number=national_id_number[:20],
            role=UserRole.PROSPECT,
        )

        client.user = user
        client.save(update_fields=["user"])

        return user, temp_password

    @staticmethod
    @transaction.atomic
    def create_client(*, firm, created_by, client_type, validated_data):
        if client_type in ClientAdminCreateService.CANONICAL_ENTITY_TYPES and client_type not in {
            Client.ClientType.INDIVIDUAL,
            Client.ClientType.COMPANY,
        }:
            return ClientAdminCreateService.create_legal_entity_client(
                firm=firm,
                created_by=created_by,
                validated_data={**validated_data, "client_type": client_type},
            )

        data = dict(validated_data)
        base_data = ClientAdminCreateService._pop_fields(data, ClientAdminCreateService.BASE_FIELDS)
        address_data = ClientAdminCreateService._pop_fields(data, ClientAdminCreateService.ADDRESS_FIELDS)
        contact_data = ClientAdminCreateService._pop_fields(data, ClientAdminCreateService.CONTACT_FIELDS)
        individual_data = {}
        if client_type == Client.ClientType.INDIVIDUAL:
            individual_data = ClientAdminCreateService._pop_fields(
                data,
                ClientAdminCreateService.INDIVIDUAL_PROFILE_FIELDS,
            )

        full_name = ClientAdminCreateService._display_name(
            client_type,
            {**base_data, **data, **individual_data},
        )

        client = Client.objects.create(
            firm=firm,
            created_by=created_by,
            full_name=full_name,
            email=base_data.get("email"),
            phone_number=base_data.get("phone_number", ""),
            client_type=client_type,
            access_type=base_data.get("access_type", Client.AccessType.ASSISTED),
            national_id=base_data.get("national_id"),
            passport_number=base_data.get("passport_number"),
            kra_pin=base_data.get("kra_pin"),
            date_of_birth=base_data.get("date_of_birth"),
            lifecycle_status=Client.LifecycleStatus.PROSPECTIVE,
            is_verified=True,
        )

        profile = ClientAdminCreateService._create_profile(
            client,
            client_type,
            {**data, **individual_data},
        )
        registered_address = ClientAdminCreateService._create_address(
            client,
            address_data,
            ClientAddress.AddressType.REGISTERED
            if client_type != Client.ClientType.INDIVIDUAL
            else ClientAddress.AddressType.HOME,
        )
        primary_contact = ClientAdminCreateService._create_contact(
            client,
            contact_data,
            fallback_name=full_name,
            fallback_email=client.email,
            fallback_phone=client.phone_number,
        )
        next_of_kin = (
            ClientAdminCreateService._create_next_of_kin_contact(client, individual_data)
            if client_type == Client.ClientType.INDIVIDUAL
            else None
        )
        user, temp_password = ClientAdminCreateService._create_portal_user(
            client,
            base_data,
            contact_data,
        )

        return {
            "client": client,
            "profile": profile,
            "primary_contact": primary_contact,
            "registered_address": registered_address,
            "next_of_kin": next_of_kin,
            "user": user,
            "temp_password": temp_password,
        }

    @staticmethod
    @transaction.atomic
    def create_legal_entity_client(*, firm, created_by, validated_data):
        data = dict(validated_data)
        client_type = data["client_type"]
        base_data = ClientAdminCreateService._pop_fields(data, ClientAdminCreateService.BASE_FIELDS)
        address_data = ClientAdminCreateService._pop_fields(data, ClientAdminCreateService.ADDRESS_FIELDS)
        contact_data = ClientAdminCreateService._pop_fields(data, ClientAdminCreateService.CONTACT_FIELDS)
        representatives_data = data.pop("representatives", [])
        partners_data = data.pop("partners", [])
        trustees_data = data.pop("trustees", [])
        personal_representatives_data = data.pop("personal_representatives", [])

        full_name = data.get("full_name") or ClientAdminCreateService._display_name(client_type, data)

        client = Client.objects.create(
            firm=firm,
            created_by=created_by,
            full_name=full_name,
            email=base_data.get("email"),
            phone_number=base_data.get("phone_number", ""),
            client_type=client_type,
            access_type=base_data.get("access_type", Client.AccessType.ASSISTED),
            national_id=base_data.get("national_id"),
            passport_number=base_data.get("passport_number"),
            kra_pin=base_data.get("kra_pin") or data.get("kra_pin") or data.get("business_kra_pin"),
            date_of_birth=base_data.get("date_of_birth"),
            lifecycle_status=Client.LifecycleStatus.PROSPECTIVE,
            is_verified=False,
        )

        profile = ClientAdminCreateService._create_legal_entity_profile(
            client,
            client_type,
            data,
            partners_data=partners_data,
            trustees_data=trustees_data,
            personal_representatives_data=personal_representatives_data,
        )

        registered_address = ClientAdminCreateService._create_address(
            client,
            address_data,
            ClientAddress.AddressType.REGISTERED,
        )

        primary_contact = ClientAdminCreateService._create_contact(
            client,
            contact_data,
            fallback_name=full_name,
            fallback_email=client.email,
            fallback_phone=client.phone_number,
        )

        representatives = ClientAdminCreateService._create_representatives(
            client,
            representatives_data,
            created_by,
        )
        if not primary_contact:
            portal_rep = next((rep for rep in representatives if rep.is_primary or rep.is_portal_contact), None)
            if portal_rep:
                primary_contact = ClientContact.objects.create(
                    client=client,
                    contact_type=ContactType.PRIMARY,
                    full_name=portal_rep.full_legal_name,
                    role_or_designation=portal_rep.role_title,
                    national_id_number=portal_rep.national_id_or_passport,
                    email=portal_rep.email,
                    phone_number=portal_rep.telephone or client.phone_number,
                    is_primary=True,
                )

        user, temp_password = ClientAdminCreateService._create_portal_user(
            client,
            base_data,
            contact_data
            or {
                "contact_full_name": primary_contact.full_name if primary_contact else "",
                "contact_national_id_number": primary_contact.national_id_number if primary_contact else "",
                "contact_phone_number": primary_contact.phone_number if primary_contact else "",
            },
        )

        return {
            "client": client,
            "profile": profile,
            "primary_contact": primary_contact,
            "registered_address": registered_address,
            "representatives": representatives,
            "user": user,
            "temp_password": temp_password,
        }

    @staticmethod
    def _create_representatives(client, representatives_data, created_by):
        representatives = []
        for index, item in enumerate(representatives_data):
            representatives.append(
                ClientRepresentative.objects.create(
                    client=client,
                    full_legal_name=item["full_legal_name"],
                    representative_category=item.get(
                        "representative_category",
                        ClientRepresentative.RepresentativeCategory.AUTHORIZED_AGENT,
                    ),
                    role_title=item.get("role_title", ""),
                    national_id_or_passport=item.get("national_id_or_passport", ""),
                    email=item.get("email") or "",
                    telephone=item.get("telephone", ""),
                    postal_address=item.get("postal_address", ""),
                    physical_address=item.get("physical_address", ""),
                    authority_type=item.get("authority_type", ""),
                    authority_document_reference=item.get("authority_document_reference", ""),
                    authority_start_date=item.get("authority_start_date"),
                    authority_end_date=item.get("authority_end_date"),
                    is_primary=item.get("is_primary", index == 0),
                    is_portal_contact=item.get("is_portal_contact", False),
                    is_litigation_representative=item.get("is_litigation_representative", False),
                    is_verified=item.get("is_verified", False),
                    verified_by=created_by if item.get("is_verified", False) else None,
                    notes=item.get("notes", ""),
                )
            )
        return representatives

    @staticmethod
    def _create_legal_entity_profile(
        client,
        client_type,
        data,
        *,
        partners_data,
        trustees_data,
        personal_representatives_data,
    ):
        if client_type == Client.ClientType.SOLE_PROPRIETORSHIP:
            return SoleProprietorshipClient.objects.create(
                client=client,
                registered_business_name=data["registered_business_name"],
                business_registration_number=data.get("business_registration_number", ""),
                registration_date=data.get("registration_date"),
                proprietor_name=data["proprietor_name"],
                proprietor_identifier=data.get("proprietor_identifier", ""),
                proprietor_kra_pin=data.get("proprietor_kra_pin", ""),
                business_kra_pin=data.get("business_kra_pin", ""),
                trading_name=data.get("trading_name", ""),
                business_sector=data.get("sector", ""),
                registered_address=data.get("registered_address", ""),
                operational_address=data.get("operational_address", ""),
                status=data.get("status") or "UNKNOWN",
            )

        if client_type == Client.ClientType.PARTNERSHIP:
            profile = PartnershipClient.objects.create(
                client=client,
                partnership_name=data["partnership_name"],
                registration_number=data.get("registration_number"),
                tax_pin=data.get("kra_pin") or data.get("tax_pin"),
                subtype=data.get("subtype", PartnershipClient.PartnershipSubtype.GENERAL_PARTNERSHIP),
                formation_date=data.get("formation_date"),
                registration_date=data.get("registration_date"),
                country_of_registration=data.get("country_of_registration") or "Kenya",
                registration_authority=data.get("registration_authority", ""),
                principal_place_of_business=data.get("principal_place_of_business", ""),
                business_sector=data.get("sector", ""),
                partner_count=len([p for p in partners_data if p.get("is_active", True)]),
                agreement_type=data.get("agreement_type") or data.get("subtype"),
                partnership_agreement_reference=data.get("partnership_agreement_reference", ""),
                status=data.get("status") or "UNKNOWN",
                compliance_notes=data.get("compliance_notes", ""),
            )
            for item in partners_data:
                PartnershipPartner.objects.create(
                    partnership=profile,
                    partner_type=item.get("partner_type") or item.get("partner_kind") or "INDIVIDUAL",
                    legal_name=item["legal_name"],
                    identifier=item.get("identifier", ""),
                    kra_pin=item.get("kra_pin", ""),
                    address=item.get("address", ""),
                    designation=item.get("designation", PartnershipPartner.PartnerDesignation.GENERAL_PARTNER),
                    profit_share=item.get("profit_share"),
                    authority_to_instruct=item.get("authority_to_instruct", False),
                    date_joined=item.get("date_joined"),
                    date_ceased=item.get("date_ceased"),
                    is_active=item.get("is_active", True),
                    is_verified=item.get("is_verified", False),
                )
            return profile

        if client_type == Client.ClientType.LIMITED_LIABILITY_PARTNERSHIP:
            profile = LimitedLiabilityPartnershipClient.objects.create(
                client=client,
                registered_name=data["registered_name"],
                llp_registration_number=data["llp_registration_number"],
                kra_pin=data.get("kra_pin", ""),
                registration_date=data.get("registration_date"),
                country_of_registration=data.get("country_of_registration") or "Kenya",
                registered_office=data.get("registered_office", ""),
                principal_business_address=data.get("principal_business_address", ""),
                sector=data.get("sector", ""),
                status=data.get("status") or LimitedLiabilityPartnershipClient.LLPStatus.UNKNOWN,
                compliance_notes=data.get("compliance_notes", ""),
            )
            for item in partners_data:
                LLPPartner.objects.create(
                    llp=profile,
                    partner_kind=item.get("partner_kind") or item.get("partner_type") or "INDIVIDUAL",
                    legal_name=item["legal_name"],
                    identifier=item.get("identifier", ""),
                    kra_pin=item.get("kra_pin", ""),
                    address=item.get("address", ""),
                    is_designated_partner=item.get("is_designated_partner", False),
                    authority_to_instruct=item.get("authority_to_instruct", False),
                    date_joined=item.get("date_joined"),
                    date_ceased=item.get("date_ceased"),
                    is_active=item.get("is_active", True),
                )
            return profile

        if client_type == Client.ClientType.COOPERATIVE:
            return CooperativeClient.objects.create(
                client=client,
                registered_name=data["registered_name"],
                registration_number=data["registration_number"],
                subtype=data["cooperative_subtype"],
                registration_date=data.get("registration_date"),
                kra_pin=data.get("kra_pin", ""),
                registered_office=data.get("registered_office") or data.get("registered_address", ""),
                area_of_operation=data.get("area_of_operation", ""),
                activity_sector=data.get("activity_sector") or data.get("sector", ""),
                regulator_name=data.get("regulator_name", ""),
                license_number=data.get("license_number", ""),
                license_status=data.get("license_status", ""),
                status=data.get("status") or "UNKNOWN",
                compliance_notes=data.get("compliance_notes", ""),
            )

        if client_type == Client.ClientType.SOCIETY_OR_ASSOCIATION:
            return SocietyAssociationClient.objects.create(
                client=client,
                legal_name=data["legal_name"],
                common_name=data.get("common_name", ""),
                registration_status=data.get("registration_status") or "UNKNOWN",
                registration_number=data.get("registration_number", ""),
                registration_authority=data.get("registration_authority", ""),
                constitution_reference=data.get("constitution_reference", ""),
                formation_date=data.get("formation_date"),
                registration_date=data.get("registration_date"),
                objectives=data.get("objectives", ""),
                sector=data.get("sector", ""),
                principal_office=data.get("principal_office", ""),
                litigation_authority_reference=data.get("litigation_authority_reference", ""),
                status=data.get("status") or "UNKNOWN",
            )

        if client_type == Client.ClientType.NON_PROFIT_ORGANIZATION:
            return NonProfitOrganizationClient.objects.create(
                client=client,
                registered_name=data["registered_name"],
                registration_number=data.get("registration_number", ""),
                registration_authority=data.get("registration_authority", ""),
                nonprofit_form=data["nonprofit_form"],
                canonical_legal_form=data.get("canonical_legal_form", ""),
                pbo_or_ngo_status=data.get("pbo_or_ngo_status", ""),
                registration_date=data.get("registration_date"),
                objectives=data.get("objectives", ""),
                sector=data.get("sector", ""),
                operational_scope=data.get("operational_scope", ""),
                funding_compliance_notes=data.get("funding_compliance_notes", ""),
                status=data.get("status") or "UNKNOWN",
            )

        if client_type == Client.ClientType.TRUST:
            profile = TrustClient.objects.create(
                client=client,
                trust_name=data["trust_name"],
                trust_type=data.get("trust_type"),
                trust_deed_reference=data.get("trust_deed_reference"),
                trust_deed_date=data.get("trust_deed_date"),
                registration_number=data.get("registration_number", ""),
                incorporation_details=data.get("incorporation_details", ""),
                formation_date=data.get("formation_date"),
                jurisdiction=data.get("jurisdiction"),
                purpose=data.get("purpose", ""),
                principal_address=data.get("principal_address", ""),
                settlor_details=data.get("settlor_details", ""),
                trustee_count=len(trustees_data),
                primary_trustee_name=trustees_data[0].get("legal_name") if trustees_data else data.get("primary_trustee_name"),
                primary_trustee_contact=trustees_data[0].get("telephone", "") if trustees_data else data.get("primary_trustee_contact"),
                status=data.get("status") or "UNKNOWN",
                verification_notes=data.get("verification_notes", ""),
            )
            for item in trustees_data:
                TrustTrustee.objects.create(
                    trust=profile,
                    trustee_type=item.get("trustee_type", "INDIVIDUAL"),
                    legal_name=item["legal_name"],
                    identifier=item.get("identifier", ""),
                    address=item.get("address", ""),
                    appointment_date=item.get("appointment_date"),
                    cessation_date=item.get("cessation_date"),
                    is_primary_contact=item.get("is_primary_contact", False),
                    authority_to_instruct=item.get("authority_to_instruct", False),
                    is_verified=item.get("is_verified", False),
                )
            return profile

        if client_type == Client.ClientType.ESTATE:
            profile = EstateClient.objects.create(
                client=client,
                estate_name=data["estate_name"],
                deceased_full_name=data["deceased_full_name"],
                deceased_id_number=data.get("deceased_id_number"),
                date_of_death=data.get("date_of_death"),
                deceased_last_address=data.get("deceased_last_address", ""),
                probate_number=data.get("probate_number") or data.get("succession_cause_number"),
                court_reference=data.get("court_reference"),
                grant_type=data.get("grant_type", ""),
                grant_issue_date=data.get("grant_issue_date"),
                grant_confirmation_date=data.get("grant_confirmation_date"),
                grant_status=data.get("grant_status") or EstateClient.GrantStatus.UNKNOWN,
                estate_value_estimate=data.get("estate_value_estimate"),
                verification_notes=data.get("verification_notes", ""),
            )
            for item in personal_representatives_data:
                EstatePersonalRepresentative.objects.create(
                    estate=profile,
                    representative_type=item.get("representative_type", "ADMINISTRATOR"),
                    full_legal_name=item.get("full_legal_name") or item["legal_name"],
                    identifier=item.get("identifier", ""),
                    phone_number=item.get("phone_number", ""),
                    email=item.get("email", ""),
                    address=item.get("address", ""),
                    grant_reference=item.get("grant_reference", ""),
                    authority_start_date=item.get("authority_start_date"),
                    authority_end_date=item.get("authority_end_date"),
                    is_primary=item.get("is_primary", False),
                    is_verified=item.get("is_verified", False),
                )
            return profile

        if client_type == Client.ClientType.PUBLIC_ENTITY:
            return PublicEntityClient.objects.create(
                client=client,
                official_name=data["official_name"],
                subtype=data["public_entity_subtype"],
                enabling_instrument=data.get("enabling_instrument", ""),
                parent_ministry_or_county=data.get("parent_ministry_or_county", ""),
                legal_capacity_notes=data.get("legal_capacity_notes", ""),
                official_address=data.get("official_address", ""),
                legal_department_contact=data.get("legal_department_contact", ""),
                statutory_representative=data.get("statutory_representative", ""),
                jurisdiction_level=data.get("jurisdiction_level", ""),
                status=data.get("status") or "UNKNOWN",
                verification_notes=data.get("verification_notes", ""),
            )

        if client_type == Client.ClientType.INTERNATIONAL_ORGANIZATION:
            return InternationalOrganizationClient.objects.create(
                client=client,
                official_name=data["official_name"],
                organization_type=data["organization_type"],
                founding_instrument=data.get("founding_instrument", ""),
                headquarters_country=data.get("headquarters_country", ""),
                kenya_recognition_details=data.get("kenya_recognition_details", ""),
                privileges_immunities_status=data.get("privileges_immunities_status", ""),
                kenya_office_address=data.get("kenya_office_address", ""),
                status=data.get("status") or "UNKNOWN",
                verification_notes=data.get("verification_notes", ""),
            )

        raise ValueError(f"Unsupported canonical client type: {client_type}")

    @staticmethod
    def _create_profile(client, client_type, data):
        if client_type == Client.ClientType.INDIVIDUAL:
            first_name = data.get("first_name", "")
            middle_name = data.get("middle_name", "")
            last_name = data.get("last_name", "")
            if not first_name or not last_name:
                derived_first, derived_last = ClientAdminCreateService._split_name(
                    client.full_name
                )
                first_name = first_name or derived_first
                last_name = last_name or derived_last

            return IndividualClient.objects.create(
                client=client,
                first_name=first_name,
                middle_name=middle_name,
                last_name=last_name,
                preferred_name=data.get("preferred_name", ""),
                gender=data.get("gender"),
                occupation=data.get("occupation"),
                marital_status=data.get("marital_status"),
                employer=data.get("employer", ""),
                nationality=data.get("nationality", "Kenyan"),
                citizenship=data.get("citizenship", "Kenya"),
                county_of_residence=data.get("county_of_residence", ""),
                physical_address=data.get("physical_address", ""),
                postal_address=data.get("postal_address", ""),
                preferred_language=data.get("preferred_language", ""),
                preferred_contact_channel=data.get("preferred_contact_channel", ""),
                disability_or_accessibility_notes=data.get(
                    "disability_or_accessibility_notes",
                    "",
                ),
                next_of_kin_name=data.get("next_of_kin_name", ""),
                next_of_kin_relationship=data.get("next_of_kin_relationship", ""),
                next_of_kin_phone=data.get("next_of_kin_phone", ""),
                next_of_kin_email=data.get("next_of_kin_email", "") or "",
                next_of_kin_national_id=data.get("next_of_kin_national_id", ""),
                next_of_kin_physical_address=data.get(
                    "next_of_kin_physical_address",
                    "",
                ),
                notes=data.get("notes", ""),
            )

        if client_type in ClientAdminCreateService.COMPANY_PROFILE_TYPES:
            return CompanyClient.objects.create(
                client=client,
                company_name=data["company_name"],
                trading_name=data.get("trading_name", ""),
                registration_number=data["registration_number"],
                company_type=data.get(
                    "company_type",
                    CompanyClient.CompanyType.PRIVATE_LIMITED,
                ),
                incorporation_date=data.get("incorporation_date"),
                country_of_incorporation=data.get("country_of_incorporation", "Kenya"),
                industry=data.get("industry", ""),
                nature_of_business=data.get("nature_of_business", ""),
                website=data.get("website", ""),
                company_status=data.get("company_status", CompanyClient.CompanyStatus.ACTIVE),
                director_count=data.get("director_count", 0),
                employee_count=data.get("employee_count"),
                beneficial_ownership_declared=data.get(
                    "beneficial_ownership_declared",
                    False,
                ),
                annual_returns_up_to_date=data.get("annual_returns_up_to_date", False),
                compliance_notes=data.get("compliance_notes", ""),
            )

        if client_type == Client.ClientType.PARTNERSHIP:
            return PartnershipClient.objects.create(
                client=client,
                partnership_name=data["partnership_name"],
                registration_number=data.get("registration_number"),
                tax_pin=data.get("tax_pin"),
                formation_date=data.get("formation_date"),
                partner_count=data.get("partner_count", 0),
                agreement_type=data.get("agreement_type"),
            )

        if client_type in ClientAdminCreateService.NGO_PROFILE_TYPES:
            return NGOClient.objects.create(
                client=client,
                ngo_name=data["ngo_name"],
                registration_number=data["registration_number"],
                tax_pin=data.get("tax_pin"),
                registration_authority=data.get("registration_authority"),
                registration_date=data.get("registration_date"),
                sector=data.get("sector"),
                headquarters_address=data.get("headquarters_address"),
                operational_regions=data.get("operational_regions"),
                director_name=data.get("director_name"),
                director_contact=data.get("director_contact"),
                funding_sources=data.get("funding_sources"),
            )

        if client_type == Client.ClientType.TRUST:
            return TrustClient.objects.create(
                client=client,
                trust_name=data["trust_name"],
                trust_type=data.get("trust_type"),
                trust_deed_reference=data.get("trust_deed_reference"),
                formation_date=data.get("formation_date"),
                jurisdiction=data.get("jurisdiction"),
                trustee_count=data.get("trustee_count", 0),
                primary_trustee_name=data.get("primary_trustee_name"),
                primary_trustee_contact=data.get("primary_trustee_contact"),
                beneficiary_details=data.get("beneficiary_details"),
                assets_under_trust=data.get("assets_under_trust"),
                legal_representative=data.get("legal_representative"),
            )

        if client_type == Client.ClientType.ESTATE:
            return EstateClient.objects.create(
                client=client,
                estate_name=data["estate_name"],
                deceased_full_name=data["deceased_full_name"],
                deceased_id_number=data.get("deceased_id_number"),
                date_of_death=data.get("date_of_death"),
                probate_number=data.get("probate_number"),
                court_reference=data.get("court_reference"),
                executor_name=data.get("executor_name"),
                executor_contact=data.get("executor_contact"),
                administrator_name=data.get("administrator_name"),
                administrator_contact=data.get("administrator_contact"),
                estate_value_estimate=data.get("estate_value_estimate"),
                beneficiaries=data.get("beneficiaries"),
                assets_description=data.get("assets_description"),
                liabilities_description=data.get("liabilities_description"),
                court_status=data.get("court_status"),
            )

        if client_type in ClientAdminCreateService.GOVERNMENT_PROFILE_TYPES:
            return GovernmentClient.objects.create(
                client=client,
                government_entity_name=data["government_entity_name"],
                department=data.get("department"),
                agency_code=data.get("agency_code"),
                registration_number=data.get("registration_number"),
                jurisdiction_level=data.get("jurisdiction_level"),
                contact_person_name=data.get("contact_person_name"),
                contact_person_position=data.get("contact_person_position"),
                contact_person_phone=data.get("contact_person_phone"),
                contact_person_email=data.get("contact_person_email"),
                office_address=data.get("office_address"),
                mandate_area=data.get("mandate_area"),
                legal_department_head=data.get("legal_department_head"),
                legal_department_contact=data.get("legal_department_contact"),
            )

        raise ValueError(f"Unsupported client type: {client_type}")
