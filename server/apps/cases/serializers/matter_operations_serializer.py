from rest_framework import serializers

from apps.cases.models import LegalAssessment, MatterDeadline, MatterWorkstream


class LegalAssessmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = LegalAssessment
        fields = "__all__"
        read_only_fields = ("firm", "matter", "version", "is_current")


class MatterWorkstreamSerializer(serializers.ModelSerializer):
    class Meta:
        model = MatterWorkstream
        fields = "__all__"
        read_only_fields = ("firm", "matter", "stage_history", "updated_by")


class MatterDeadlineSerializer(serializers.ModelSerializer):
    change_history = serializers.SerializerMethodField()

    class Meta:
        model = MatterDeadline
        fields = "__all__"
        read_only_fields = ("firm", "matter", "created_by", "completed_by", "completed_at", "cancellation_reason")

    def get_change_history(self, obj):
        return [{"previous_due_at": x.previous_due_at, "new_due_at": x.new_due_at, "reason": x.reason,
                 "actor": x.actor.full_name, "changed_at": x.changed_at} for x in obj.change_history.all()]


class DeadlineChangeSerializer(serializers.Serializer):
    new_due_at = serializers.DateTimeField()
    reason = serializers.CharField()
