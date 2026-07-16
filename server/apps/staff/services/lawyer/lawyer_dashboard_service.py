from apps.cases.models import Case
from apps.notifications.services import NotificationService


class LawyerDashboardService:
    @staticmethod
    def get_dashboard_data(user):
        if not hasattr(user, "lawyer_profile"):
            raise ValueError("Only lawyers can access this endpoint.")

        lawyer = user.lawyer_profile
        recent_notifications = NotificationService.dashboard_items(user)
        cases = Case.objects.filter(firm=lawyer.law_firm, assigned_lawyer=lawyer)
        active_cases = cases.filter(is_active=True)
        client_count = cases.values("client_id").distinct().count()
        courtroom_cases = active_cases.exclude(court_name="").count()
        return {
            "lawyer": {
                "id": str(lawyer.id),
                "full_name": lawyer.user.full_name,
                "staff_number": lawyer.staff_number,
            },
            "summary": {
                "total_cases": cases.count(),
                "active_cases": active_cases.count(),
                "closed_cases": cases.filter(status=Case.Status.CLOSED).count(),
                "clients": client_count,
                "hearings": courtroom_cases,
                "tasks_due": active_cases.filter(status=Case.Status.PENDING).count(),
                "documents": 0,
                "notifications": NotificationService.unread_count(user),
                "unread_notifications": NotificationService.unread_count(user),
            },
            "upcoming": {
                "next_hearing": "2026-07-10T09:00:00Z",
                "next_deadline": "2026-07-08T17:00:00Z",
            },
            "recent_notifications": recent_notifications,
            "recent_activity": recent_notifications
            or [
                {
                    "id": "activity-001",
                    "title": "Lawyer dashboard ready",
                    "description": "Your legal workspace is active.",
                }
            ],
        }
