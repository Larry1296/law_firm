class LawyerCalendarService:
    @staticmethod
    def list_events(user):
        if not hasattr(user, "lawyer_profile"):
            raise ValueError("Only lawyers can access this endpoint.")

        return [
            {
                "id": "evt-001",
                "title": "Court hearing",
                "start": "2026-07-10T09:00:00Z",
                "end": "2026-07-10T10:00:00Z",
            }
        ]
