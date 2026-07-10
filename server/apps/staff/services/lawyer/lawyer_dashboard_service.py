from apps.staff.models.lawyer import Lawyer


class LawyerDashboardService:
    @staticmethod
    def get_dashboard_data(user):
        if not hasattr(user, "lawyer_profile"):
            raise ValueError("Only lawyers can access this endpoint.")

        lawyer = user.lawyer_profile
        return {
            "lawyer": {
                "id": str(lawyer.id),
                "full_name": lawyer.user.full_name,
                "staff_number": lawyer.staff_number,
            },
            "summary": {
                "active_cases": 4,
                "clients": 12,
                "tasks_due": 3,
                "documents": 7,
            },
            "upcoming": {
                "next_hearing": "2026-07-10T09:00:00Z",
                "next_deadline": "2026-07-08T17:00:00Z",
            },
            "recent_activity": [
                "Case update submitted",
                "Client note added",
                "Document uploaded",
            ],
        }
