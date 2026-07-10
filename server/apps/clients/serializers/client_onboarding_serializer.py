from rest_framework import serializers

from apps.clients.models import Client


class ClientOnboardingSerializer(serializers.Serializer):

    access_type = serializers.ChoiceField(
        choices=Client.AccessType.choices
    )

    client_type = serializers.ChoiceField(
        choices=Client.ClientType.choices
    )

    notes = serializers.CharField(
        required=False,
        allow_blank=True
    )

    def validate(self, attrs):
        return attrs