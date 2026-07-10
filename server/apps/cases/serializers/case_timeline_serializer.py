from rest_framework import serializers

from apps.cases.models import CaseTimeline


class CaseTimelineSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True)

    class Meta:
        model = CaseTimeline
        fields = ["id", "action", "description", "created_by_name", "created_at"]
        read_only_fields = fields
