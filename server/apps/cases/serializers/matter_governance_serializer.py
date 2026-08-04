from rest_framework import serializers

from apps.cases.models import DestructionLog, MatterArchive, MatterClosure, RetentionReview


class MatterClosureSerializer(serializers.ModelSerializer):
    blocking_reasons = serializers.SerializerMethodField()

    class Meta:
        model = MatterClosure
        fields = "__all__"
        read_only_fields = (
            "firm", "matter", "status", "requested_by", "responsible_advocate_approved_by",
            "finance_approved_by", "administrative_approved_by", "final_closure_date",
            "reopening_reason", "reopened_by", "reopened_at",
        )

    def get_blocking_reasons(self, obj):
        from apps.cases.services.matter_governance_service import MatterClosureService
        return MatterClosureService.blocking_reasons(obj)


class MatterArchiveSerializer(serializers.ModelSerializer):
    class Meta:
        model = MatterArchive
        fields = "__all__"
        read_only_fields = ("firm", "matter", "approved_by")


class RetentionReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = RetentionReview
        fields = ("assessment", "outcome", "reason", "next_review_date")


class DestructionLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = DestructionLog
        exclude = ("firm", "archive", "matter_reference", "approval_authority", "created_at")


class ReasonSerializer(serializers.Serializer):
    reason = serializers.CharField()
