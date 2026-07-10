from rest_framework import serializers

from apps.cases.models import CaseActivity


class CaseActivitySerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source="actor.full_name", read_only=True)

    class Meta:
        model = CaseActivity
        fields = ["id", "action", "description", "metadata", "actor_name", "created_at"]
        read_only_fields = fields
