"""Serializers for KYC folder operations."""

from rest_framework import serializers


class KycFolderCreateSerializer(serializers.Serializer):
    """Create or open a KYC folder for a client."""

    client_id = serializers.UUIDField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True, default="")


class KycFolderDetailSerializer(serializers.Serializer):
    """Read-only serializer for KYC folder detail."""

    id = serializers.UUIDField(read_only=True)
    reference = serializers.CharField(read_only=True)
    client_id = serializers.UUIDField(read_only=True)
    client_name = serializers.SerializerMethodField()
    status = serializers.CharField(read_only=True)
    opened_by = serializers.SerializerMethodField()
    opened_at = serializers.DateTimeField(read_only=True)
    closed_at = serializers.DateTimeField(read_only=True)
    notes = serializers.CharField(read_only=True)
    document_count = serializers.IntegerField(read_only=True)
    documents = serializers.SerializerMethodField()

    def get_client_name(self, obj):
        return obj.client.full_name

    def get_opened_by(self, obj):
        return obj.opened_by.full_name if obj.opened_by else "Unknown"

    def get_documents(self, obj):
        docs = obj.documents.all().order_by("document_index")
        return [
            {
                "id": str(doc.id),
                "reference": doc.full_reference,
                "document_index": doc.document_index,
                "title": doc.title,
                "document_type": doc.document_type,
                "document_type_label": doc.get_document_type_display(),
                "description": doc.description,
                "physical_storage_location": doc.physical_storage_location,
                "physical_copy_retained": doc.physical_copy_retained,
                "review_status": doc.review_status,
            }
            for doc in docs
        ]


class KycFolderCloseSerializer(serializers.Serializer):
    """Validate closing a KYC folder."""

    notes = serializers.CharField(required=False, allow_blank=True, default="")
