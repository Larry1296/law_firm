from rest_framework import serializers

from apps.cases.models import CaseTask


class CaseTaskSerializer(serializers.ModelSerializer):
    task_type_label = serializers.CharField(source="get_task_type_display", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    assigned_to_name = serializers.CharField(source="assigned_to.full_name", read_only=True)
    priority_label = serializers.CharField(source="get_priority_display", read_only=True)

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
            "priority",
            "priority_label",
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


class CaseTaskCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    task_type = serializers.ChoiceField(choices=CaseTask.TaskType.choices, default=CaseTask.TaskType.OTHER)
    priority = serializers.ChoiceField(choices=CaseTask.Priority.choices, default=CaseTask.Priority.MEDIUM)
    due_at = serializers.DateTimeField(required=False, allow_null=True)
    is_client_visible = serializers.BooleanField(default=False)
