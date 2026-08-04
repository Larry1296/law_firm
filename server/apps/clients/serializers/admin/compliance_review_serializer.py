from rest_framework import serializers

from apps.clients.models import ClientComplianceHistory, ClientComplianceReview


class ClientComplianceHistorySerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source="actor.full_name", read_only=True)

    class Meta:
        model = ClientComplianceHistory
        fields = ["id", "action", "previous_values", "new_values", "reason", "correlation_id", "actor_name", "created_at"]
        read_only_fields = fields


class ClientComplianceReviewSerializer(serializers.ModelSerializer):
    history = ClientComplianceHistorySerializer(many=True, read_only=True)
    reviewed_by_name = serializers.CharField(source="reviewed_by.full_name", read_only=True)
    blocks_opening = serializers.BooleanField(read_only=True)

    class Meta:
        model = ClientComplianceReview
        fields = [
            "id", "firm", "client", "identity_status", "authority_status",
            "beneficial_ownership_status", "due_diligence_status", "source_of_funds_required",
            "source_of_funds_status", "evidence", "review_notes", "restriction_reason",
            "reviewed_by", "reviewed_by_name", "reviewed_at", "blocks_opening", "history",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "firm", "client", "reviewed_by", "reviewed_by_name", "reviewed_at", "blocks_opening", "history", "created_at", "updated_at"]


class ClientComplianceDecisionSerializer(serializers.ModelSerializer):
    reason = serializers.CharField(write_only=True)

    class Meta:
        model = ClientComplianceReview
        fields = [
            "identity_status", "authority_status", "beneficial_ownership_status",
            "due_diligence_status", "source_of_funds_required", "source_of_funds_status",
            "evidence", "review_notes", "restriction_reason", "reason",
        ]

    def validate(self, attrs):
        terminal = {
            ClientComplianceReview.VerificationStatus.VERIFIED,
            ClientComplianceReview.VerificationStatus.NOT_APPLICABLE,
            ClientComplianceReview.VerificationStatus.BLOCKED,
        }
        for field in ["identity_status", "authority_status", "beneficial_ownership_status"]:
            if attrs.get(field) not in terminal:
                raise serializers.ValidationError({field: "Record a final verification decision."})
        if attrs.get("due_diligence_status") not in {
            ClientComplianceReview.DueDiligenceStatus.CLEARED,
            ClientComplianceReview.DueDiligenceStatus.ENHANCED_DUE_DILIGENCE,
            ClientComplianceReview.DueDiligenceStatus.RESTRICTED,
        }:
            raise serializers.ValidationError({"due_diligence_status": "Record a final due-diligence decision."})
        if not attrs.get("reason", "").strip():
            raise serializers.ValidationError({"reason": "A review reason is required for the audit history."})
        return attrs
