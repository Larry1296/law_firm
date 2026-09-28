from datetime import timedelta

from django.utils import timezone

from apps.cases.models import Case, CaseEvent, MatterDeadline
from apps.cases.services.my_work_service import MyWorkService
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
        now = timezone.now()
        upcoming_events = CaseEvent.objects.filter(
            case__in=active_cases, starts_at__gte=now,
        ).exclude(status__in=["COMPLETED", "ADJOURNED", "VACATED", "TAKEN_OUT", "MISSED"]).order_by("starts_at")
        open_deadlines = MatterDeadline.objects.filter(
            matter__in=active_cases, status=MatterDeadline.Status.OPEN,
        ).order_by("due_at")
        work = MyWorkService.items(user)
        document_count = ClientDocument.objects.filter(
            client__cases__assigned_lawyer=lawyer,
            client__cases__is_active=True,
        ).distinct().count()
        pending_document_requests = DocumentRequest.objects.filter(
            case__assigned_lawyer=lawyer,
            case__is_active=True,
            status__in=[
                DocumentRequest.Status.AWAITING_SECRETARY_DISPATCH,
                DocumentRequest.Status.OPEN,
                DocumentRequest.Status.UPLOADED,
                DocumentRequest.Status.REPLACEMENT_REQUIRED,
            ],
        ).count()
        next_hearing = upcoming_events.values_list("starts_at", flat=True).first()
        next_deadline = open_deadlines.values_list("due_at", flat=True).first()
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
                "closed_cases": cases.filter(matter_status__in=[Case.MatterStatus.CLOSED, Case.MatterStatus.ARCHIVED]).count(),
                "clients": client_count,
                "hearings": upcoming_events.filter(starts_at__lte=now + timedelta(days=30)).count(),
                "tasks_due": len(work),
                "overdue_items": sum(1 for item in work if item["overdue"]),
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
            "recent_activity": recent_notifications,
        }
