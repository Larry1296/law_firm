from apps.cases.models import Case
from apps.clients.services.client.client_document_service import ClientDocumentService
from apps.notifications.services import NotificationService


class ClientDashboardService:
    @staticmethod
    def get_dashboard_data(client):
        cases = client.cases.filter(firm=client.firm)
        active_cases = cases.filter(is_active=True)
        documents = ClientDocumentService.list_documents(client)
        unread_notifications = (
            NotificationService.unread_count(client.user)
            if client.user_id
            else 0
        )

        return {
            "client": {
                "id": str(client.id),
                "full_name": client.full_name,
                "email": client.email,
                "client_type": client.client_type,
                "lifecycle_status": client.lifecycle_status,
                "is_verified": client.is_verified,
            },
            "firm": {
                "id": str(client.firm_id),
                "name": client.firm.name,
                "email": client.firm.email,
                "phone_number": client.firm.phone_number,
            },
            "summary": {
                "total_cases": cases.count(),
                "active_cases": active_cases.count(),
                "closed_cases": cases.filter(status=Case.Status.CLOSED).count(),
                "urgent_cases": active_cases.filter(priority=Case.Priority.URGENT).count(),
                "upcoming_hearings": active_cases.exclude(court_name="").count(),
                "documents": len(documents),
                "unread_notifications": unread_notifications,
                "next_deadline": None,
            },
            "recent_activity": NotificationService.dashboard_items(client.user)
            if client.user_id
            else [],
        }
