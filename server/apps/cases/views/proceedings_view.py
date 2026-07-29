from django.core.exceptions import ObjectDoesNotExist
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.cases.serializers import CaseDetailSerializer, ProceedingOutcomeSerializer
from apps.cases.services import CaseService
from apps.cases.services.proceedings_workflow_service import ProceedingsWorkflowService
from apps.events.serializers import EventSerializer


class AllowedNextEventsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, case_id):
        try:
            case = CaseService.get_case(request.user, case_id)
            event_id = request.query_params.get("event_id")
            event = case.events.filter(id=event_id).first() if event_id else None
            ProceedingsWorkflowService.ensure_can_record(request.user, case)
        except (ObjectDoesNotExist, ValueError):
            return Response({"detail": "Case not found."}, status=status.HTTP_404_NOT_FOUND)
        except PermissionError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)
        return Response({
            "current_stage": case.lifecycle_stage,
            "current_event": event.event_type if event else None,
            "allowed_next_events": ProceedingsWorkflowService.allowed_next_events(case, event),
        })


class RecordProceedingOutcomeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, case_id, event_id):
        serializer = ProceedingOutcomeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            case = CaseService.get_case(request.user, case_id)
            event, next_event, case = ProceedingsWorkflowService.record_outcome(
                case=case, event_id=event_id, actor=request.user, data=serializer.validated_data
            )
        except ObjectDoesNotExist:
            return Response({"detail": "Case or event not found."}, status=status.HTTP_404_NOT_FOUND)
        except PermissionError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)
        return Response({
            "event": EventSerializer(event).data,
            "next_event": EventSerializer(next_event).data if next_event else None,
            "case": CaseDetailSerializer(case, context={"request": request}).data,
        })
