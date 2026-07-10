from rest_framework import serializers

from apps.staff.models import AccountantPermission


class AdminAccountantPermissionSerializer(serializers.Serializer):
    permission_codes = serializers.MultipleChoiceField(
        choices=AccountantPermission.choices,
        allow_empty=True,
    )
