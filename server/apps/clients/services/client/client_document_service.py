class ClientDocumentService:
    @staticmethod
    def list_documents(client):
        return [
            {
                "id": "doc-001",
                "title": "ID Copy",
                "category": "Identity",
                "uploaded_at": "2026-07-05",
            }
        ]
