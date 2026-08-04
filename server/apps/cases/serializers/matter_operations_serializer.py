from rest_framework import serializers

from apps.cases.models import LegalAssessment, MatterDeadline, MatterWorkstream


class LegalAssessmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = LegalAssessment
        fields = "__all__"
        read_only_fields = ("firm", "matter", "version", "is_current")


class MatterWorkstreamSerializer(serializers.ModelSerializer):
    stage_records = serializers.SerializerMethodField()

    class Meta:
        model = MatterWorkstream
        fields = "__all__"
        read_only_fields = ("firm", "matter", "stage_history", "updated_by")

    def get_stage_records(self, obj):
        return [{
            "id": stage.id, "sequence": stage.sequence, "stage": stage.stage,
            "stage_data": stage.stage_data, "checklist": stage.checklist,
            "entered_at": stage.entered_at, "completed_at": stage.completed_at,
            "completion_reason": stage.completion_reason,
        } for stage in obj.stage_records.all()]


class WorkstreamStageCompletionSerializer(serializers.Serializer):
    checklist = serializers.DictField(child=serializers.BooleanField(), allow_empty=False)
    reason = serializers.CharField()
    supporting_document_ids = serializers.ListField(child=serializers.UUIDField(), required=False, default=list)


class MatterDeadlineSerializer(serializers.ModelSerializer):
    change_history = serializers.SerializerMethodField()

    class Meta:
        model = MatterDeadline
        fields = "__all__"
        read_only_fields = ("firm", "matter", "created_by", "completed_by", "completed_at", "cancellation_reason")

    def get_change_history(self, obj):
        date_changes = [{"kind": "DATE_CHANGE", "previous_due_at": x.previous_due_at, "new_due_at": x.new_due_at, "reason": x.reason,
                 "actor": x.actor.full_name, "changed_at": x.changed_at} for x in obj.change_history.all()]
        status_changes = [{"kind": "STATUS_CHANGE", "previous_status": x.previous_status, "new_status": x.new_status,
                           "reason": x.reason, "actor": x.actor.full_name, "changed_at": x.changed_at}
                          for x in obj.status_history.all()]
        return sorted([*date_changes, *status_changes], key=lambda item: item["changed_at"])


class DeadlineChangeSerializer(serializers.Serializer):
    new_due_at = serializers.DateTimeField()
    reason = serializers.CharField()


class DeadlineResolveSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=("COMPLETE", "CANCEL"))
    reason = serializers.CharField()
