class SecretaryDashboardService:
    @staticmethod
    def get_dashboard_data(user):
        if not hasattr(user, "secretary_profile"):
            raise ValueError("Only secretaries can access this endpoint.")

        secretary = user.secretary_profile
        permissions = list(
            secretary.permissions.filter(is_active=True).values_list("code", flat=True)
        )

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
                "pending_tasks": 1,
                "documents_to_prepare": 1 if secretary.can_prepare_documents else 0,
                "appointments_today": 1 if secretary.can_schedule_appointments else 0,
            },
            "permissions": permissions,
            "default_work": {
                "can_prepare_documents": secretary.can_prepare_documents,
                "can_schedule_appointments": secretary.can_schedule_appointments,
                "can_manage_client_intake": secretary.can_manage_client_intake,
                "can_receive_documents": secretary.can_receive_documents,
            },
            "recent_activity": [
                {
                    "id": "activity-001",
                    "title": "Secretary dashboard ready",
                    "description": "Your secretarial workspace is active.",
                }
            ],
        }
