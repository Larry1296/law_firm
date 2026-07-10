from django.db import transaction

from apps.clients.models import (
    Client,
    PartnershipClient,
    ClientAddress,
    ClientContact,
    ContactType,
)


class PartnershipClientService:

    @staticmethod
    @transaction.atomic
    def create_client(*, validated_data, user):

        # ----------------------------------
        # 1. Create Base Client
        # ----------------------------------
        client = Client.objects.create(
            firm=getattr(user, "firm", None),
            created_by=user,
            full_name=validated_data.get("full_name")
            or validated_data["partnership_name"],
            email=validated_data.get("email"),
            phone_number=validated_data.get("phone_number") or "",
            client_type=Client.ClientType.PARTNERSHIP,
            onboarding_type=validated_data["onboarding_type"],
            portal_enabled=validated_data.get("portal_enabled", False),
            kra_pin=validated_data.get("tax_pin"),
        )

        # ----------------------------------
        # 2. Create Partnership Profile
        # ----------------------------------
        PartnershipClient.objects.create(
            client=client,
            partnership_name=validated_data["partnership_name"],
            registration_number=validated_data.get("registration_number"),
            tax_pin=validated_data.get("tax_pin"),
            formation_date=validated_data.get("formation_date"),
            partner_count=validated_data.get("partner_count", 0),
            agreement_type=validated_data.get("agreement_type"),
        )

        # ----------------------------------
        # 3. Primary Contact
        # ----------------------------------
        ClientContact.objects.create(
            client=client,
            contact_type=ContactType.PRIMARY,
            full_name=validated_data.get("primary_contact_name")
            or validated_data.get("full_name")
            or validated_data["partnership_name"],
            email=validated_data.get("primary_contact_email")
            or validated_data.get("email")
            or "",
            phone_number=validated_data.get("primary_contact_phone")
            or validated_data.get("phone_number")
            or "",
            is_primary=True,
        )

        # ----------------------------------
        # 4. Address
        # ----------------------------------
        ClientAddress.objects.create(
            client=client,
            address_type=ClientAddress.AddressType.REGISTERED,
            country=validated_data["country"],
            county=validated_data.get("county"),
            city=validated_data.get("city"),
            street=validated_data.get("street"),
            postal_code=validated_data.get("postal_code"),
            full_address=validated_data["full_address"],
            is_primary=True,
        )

        return client