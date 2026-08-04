from rest_framework import serializers

from apps.clients.models import EngagementHistory, EngagementRecord


class EngagementHistorySerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source="actor.full_name", read_only=True)

    class Meta:
        model = EngagementHistory
        fields = ["id", "action", "previous_values", "new_values", "reason", "correlation_id", "actor_name", "created_at"]
        read_only_fields = fields


class EngagementRecordSerializer(serializers.ModelSerializer):
    permits_opening = serializers.BooleanField(read_only=True)
    history = EngagementHistorySerializer(many=True, read_only=True)

    class Meta:
        model = EngagementRecord
        fields = [
            "id", "firm", "client", "proposed_matter", "matter", "version", "status",
            "responsible_advocate", "scope_of_work", "excluded_work", "client_objectives",
            "communication_method", "reporting_expectations", "fee_arrangement_type",
            "fee_arrangement_description", "estimated_professional_fees", "estimated_disbursements",
            "required_retainer", "retainer_due_date", "retainer_received", "engagement_letter_document",
            "sent_at", "signed_at", "signed_by", "authority_to_act_documents",
            "internally_approved_at", "approved_by", "exception_reason", "exception_policy_basis",
            "exception_approved_at", "exception_approved_by", "created_by", "permits_opening",
            "history", "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "firm", "client", "proposed_matter", "matter", "version", "internally_approved_at",
            "approved_by", "exception_reason", "exception_policy_basis", "exception_approved_at",
            "exception_approved_by", "created_by", "retainer_received", "permits_opening", "history", "created_at", "updated_at",
        ]


class EngagementCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = EngagementRecord
        fields = [
            "responsible_advocate", "scope_of_work", "excluded_work", "client_objectives",
            "communication_method", "reporting_expectations", "fee_arrangement_type",
            "fee_arrangement_description", "estimated_professional_fees", "estimated_disbursements",
            "required_retainer", "retainer_due_date", "engagement_letter_document",
            "sent_at", "signed_at", "signed_by", "status",
        ]

    def validate_status(self, value):
        if value in {EngagementRecord.Status.WAIVED, EngagementRecord.Status.NOT_REQUIRED, EngagementRecord.Status.READY}:
            raise serializers.ValidationError("Use the controlled approval or exception endpoint.")
        return value


class EngagementExceptionSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=[EngagementRecord.Status.WAIVED, EngagementRecord.Status.NOT_REQUIRED])
    reason = serializers.CharField()
    policy_basis = serializers.CharField()


class EngagementSupersedeSerializer(serializers.Serializer):
    reason = serializers.CharField()
