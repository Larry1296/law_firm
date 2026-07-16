from datetime import datetime
from django.db import transaction

from apps.users.models import User
from apps.common.choices import UserRole

from apps.clients.models import (
    Client,
    IndividualClient,
    ClientAddress,
    ClientContact,
    ContactType,
)

from apps.firm.models import LawFirmMember
from apps.clients.utils.passwords import generate_temp_password


def get_user_firm(user):
    membership = (
        LawFirmMember.objects
        .select_related("firm")
        .filter(user=user, is_active=True)
        .first()
    )

    if not membership:
        raise ValueError("User is not assigned to any law firm")

    return membership.firm


class IndividualClientService:

    @staticmethod
    @transaction.atomic
    def create_client(*, validated_data, user):

        # ✅ FIXED: no more user.firm
        firm = get_user_firm(user)

        email = validated_data.get("email")
        portal_user = None

        if email:

            full_name = validated_data["full_name"].strip()
            name_parts = full_name.split()

            first_name = name_parts[0] if len(name_parts) > 0 else full_name
            last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else "-"

            password = generate_temp_password(first_name)

            portal_user = User.objects.create_user(
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                national_id_number=validated_data.get("national_id")
                or validated_data.get("passport_number"),
                phone_number=validated_data.get("phone_number", ""),
                role=UserRole.PROSPECT,
                must_change_password=True,
            )

            access_type = Client.AccessType.PROSPECT

        else:
            access_type = Client.AccessType.ASSISTED_CLIENT

        # ----------------------------------
        # Client
        # ----------------------------------

        client = Client.objects.create(
            firm=firm,
            created_by=user,
            user=portal_user,
            full_name=validated_data["full_name"],
            email=email,
            phone_number=validated_data.get("phone_number", ""),
            client_type=Client.ClientType.INDIVIDUAL,
            access_type=access_type,
            national_id=validated_data.get("national_id"),
            passport_number=validated_data.get("passport_number"),
            kra_pin=validated_data.get("kra_pin"),
            date_of_birth=validated_data.get("date_of_birth"),
            lifecycle_status=Client.LifecycleStatus.PROSPECT,
            is_verified=True,
        )

        # ----------------------------------
        # Individual Profile
        # ----------------------------------

        IndividualClient.objects.create(
            client=client,
            gender=validated_data.get("gender"),
            occupation=validated_data.get("occupation"),
            marital_status=validated_data.get("marital_status"),
        )

        # ----------------------------------
        # Primary Contact
        # ----------------------------------

        if client.phone_number or client.email:
            ClientContact.objects.create(
                client=client,
                contact_type=ContactType.PRIMARY,
                full_name=client.full_name,
                email=client.email or "",
                phone_number=client.phone_number or "",
                is_primary=True,
            )

        # ----------------------------------
        # Primary Address
        # ----------------------------------

        if validated_data.get("full_address"):
            ClientAddress.objects.create(
                client=client,
                address_type=ClientAddress.AddressType.HOME,
                country=validated_data.get("country", ""),
                county=validated_data.get("county", ""),
                city=validated_data.get("city", ""),
                street=validated_data.get("street", ""),
                postal_code=validated_data.get("postal_code", ""),
                full_address=validated_data["full_address"],
                is_primary=True,
            )

        return {
            "client": client,
            "temp_password": password if email else None,
        }
