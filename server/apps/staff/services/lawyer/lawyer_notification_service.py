from apps.notifications.services import NotificationService


class LawyerNotificationService:
    @staticmethod
    def list_notifications(user):
        if not hasattr(user, "lawyer_profile"):
            raise ValueError("Only lawyers can access this endpoint.")

        return NotificationService.list_for_user(user)
