from datetime import timedelta

from django.utils import timezone

from apps.cases.models import CaseEvent


class LawyerCalendarService:
    @staticmethod
    def list_events(user):
        lawyer = getattr(user, "lawyer_profile", None)
        if lawyer is None:
            raise ValueError("Only lawyers can access this endpoint.")

        events = (
            CaseEvent.objects.filter(case__firm=lawyer.law_firm, case__assigned_lawyer=lawyer)
            .filter(starts_at__gte=timezone.now() - timedelta(days=30))
            .select_related("case")
            .order_by("starts_at")
        )
        return [
            {
                "id": str(event.id),
                "title": f"{event.title} — {event.case.case_number}",
                "start": event.starts_at,
                "end": event.ends_at or event.starts_at,
            }
            for event in events
        ]
