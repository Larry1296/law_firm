"""Serializer for MatterDocumentReference – used in case detail views."""

from rest_framework import serializers


class MatterDocumentReferenceSerializer(serializers.Serializer):
    """Serializes a MatterDocumentReference with full document identity.

    When an advocate opens a matter, this serializer tells them exactly
    what each referenced document is — not just the custody reference
    code, but the document type, title, and description.

    Example output::

        {
            "id": "abc-123...",
            "reference": "KYC-2026-039/D2",
            "kyc_folder": "KYC-2026-039",
            "document_index": 2,
            "title": "KRA PIN Certificate – Mutiso",
            "document_type": "KRA_PIN",
            "document_type_label": "KRA PIN Certificate",
            "description": "Original KRA PIN certificate supplied by client.",
            "physical_storage_location": "Cabinet B, Drawer 3",
            "physical_copy_retained": true,
            "review_status": "ACCEPTED",
            "purpose": "EVIDENCE",
            "purpose_label": "Evidence",
            "notes": "",
        }
    """

    id = serializers.UUIDField(read_only=True)
    purpose = serializers.CharField(read_only=True)
    purpose_label = serializers.SerializerMethodField()
    notes = serializers.CharField(read_only=True)

    # Document identity (flattened from the linked ClientDocument)
    reference = serializers.SerializerMethodField()
    kyc_folder = serializers.SerializerMethodField()
    document_index = serializers.SerializerMethodField()
    title = serializers.SerializerMethodField()
    document_type = serializers.SerializerMethodField()
    document_type_label = serializers.SerializerMethodField()
    description = serializers.SerializerMethodField()
    physical_storage_location = serializers.SerializerMethodField()
    physical_copy_retained = serializers.SerializerMethodField()
    review_status = serializers.SerializerMethodField()

    def get_purpose_label(self, obj):
        return obj.get_purpose_display()

    def get_reference(self, obj):
        return obj.full_reference

    def get_kyc_folder(self, obj):
        doc = obj.document
        if doc and doc.kyc_folder_id:
            return doc.kyc_folder.reference
        return None

    def get_document_index(self, obj):
        return obj.document.document_index if obj.document_id else None

    def get_title(self, obj):
        return obj.document.title if obj.document_id else ""

    def get_document_type(self, obj):
        return obj.document.document_type if obj.document_id else ""

    def get_document_type_label(self, obj):
        return obj.document.get_document_type_display() if obj.document_id else ""

    def get_description(self, obj):
        return obj.document.description if obj.document_id else ""

    def get_physical_storage_location(self, obj):
        return obj.document.physical_storage_location if obj.document_id else ""

    def get_physical_copy_retained(self, obj):
        return obj.document.physical_copy_retained if obj.document_id else False

    def get_review_status(self, obj):
        return obj.document.review_status if obj.document_id else ""
