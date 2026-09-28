from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.clients.models import ClientComplianceReview, EngagementRecord

DONE, CURRENT, UPCOMING = "completed", "current", "upcoming"
ENGAGEMENT_DONE = {"READY", "WAIVED", "NOT_REQUIRED"}


class ClientOnboardingStatusView(APIView):
    """
    Where the firm is with each set of instructions, in plain language.

    It exposes only the client's own progress. Conflict-search results, other
    parties' names and internal notes are never included.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        client = getattr(request.user, "client_profile", None)
        if client is None:
            raise PermissionDenied("Only clients can view onboarding status.")

        review = ClientComplianceReview.objects.filter(client=client).first()
        identity_done = bool(review) and review.identity_status in {"VERIFIED", "NOT_APPLICABLE"} and review.due_diligence_status == "CLEARED"

        instructions = []
        for check in client.matter_conflict_checks.filter(firm=client.firm).order_by("-created_at"):
            engagement = (
                EngagementRecord.objects.filter(proposed_matter=check)
                .exclude(status__in=["SUPERSEDED", "CANCELLED"])
                .order_by("-created_at")
                .first()
            )
            matter = check.created_case
            flags = [
                ("Instructions received", True),
                ("Conflict of interest check", check.status == "CLEARED"),
                ("Firm accepts instructions", check.acceptance_decision == "ACCEPTED"),
                ("Identity and due diligence", identity_done),
                ("Engagement letter signed and approved", bool(engagement) and engagement.status in ENGAGEMENT_DONE),
                ("Matter opened", matter is not None),
            ]
            steps, current_marked = [], False
            for label, done in flags:
                if done:
                    state = DONE
                elif not current_marked:
                    state, current_marked = CURRENT, True
                else:
                    state = UPCOMING
                steps.append({"label": label, "state": state})

            declined = check.acceptance_decision in {"DECLINED", "CLIENT_WITHDREW"} or check.status == "CONFLICT_CONFIRMED"
            instructions.append({
                "reference": check.reference_number,
                "title": check.proposed_matter_title,
                "received_on": check.created_at.date(),
                "outcome": (
                    "The firm is unable to act on these instructions. Your advocate will contact you."
                    if declined else ""
                ),
                "engagement_status": engagement.get_status_display() if engagement else "Not started",
                "matter": {"id": str(matter.id), "case_number": matter.case_number} if matter else None,
                "steps": steps,
            })

        return Response({
            "client": {
                "full_name": client.full_name,
                "lifecycle_status": client.lifecycle_status,
                "portal_status": client.portal_status,
            },
            "firm": {
                "name": client.firm.name,
                "email": client.firm.email,
                "phone_number": client.firm.phone_number,
            },
            "instructions": instructions,
        })
