from django.core.exceptions import ObjectDoesNotExist
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.cases.models import CaseEvent, CaseLifecycleTransition
from apps.cases.serializers import (
    CaseDetailSerializer,
    CaseLifecycleTransitionRequestSerializer,
    CaseLifecycleTransitionSerializer,
)
from apps.cases.services import CaseService
from apps.cases.services.case_lifecycle_service import CaseLifecycleService


class CaseLifecycleTransitionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, case_id):
        serializer = CaseLifecycleTransitionRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            case = CaseService.get_case(request.user, case_id)
        except ObjectDoesNotExist:
            return Response({"detail": "Case not found."}, status=status.HTTP_404_NOT_FOUND)
        except PermissionError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        data = serializer.validated_data
        source_event = None
        correction_of = None
        if data.get("source_event_id"):
            source_event = CaseEvent.objects.filter(
                id=data["source_event_id"],
                case=case,
            ).first()
            if source_event is None:
                raise ValidationError({"source_event_id": "Source event was not found for this case."})
        if data.get("correction_of_id"):
            correction_of = CaseLifecycleTransition.objects.filter(
                id=data["correction_of_id"],
                case=case,
            ).first()
            if correction_of is None:
                raise ValidationError({"correction_of_id": "Transition to correct was not found for this case."})

        try:
            transition = CaseLifecycleService.transition(
                case=case,
                actor=request.user,
                dimension=data["dimension"],
                to_state=data["to_state"],
                effective_at=data.get("effective_at"),
                reason=data["reason"],
                metadata=data.get("metadata") or {},
                source_event=source_event,
                correction_of=correction_of,
            )
        except PermissionError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        case.refresh_from_db()
        return Response(
            {
                "data": CaseDetailSerializer(case, context={"request": request}).data,
                "transition": CaseLifecycleTransitionSerializer(transition).data,
            },
            status=status.HTTP_200_OK,
        )
