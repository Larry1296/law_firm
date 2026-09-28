from django.utils import timezone

from apps.cases.models import Case, CaseEvent
from apps.documents.models import DocumentRequest
from apps.notifications.services import NotificationService


class ClientDashboardService:
    @staticmethod
    def get_dashboard_data(client):
        cases = client.cases.filter(firm=client.firm)
        active_cases = cases.filter(is_active=True)
        document_count = client.documents.count()
        now = timezone.now()
        upcoming_events = CaseEvent.objects.filter(
            case__in=active_cases, is_client_visible=True, starts_at__gte=now,
        ).exclude(status__in=["COMPLETED", "ADJOURNED", "VACATED", "TAKEN_OUT", "MISSED"]).order_by("starts_at")
        next_event = upcoming_events.select_related("case").first()
        next_request = (
            DocumentRequest.objects.filter(
                client=client, due_date__isnull=False,
                status__in=[DocumentRequest.Status.OPEN, DocumentRequest.Status.REPLACEMENT_REQUIRED],
            ).order_by("due_date").first()
        )
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
                "closed_cases": cases.filter(matter_status__in=[Case.MatterStatus.CLOSED, Case.MatterStatus.ARCHIVED]).count(),
                "urgent_cases": active_cases.filter(priority=Case.Priority.URGENT).count(),
                "upcoming_hearings": upcoming_events.count(),
                "next_court_date": (
                    {"title": next_event.title, "starts_at": next_event.starts_at, "case_number": next_event.case.case_number}
                    if next_event else None
                ),
                "documents": document_count,
                "unread_notifications": unread_notifications,
                "next_deadline": (
                    {"title": f"Provide: {next_request.title}", "due_date": next_request.due_date}
                    if next_request else None
                ),
            },
            "recent_activity": NotificationService.dashboard_items(client.user)
            if client.user_id
            else [],
        }
