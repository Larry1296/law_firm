from rest_framework.exceptions import ValidationError

from apps.clients.models import (
    IndividualClient,
    CompanyClient,
    NGOClient,
    TrustClient,
    EstateClient,
    GovernmentClient,
)


class ClientFactory:

    @staticmethod
    def create_client(client_type, profile, client):

        profile = profile or {}

        # -------------------------
        # INDIVIDUAL
        # -------------------------
        if client_type == "INDIVIDUAL":

            required_fields = ["first_name", "last_name", "national_id"]

            missing = [
                f for f in required_fields
                if not profile.get(f)
            ]

            if missing:
                raise ValidationError({
                    "individual_client": f"Missing fields: {', '.join(missing)}"
                })

            return IndividualClient.objects.create(
                client=client,
                first_name=profile["first_name"],
                last_name=profile["last_name"],
                national_id=profile["national_id"],
            )

        # -------------------------
        # COMPANY
        # -------------------------
        if client_type == "COMPANY":

            required_fields = ["company_name", "registration_number"]

            missing = [
                f for f in required_fields
                if not profile.get(f)
            ]

            if missing:
                raise ValidationError({
                    "company_client": f"Missing fields: {', '.join(missing)}"
                })

            return CompanyClient.objects.create(
                client=client,
                company_name=profile["company_name"],
                registration_number=profile["registration_number"],
                tax_number=profile.get("tax_number"),
            )

        # -------------------------
        # NGO
        # -------------------------
        if client_type == "NGO":

            required_fields = ["ngo_name", "registration_number"]

            missing = [
                f for f in required_fields
                if not profile.get(f)
            ]

            if missing:
                raise ValidationError({
                    "ngo_client": f"Missing fields: {', '.join(missing)}"
                })

            return NGOClient.objects.create(
                client=client,
                ngo_name=profile["ngo_name"],
                registration_number=profile["registration_number"],
            )

        # -------------------------
        # TRUST
        # -------------------------
        if client_type == "TRUST":

            required_fields = ["trust_name"]

            if not profile.get("trust_name"):
                raise ValidationError({
                    "trust_client": "trust_name is required"
                })

            return TrustClient.objects.create(
                client=client,
                trust_name=profile["trust_name"],
                trust_reference=profile.get("trust_reference"),
            )

        # -------------------------
        # ESTATE
        # -------------------------
        if client_type == "ESTATE":

            required_fields = ["estate_name", "executor_name"]

            missing = [
                f for f in required_fields
                if not profile.get(f)
            ]

            if missing:
                raise ValidationError({
                    "estate_client": f"Missing fields: {', '.join(missing)}"
                })

            return EstateClient.objects.create(
                client=client,
                estate_name=profile["estate_name"],
                executor_name=profile["executor_name"],
            )

        # -------------------------
        # GOVERNMENT
        # -------------------------
        if client_type == "GOVERNMENT":

            required_fields = ["government_name"]

            if not profile.get("government_name"):
                raise ValidationError({
                    "government_client": "government_name is required"
                })

            return GovernmentClient.objects.create(
                client=client,
                government_name=profile["government_name"],
            )

        # -------------------------
        # UNKNOWN TYPE SAFETY
        # -------------------------
        raise ValidationError({
            "client_type": f"Unsupported client type: {client_type}"
        })