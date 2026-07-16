from rest_framework import serializers


class ClientAdminStatusSerializer(serializers.Serializer):
    action = serializers.ChoiceField(
        choices=["activate", "deactivate", "archive", "restore", "change-status"]
    )
