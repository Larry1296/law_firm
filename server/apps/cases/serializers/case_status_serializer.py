from rest_framework import serializers

from apps.cases.models import Case


class CaseStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Case.Status.choices)
    note = serializers.CharField(required=False, allow_blank=True)
