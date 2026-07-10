from rest_framework import serializers

from apps.staff.models import HRPermission


class AdminHRPermissionSerializer(serializers.Serializer):
    permission_codes = serializers.MultipleChoiceField(
        choices=HRPermission.choices,
        allow_empty=True,
    )
