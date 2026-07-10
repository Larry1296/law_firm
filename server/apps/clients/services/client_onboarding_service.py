from django.db import transaction

from apps.clients.models import Client
from apps.clients.services.client_factory import ClientFactory


class ClientOnboardingService:
    """
    Handles creation of:
    1. Core Client record
    2. Client subtype record (Individual, Company, NGO, etc.)
    """

    @staticmethod
    @transaction.atomic
    def onboard(validated_data, user=None):

        # -----------------------------
        # 1. EXTRACT SAFE INPUTS
        # -----------------------------
        client_type = validated_data.get("client_type")
        onboarding_type = validated_data.get("onboarding_type")
        notes = validated_data.get("notes", "")
        profile = validated_data.get("profile") or {}

        if not client_type:
            raise ValueError("client_type is required")

        if not onboarding_type:
            raise ValueError("onboarding_type is required")

        # -----------------------------
        # 2. DETERMINE USER LINKAGE
        # -----------------------------
        # Only PUBLIC_REGISTRATION attaches user account
        linked_user = None
        if onboarding_type == "PUBLIC_REGISTRATION":
            linked_user = user

        # -----------------------------
        # 3. DETERMINE PORTAL STATUS
        # -----------------------------
        # ASSISTED clients typically do NOT use portal immediately
        portal_enabled = onboarding_type in [
            "PUBLIC_REGISTRATION",
            "FIRM_CREATED",
        ]

        # -----------------------------
        # 4. CREATE CORE CLIENT
        # -----------------------------
        client = Client.objects.create(
            client_type=client_type,
            onboarding_type=onboarding_type,
            portal_enabled=portal_enabled,
            is_active=True,
            notes=notes,
            user=linked_user,
        )

        # -----------------------------
        # 5. CREATE SUBTYPE RECORD
        # -----------------------------
        # This is optional-safe creation
        ClientFactory.create_client(
            client_type=client_type,
            profile=profile,
            client=client
        )

        # -----------------------------
        # 6. RETURN CLIENT
        # -----------------------------
        return client