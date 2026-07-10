class SecretaryNotificationService:
    @staticmethod
    def list_notifications(user):
        if not hasattr(user, "secretary_profile"):
            raise ValueError("Only secretaries can access this endpoint.")

        return [
            {
                "id": "notification-001",
                "title": "Welcome",
                "message": "Your secretary workspace is ready.",
                "is_read": False,
                "created_at": "2026-07-06T00:00:00Z",
            }
        ]
