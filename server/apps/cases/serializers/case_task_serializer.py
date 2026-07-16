from rest_framework import serializers

from apps.cases.models import CaseTask


class CaseTaskSerializer(serializers.ModelSerializer):
    task_type_label = serializers.CharField(source="get_task_type_display", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    assigned_to_name = serializers.CharField(source="assigned_to.full_name", read_only=True)

    class Meta:
        model = CaseTask
        fields = [
            "id",
            "title",
            "description",
            "task_type",
            "task_type_label",
            "status",
            "status_label",
            "due_at",
            "reminder_at",
            "completed_at",
            "assigned_to",
            "assigned_to_name",
            "is_client_visible",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields
