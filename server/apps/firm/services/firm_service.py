from django.db import transaction


class FirmService:

    @staticmethod
    @transaction.atomic
    def update_firm(*, firm, validated_data):
        allowed_fields = (
            "name",
            "business_structure",
            "registration_number",
            "kra_pin",
            "email",
            "phone_number",
            "website",
            "physical_address",
            "postal_address",
            "county",
            "town",
            "description",
            "logo",
        )

        for attr, value in validated_data.items():
            if attr in allowed_fields:
                setattr(firm, attr, value)

        firm.save()

        return firm