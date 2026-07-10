from apps.staff.models import SecretaryPermission


class SecretaryCalendarService:
    @staticmethod
    def list_events(user):
        secretary = getattr(user, "secretary_profile", None)
        if secretary is None:
            raise ValueError("Only secretaries can access this endpoint.")

        if not secretary.can_schedule_appointments and not secretary.has_permission(
            SecretaryPermission.MANAGE_CALENDAR
        ):
            raise PermissionError("Admin permission is required to manage calendar.")

        return [
            {
                "id": "calendar-001",
                "title": "Client appointment",
                "starts_at": "2026-07-07T09:00:00Z",
                "ends_at": "2026-07-07T10:00:00Z",
                "location": "Main office",
                "related_to": "Sample Client",
            }
        ]
