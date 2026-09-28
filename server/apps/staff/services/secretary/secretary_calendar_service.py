from datetime import timedelta

from django.db.models import Q
from django.utils import timezone

from apps.cases.models import CaseEvent
from apps.staff.models import SecretaryPermission


class SecretaryCalendarService:
    @staticmethod
    def list_events(user):
        secretary = getattr(user, "secretary_profile", None)
        if secretary is None:
            raise ValueError("Only secretaries can access this endpoint.")

        if not secretary.can_schedule_appointments and not secretary.has_permission(
            SecretaryPermission.MANAGE_CALENDAR
        ):
            raise PermissionError("Admin permission is required to manage calendar.")

        events = (
            CaseEvent.objects.filter(case__firm=secretary.law_firm)
            .filter(Q(case__assigned_secretary=secretary) | Q(case__assigned_lawyer__in=secretary.assigned_lawyers.all()))
            .filter(starts_at__gte=timezone.now() - timedelta(days=30))
            .select_related("case", "case__client")
            .distinct()
            .order_by("starts_at")
        )
        return [
            {
                "id": str(event.id),
                "title": event.title,
                "starts_at": event.starts_at,
                "ends_at": event.ends_at or event.starts_at,
                "location": event.physical_venue or event.court or ("Virtual" if event.virtual_meeting_url else ""),
                "related_to": f"{event.case.case_number} · {getattr(event.case.client, 'full_name', '')}",
            }
            for event in events
        ]
