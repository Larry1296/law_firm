class LawyerDocumentService:
    @staticmethod
    def list_documents(user):
        if not hasattr(user, "lawyer_profile"):
            raise ValueError("Only lawyers can access this endpoint.")

        return [
            {
                "id": "doc-001",
                "title": "Engagement Letter",
                "category": "Contract",
                "status": "READY",
                "uploaded_at": "2026-07-04T10:00:00Z",
            }
        ]

    @staticmethod
    def upload_document(user, validated_data):
        if not hasattr(user, "lawyer_profile"):
            raise ValueError("Only lawyers can access this endpoint.")

        return {
            "id": "doc-002",
            "title": validated_data.get("title", "Uploaded Document"),
            "status": "UPLOADED",
            "message": "Document upload received",
        }
