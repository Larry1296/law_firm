from rest_framework import serializers

from apps.cases.models import CaseConflictCheck


class CaseConflictCheckSerializer(serializers.ModelSerializer):
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    initiated_by_name = serializers.CharField(source="initiated_by.full_name", read_only=True)
    completed_by_name = serializers.CharField(source="completed_by.full_name", read_only=True)
    reviewed_by_name = serializers.CharField(source="reviewed_by.full_name", read_only=True)
    approved_by_name = serializers.CharField(source="approved_by.full_name", read_only=True)

    class Meta:
        model = CaseConflictCheck
        fields = [
            "id",
            "reference_number",
            "status",
            "status_label",
            "initiated_at",
            "completed_at",
            "initiated_by",
            "initiated_by_name",
            "completed_by",
            "completed_by_name",
            "reviewed_by",
            "reviewed_by_name",
            "reviewed_at",
            "approved_by",
            "approved_by_name",
            "approved_at",
            "search_scope",
            "searched_names",
            "searched_entities",
            "result_summary",
            "internal_notes",
            "waiver_required",
            "waiver_obtained",
            "waiver_details",
            "supporting_document",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class ClientSafeConflictCheckSerializer(serializers.Serializer):
    status = serializers.CharField()


class ConflictCheckActionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(
        choices=[
            "INITIATE",
            "REVIEW",
            "MARK_CLEAR",
            "POTENTIAL_CONFLICT",
            "CONFIRM_CONFLICT",
            "REQUEST_WAIVER",
            "RECORD_WAIVER",
            "REJECT",
            "CANCEL",
        ]
    )
    effective_at = serializers.DateTimeField(required=False, allow_null=True)
    reason = serializers.CharField(required=False, allow_blank=True)
    data = serializers.JSONField(required=False)

    def validate_data(self, value):
        value = value or {}
        for key in ["searched_names", "searched_entities"]:
            if key in value:
                if not isinstance(value[key], list):
                    raise serializers.ValidationError(f"{key} must be a list.")
                for item in value[key]:
                    if not isinstance(item, dict) or not item.get("name"):
                        raise serializers.ValidationError(
                            f"{key} entries must be objects with at least a name."
                        )
        return value

    def validate(self, attrs):
        action = attrs["action"]
        if action in {
            "REVIEW",
            "MARK_CLEAR",
            "POTENTIAL_CONFLICT",
            "CONFIRM_CONFLICT",
            "REQUEST_WAIVER",
            "RECORD_WAIVER",
            "REJECT",
        } and not attrs.get("reason"):
            raise serializers.ValidationError({"reason": "A reason is required for this conflict-check action."})
        if action == "REVIEW" and not (attrs.get("data") or {}).get("result_summary"):
            raise serializers.ValidationError({"data": {"result_summary": "A result summary is required for review."}})
        return attrs
