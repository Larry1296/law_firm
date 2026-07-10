from rest_framework import serializers

from apps.staff.models import ITPermission


class AdminITPermissionSerializer(serializers.Serializer):
    permission_codes = serializers.MultipleChoiceField(
        choices=ITPermission.choices,
        allow_empty=True,
    )
