from apps.staff.models import SecretaryPermission


class SecretaryDocumentService:
    @staticmethod
    def list_documents(user):
        secretary = getattr(user, "secretary_profile", None)
        if secretary is None:
            raise ValueError("Only secretaries can access this endpoint.")

        if not secretary.can_prepare_documents and not secretary.has_permission(
            SecretaryPermission.MANAGE_DOCUMENTS
        ):
            raise PermissionError("Admin permission is required to manage documents.")

        return [
            {
                "id": "document-001",
                "title": "Draft engagement letter",
                "document_type": "LETTER",
                "status": "DRAFT",
                "related_to": "Sample Client",
                "uploaded_at": "2026-07-06T00:00:00Z",
            }
        ]
