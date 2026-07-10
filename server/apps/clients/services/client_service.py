from django.shortcuts import get_object_or_404

from apps.clients.models import Client
from apps.firm.models import LawFirmMember


class ClientService:

    @staticmethod
    def _get_user_firm(user):
        membership = get_object_or_404(
            LawFirmMember,
            user=user,
            is_active=True,
        )

        return membership.firm

    @staticmethod
    def get_all_clients(user):
        firm = ClientService._get_user_firm(user)

        return (
            Client.objects
            .filter(firm=firm)
            .order_by("-created_at")
        )

    @staticmethod
    def get_client_by_id(client_id, user):
        firm = ClientService._get_user_firm(user)

        return get_object_or_404(
            Client,
            id=client_id,
            firm=firm,
        )

    @staticmethod
    def create_client(**validated_data):
        """
        ⚠️ KEEP THIS ONLY FOR SIMPLE CLIENT CREATION (LEGACY SUPPORT)
        Onboarding should NOT use this directly anymore.
        """
        return Client.objects.create(**validated_data)

    @staticmethod
    def update_client(client, **validated_data):
        for field, value in validated_data.items():
            setattr(client, field, value)

        client.save()

        return client

    @staticmethod
    def delete_client(client):
        client.delete()