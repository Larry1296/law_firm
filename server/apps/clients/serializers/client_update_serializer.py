from rest_framework import serializers

from apps.clients.models import Client


class ClientUpdateSerializer(serializers.ModelSerializer):

    class Meta:
        model = Client

        fields = (
            "portal_enabled",
            "is_active",
            "notes",
        )