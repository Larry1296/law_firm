from rest_framework import serializers

from apps.cases.models import CaseAttachment


class CaseAttachmentSerializer(serializers.ModelSerializer):
    attachment_type_label = serializers.CharField(source="get_attachment_type_display", read_only=True)
    uploaded_by_name = serializers.CharField(source="uploaded_by.full_name", read_only=True)
    physical_copy_type_label = serializers.CharField(source="get_physical_copy_type_display", read_only=True)
    physical_section_label = serializers.CharField(source="get_physical_section_display", read_only=True)

    class Meta:
        model = CaseAttachment
        fields = [
            "id",
            "document_reference",
            "filing",
            "attachment_type",
            "attachment_type_label",
            "title",
            "description",
            "file",
            "file_name",
            "mime_type",
            "physical_copy_type",
            "physical_copy_type_label",
            "physical_storage_location",
            "document_date",
            "physical_file",
            "physical_section",
            "physical_section_label",
            "item_location_detail",
            "origin",
            "uploaded_by_name",
            "is_client_visible",
            "is_confidential",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields
