from rest_framework import serializers

from apps.cases.models import Case, CaseEvent


class CaseNextEventSerializer(serializers.Serializer):
    event_type = serializers.ChoiceField(choices=CaseEvent.EventType.choices, required=False)
    title = serializers.CharField(max_length=255, required=False, allow_blank=True)
    description = serializers.CharField(required=False, allow_blank=True)
    starts_at = serializers.DateTimeField()
    ends_at = serializers.DateTimeField(required=False, allow_null=True)
    court_station = serializers.CharField(max_length=255, required=False, allow_blank=True)
    courtroom = serializers.CharField(max_length=100, required=False, allow_blank=True)
    judicial_officer = serializers.CharField(max_length=255, required=False, allow_blank=True)
    cause_list_position = serializers.CharField(max_length=50, required=False, allow_blank=True)
    is_client_visible = serializers.BooleanField(required=False, default=True)
    notify_participants = serializers.BooleanField(required=False, default=True)

    def validate(self, attrs):
        starts_at = attrs.get("starts_at")
        ends_at = attrs.get("ends_at")
        if starts_at and ends_at and ends_at <= starts_at:
            raise serializers.ValidationError("End time must be after start time.")
        return attrs


class CaseStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Case.Status.choices)
    note = serializers.CharField(required=False, allow_blank=True)
    next_event = CaseNextEventSerializer(required=False, allow_null=True)
