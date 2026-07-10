class LawyerClientService:
    @staticmethod
    def list_clients(user):
        if not hasattr(user, "lawyer_profile"):
            raise ValueError("Only lawyers can access this endpoint.")

        return [
            {
                "id": "client-001",
                "full_name": "Acme Holdings",
                "email": "contact@acme.example",
                "phone_number": "+254700000002",
                "matter_type": "Litigation",
                "status": "ACTIVE",
                "last_contact": "2026-07-01",
            }
        ]
