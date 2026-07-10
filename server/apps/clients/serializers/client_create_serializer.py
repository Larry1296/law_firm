from rest_framework import serializers

from apps.clients.models import Client


class ClientCreateSerializer(serializers.ModelSerializer):

    class Meta:
        model = Client

        fields = (
            "client_type",
            "onboarding_type",
            "portal_enabled",
            "notes",
        )