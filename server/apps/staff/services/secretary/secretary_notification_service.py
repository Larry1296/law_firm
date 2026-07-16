from apps.notifications.services import NotificationService


class SecretaryNotificationService:
    @staticmethod
    def list_notifications(user):
        if not hasattr(user, "secretary_profile"):
            raise ValueError("Only secretaries can access this endpoint.")

        return NotificationService.list_for_user(user)
