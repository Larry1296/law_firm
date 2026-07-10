class ClientDashboardService:
    @staticmethod
    def get_dashboard_data(client):
        return {
            "summary": {
                "active_cases": 2,
                "documents": 3,
                "next_deadline": "2026-07-10",
            },
            "recent_activity": [
                "Document uploaded",
                "Case updated",
            ],
        }
