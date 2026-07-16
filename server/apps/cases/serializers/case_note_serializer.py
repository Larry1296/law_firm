from rest_framework import serializers

from apps.cases.models import CaseNote


class CaseNoteSerializer(serializers.ModelSerializer):
    note_type_label = serializers.CharField(source="get_note_type_display", read_only=True)
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True)

    class Meta:
        model = CaseNote
        fields = [
            "id",
            "note_type",
            "note_type_label",
            "title",
            "body",
            "is_client_visible",
            "created_by_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields
