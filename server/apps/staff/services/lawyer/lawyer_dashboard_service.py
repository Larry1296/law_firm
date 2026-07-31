from apps.cases.models import Case
from apps.clients.models import ClientDocument
from apps.documents.models import DocumentRequest
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
        document_count = ClientDocument.objects.filter(
            client__cases__assigned_lawyer=lawyer,
            client__cases__is_active=True,
        ).distinct().count()
        pending_document_requests = DocumentRequest.objects.filter(
            case__assigned_lawyer=lawyer,
            case__is_active=True,
            status__in=[DocumentRequest.Status.OPEN, DocumentRequest.Status.UPLOADED, DocumentRequest.Status.REPLACEMENT_REQUIRED],
        ).count()
        next_hearing = active_cases.filter(next_court_date__isnull=False).order_by("next_court_date").values_list("next_court_date", flat=True).first()
        next_deadline = active_cases.filter(internal_deadline__isnull=False).order_by("internal_deadline").values_list("internal_deadline", flat=True).first()
        return {
            "lawyer": {
                "id": str(lawyer.id),
                "full_name": lawyer.user.full_name,
                "staff_number": lawyer.staff_number,
            },
            "permissions": list(lawyer.permissions.filter(is_active=True).values_list("code", flat=True)),
            "summary": {
                "total_cases": cases.count(),
                "active_cases": active_cases.count(),
                "closed_cases": cases.filter(status=Case.Status.CLOSED).count(),
                "clients": client_count,
                "hearings": courtroom_cases,
                "tasks_due": active_cases.filter(status=Case.Status.PENDING).count(),
                "documents": document_count,
                "pending_document_requests": pending_document_requests,
                "notifications": NotificationService.unread_count(user),
                "unread_notifications": NotificationService.unread_count(user),
            },
            "upcoming": {
                "next_hearing": next_hearing,
                "next_deadline": next_deadline,
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
