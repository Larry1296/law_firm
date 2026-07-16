from apps.notifications.services import NotificationService
from apps.staff.services.secretary.secretary_case_service import SecretaryCaseService
from apps.staff.services.secretary.secretary_client_service import SecretaryClientService


class SecretaryDashboardService:
    @staticmethod
    def get_dashboard_data(user):
        if not hasattr(user, "secretary_profile"):
            raise ValueError("Only secretaries can access this endpoint.")

        secretary = user.secretary_profile
        recent_notifications = NotificationService.dashboard_items(user)
        permissions = list(
            secretary.permissions.filter(is_active=True).values_list("code", flat=True)
        )
        cases = SecretaryCaseService.list_cases(user)
        clients = SecretaryClientService.list_clients(user)

        return {
            "profile": {
                "id": str(secretary.id),
                "full_name": user.full_name,
                "email": user.email,
                "firm_role": secretary.firm_role,
                "job_title": secretary.job_title,
                "law_firm": secretary.law_firm.name,
            },
            "summary": {
                "assigned_lawyers": secretary.assigned_lawyers.count(),
                "cases": cases.count(),
                "active_cases": cases.filter(is_active=True).count(),
                "clients": clients.count(),
                "pending_tasks": cases.filter(status="PENDING").count(),
                "documents_to_prepare": 0,
                "appointments_today": cases.exclude(court_name="").count()
                if secretary.can_schedule_appointments
                else 0,
                "notifications": NotificationService.unread_count(user),
                "unread_notifications": NotificationService.unread_count(user),
            },
            "permissions": permissions,
            "default_work": {
                "can_prepare_documents": secretary.can_prepare_documents,
                "can_schedule_appointments": secretary.can_schedule_appointments,
                "can_manage_client_intake": secretary.can_manage_client_intake,
                "can_receive_documents": secretary.can_receive_documents,
            },
            "recent_notifications": recent_notifications,
            "recent_activity": recent_notifications or [
                {
                    "id": "activity-001",
                    "title": "Secretary dashboard ready",
                    "description": "Your secretarial workspace is active.",
                }
            ],
        }
