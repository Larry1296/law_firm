class LawyerNotificationService:
    @staticmethod
    def list_notifications(user):
        if not hasattr(user, "lawyer_profile"):
            raise ValueError("Only lawyers can access this endpoint.")

        return [
            {
                "id": "notif-001",
                "title": "New case assignment",
                "message": "You were assigned to a new matter.",
                "is_read": False,
                "created_at": "2026-07-05T08:00:00Z",
            }
        ]
