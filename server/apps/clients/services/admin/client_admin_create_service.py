from django.db import transaction

from apps.common.choices import UserRole
from apps.clients.models import (
    Client,
    ClientAddress,
    ClientContact,
    CompanyClient,
    ContactType,
    EstateClient,
    GovernmentClient,
    IndividualClient,
    NGOClient,
    PartnershipClient,
    TrustClient,
)
from apps.users.services.auth_service import AuthService


class ClientAdminCreateService:
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
    def _split_name(full_name):
        parts = (full_name or "").strip().split()
        first_name = parts[0] if parts else "Client"
        last_name = " ".join(parts[1:]) if len(parts) > 1 else "-"
        return first_name, last_name

    @staticmethod
    def _create_portal_user(client, base_data, contact_data):
        if client.access_type != Client.AccessType.PORTAL_CLIENT:
            return None, None

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
            phone_number=base_data.get("phone_number")
            or contact_data.get("contact_phone_number"),
            national_id_number=national_id_number[:20],
            role=UserRole.PORTAL_CLIENT,
        )

        client.user = user
        client.save(update_fields=["user"])

        return user, temp_password

    @staticmethod
    @transaction.atomic
    def create_client(*, firm, created_by, client_type, validated_data):
        data = dict(validated_data)
        base_data = ClientAdminCreateService._pop_fields(data, ClientAdminCreateService.BASE_FIELDS)
        address_data = ClientAdminCreateService._pop_fields(data, ClientAdminCreateService.ADDRESS_FIELDS)
        contact_data = ClientAdminCreateService._pop_fields(data, ClientAdminCreateService.CONTACT_FIELDS)

        full_name = ClientAdminCreateService._display_name(client_type, {**base_data, **data})

        client = Client.objects.create(
            firm=firm,
            created_by=created_by,
            full_name=full_name,
            email=base_data.get("email"),
            phone_number=base_data.get("phone_number", ""),
            client_type=client_type,
            access_type=base_data.get("access_type", Client.AccessType.ASSISTED_CLIENT),
            national_id=base_data.get("national_id"),
            passport_number=base_data.get("passport_number"),
            kra_pin=base_data.get("kra_pin"),
            date_of_birth=base_data.get("date_of_birth"),
            lifecycle_status=Client.LifecycleStatus.PROSPECT,
        )

        profile = ClientAdminCreateService._create_profile(client, client_type, data)
        ClientAdminCreateService._create_address(
            client,
            address_data,
            ClientAddress.AddressType.REGISTERED
            if client_type != Client.ClientType.INDIVIDUAL
            else ClientAddress.AddressType.HOME,
        )
        ClientAdminCreateService._create_contact(
            client,
            contact_data,
            fallback_name=full_name,
            fallback_email=client.email,
            fallback_phone=client.phone_number,
        )
        user, temp_password = ClientAdminCreateService._create_portal_user(
            client,
            base_data,
            contact_data,
        )

        return {"client": client, "profile": profile, "user": user, "temp_password": temp_password}

    @staticmethod
    def _create_profile(client, client_type, data):
        if client_type == Client.ClientType.INDIVIDUAL:
            return IndividualClient.objects.create(
                client=client,
                gender=data.get("gender"),
                occupation=data.get("occupation"),
                marital_status=data.get("marital_status"),
            )

        if client_type == Client.ClientType.COMPANY:
            return CompanyClient.objects.create(
                client=client,
                company_name=data["company_name"],
                registration_number=data["registration_number"],
                incorporation_date=data.get("incorporation_date"),
                country_of_incorporation=data.get("country_of_incorporation", ""),
                industry=data.get("industry", ""),
                company_status=data.get("company_status", CompanyClient.CompanyStatus.ACTIVE),
                director_count=data.get("director_count", 0),
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

        if client_type == Client.ClientType.NGO:
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

        if client_type == Client.ClientType.GOVERNMENT:
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
