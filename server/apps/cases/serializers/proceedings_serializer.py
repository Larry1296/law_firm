from rest_framework import serializers

from apps.cases.models import CaseEvent, CaseTask
from apps.common.choices import CourtEventOutcome, CourtEventType


class ProceedingOutcomeSerializer(serializers.Serializer):
    proceeded = serializers.BooleanField()
    outcome_code = serializers.ChoiceField(choices=CourtEventOutcome.choices)
    outcome = serializers.CharField()
    actual_date = serializers.DateTimeField(required=False)
    attendance = serializers.ListField(child=serializers.DictField(), required=False)
    orders_directions = serializers.CharField(required=False, allow_blank=True)
    next_event_type = serializers.ChoiceField(
        choices=CourtEventType.choices, required=False, allow_blank=True
    )
    next_event_title = serializers.CharField(required=False, allow_blank=True)
    next_date = serializers.DateTimeField(required=False, allow_null=True)
    court_direction_details = serializers.CharField(required=False, allow_blank=True)
    courtroom = serializers.CharField(required=False, allow_blank=True)
    hearing_mode = serializers.ChoiceField(choices=CaseEvent.HearingMode.choices, required=False)
    physical_venue = serializers.CharField(required=False, allow_blank=True)
    virtual_meeting_url = serializers.URLField(required=False, allow_blank=True)
    judicial_officer = serializers.CharField(required=False, allow_blank=True)
    supporting_document_ids = serializers.ListField(
        child=serializers.UUIDField(), required=False, allow_empty=True
    )
    deadlines = serializers.ListField(child=serializers.DictField(), required=False)

    def validate_deadlines(self, value):
        valid_task_types = set(CaseTask.TaskType.values)
        for item in value:
            if not item.get("title") or not item.get("due_at"):
                raise serializers.ValidationError("Every deadline requires a title and due_at.")
            item.setdefault("task_type", CaseTask.TaskType.OTHER)
            if item["task_type"] not in valid_task_types:
                raise serializers.ValidationError("Invalid deadline task type.")
            item["due_at"] = serializers.DateTimeField().to_internal_value(item["due_at"])
        return value
