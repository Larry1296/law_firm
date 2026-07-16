from django.contrib.auth import get_user_model
from django.db import transaction

from apps.clients.models.client import Client
from apps.clients.models.client_address import ClientAddress
from apps.clients.models.client_contact import ClientContact, ContactType
from apps.clients.models.company_client import CompanyClient
from apps.common.choices import UserRole
from apps.firm.models import LawFirmMember
from apps.clients.utils.passwords import generate_temp_password

User = get_user_model()


def get_user_firm(user):
    membership = (
        LawFirmMember.objects
        .select_related("firm")
        .filter(user=user, is_active=True)
        .first()
    )

    if not membership:
        raise ValueError("User is not assigned to any firm")

    return membership.firm


class CompanyClientService:

    @staticmethod
    @transaction.atomic
    def create_client(*, validated_data, user):

        company_name = validated_data["company_name"]

        temp_password = generate_temp_password(company_name)

        full_name = validated_data["contact_full_name"].strip()
        name_parts = full_name.split(maxsplit=1)

        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ""

        # ✅ FIX: resolve firm correctly
        firm = get_user_firm(user)

        client = Client.objects.create(
            firm=firm,
            created_by=user,
            full_name=company_name,
            email=validated_data["email"],
            phone_number=validated_data.get("phone_number", ""),
            client_type=Client.ClientType.COMPANY,
            access_type=Client.AccessType.PROSPECT,
            lifecycle_status=Client.LifecycleStatus.PROSPECT,
            is_verified=True,
        )

        company = CompanyClient.objects.create(
            client=client,
            company_name=company_name,
            registration_number=validated_data["registration_number"],
            incorporation_date=validated_data.get("incorporation_date"),
            country_of_incorporation=validated_data.get(
                "country_of_incorporation",
                "",
            ),
            industry=validated_data.get("industry", ""),
            company_status=validated_data.get(
                "company_status",
                CompanyClient.CompanyStatus.ACTIVE,
            ),
            director_count=validated_data.get("director_count", 0),
        )

        portal_user = User.objects.create_user(
            email=validated_data["contact_email"],
            password=temp_password,
            first_name=first_name,
            last_name=last_name,
            phone_number=validated_data["contact_phone_number"],
            national_id_number=validated_data["contact_national_id_number"],
            role=UserRole.PROSPECT,
        )

        client.user = portal_user
        client.save(update_fields=["user", "updated_at"])

        ClientAddress.objects.create(
            client=client,
            address_type=ClientAddress.AddressType.REGISTERED,
            country=validated_data["country"],
            county=validated_data.get("county", ""),
            city=validated_data.get("city", ""),
            street=validated_data.get("street", ""),
            postal_code=validated_data.get("postal_code", ""),
            full_address=validated_data["full_address"],
            is_primary=True,
        )

        ClientContact.objects.create(
            client=client,
            contact_type=ContactType.PRIMARY,
            full_name=validated_data["contact_full_name"],
            role_or_designation=validated_data.get(
                "contact_role_or_designation",
                "Authorized Representative",
            ),
            email=validated_data["contact_email"],
            phone_number=validated_data["contact_phone_number"],
            is_primary=True,
        )

        return {
            "client": client,
            "company": company,
            "portal_user": portal_user,
            "temp_password": temp_password,
        }
