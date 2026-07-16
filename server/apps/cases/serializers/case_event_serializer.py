from rest_framework import serializers

from apps.cases.models import CaseEvent


class CaseEventSerializer(serializers.ModelSerializer):
    event_type_label = serializers.CharField(source="get_event_type_display", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = CaseEvent
        fields = [
            "id",
            "event_type",
            "event_type_label",
            "status",
            "status_label",
            "title",
            "description",
            "starts_at",
            "ends_at",
            "court_station",
            "courtroom",
            "judicial_officer",
            "cause_list_position",
            "adjournment_reason",
            "outcome",
            "next_action",
            "next_date",
            "is_client_visible",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields
