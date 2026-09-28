from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.ai.models import CourtPreparationBrief
from apps.ai.services.court_preparation_service import CourtPreparationService
from apps.cases.models import CaseEvent


def brief_payload(event, brief):
    case = event.case
    session = getattr(event, "courtroom_session", None)
    return {
        "event": {
            "id": str(event.id), "type": event.get_event_type_display(), "title": event.title,
            "starts_at": event.starts_at, "court": event.court_station or event.court,
            "courtroom": event.courtroom, "judicial_officer": event.judicial_officer,
            "hearing_mode": event.get_hearing_mode_display(),
            "virtual_link_attached": session is not None,
        },
        "case": {
            "id": str(case.id), "case_number": case.case_number, "title": case.title,
            "official_court_case_number": case.official_court_case_number,
        },
        "brief": {
            "id": str(brief.id), "version": brief.version, "readiness": brief.readiness,
            "checks": brief.checks, "guidance": brief.guidance, "tailored": brief.tailored,
            "generated_at": brief.generated_at,
        },
    }


class AdvocateCourtPreparationView(APIView):
    """The advocate's upcoming sittings (next 14 days), each with a current preparation brief."""

    permission_classes = (IsAuthenticated,)

    def get(self, request):
        if not hasattr(request.user, "lawyer_profile"):
            return Response({"detail": "Court preparation is available to advocates."}, status=403)
        try:
            items = CourtPreparationService.briefs_for_advocate(request.user)
        except PermissionError as exc:
            return Response({"detail": str(exc)}, status=403)
        return Response({"sittings": [brief_payload(event, brief) for event, brief in items]})


class AdvocateCourtPreparationRefreshView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request, event_id):
        event = CaseEvent.objects.select_related("case", "case__firm", "case__client").filter(id=event_id).first()
        if event is None or not CourtPreparationService.advocate_can_use(request.user, event.case):
            return Response({"detail": "Sitting not found."}, status=404)
        brief = CourtPreparationService.generate(event, CourtPreparationBrief.Audience.ADVOCATE)
        return Response(brief_payload(event, brief))


class ClientCourtPreparationView(APIView):
    """The client's upcoming sittings with plain-language preparation guidance."""

    permission_classes = (IsAuthenticated,)

    def get(self, request):
        client = getattr(request.user, "client_profile", None)
        if client is None:
            return Response({"detail": "Only clients can access this endpoint."}, status=403)
        items = CourtPreparationService.briefs_for_client(client)
        return Response({"sittings": [brief_payload(event, brief) for event, brief in items]})
