from rest_framework import serializers

from apps.cases.models import CaseLifecycleTransition


class CaseLifecycleTransitionSerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source="actor.full_name", read_only=True)

    class Meta:
        model = CaseLifecycleTransition
        fields = [
            "id",
            "dimension",
            "from_state",
            "to_state",
            "effective_at",
            "recorded_at",
            "actor",
            "actor_name",
            "reason",
            "metadata",
            "source_event",
            "correction_of",
            "is_correction",
        ]
        read_only_fields = fields


class CaseLifecycleTransitionRequestSerializer(serializers.Serializer):
    dimension = serializers.ChoiceField(choices=CaseLifecycleTransition.Dimension.choices)
    to_state = serializers.CharField(max_length=60)
    effective_at = serializers.DateTimeField(required=False, allow_null=True)
    reason = serializers.CharField()
    metadata = serializers.JSONField(required=False)
    source_event_id = serializers.UUIDField(required=False, allow_null=True)
    correction_of_id = serializers.UUIDField(required=False, allow_null=True)
