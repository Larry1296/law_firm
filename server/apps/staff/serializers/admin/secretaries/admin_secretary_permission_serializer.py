from rest_framework import serializers

from apps.staff.models import SecretaryPermission


class AdminSecretaryPermissionSerializer(serializers.Serializer):
    permission_codes = serializers.MultipleChoiceField(
        choices=SecretaryPermission.choices,
        allow_empty=True,
    )
