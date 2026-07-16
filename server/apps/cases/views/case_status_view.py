from django.core.exceptions import ObjectDoesNotExist
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.cases.serializers import CaseDetailSerializer, CaseStatusSerializer
from apps.cases.services import CaseService


class CaseStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, case_id):
        serializer = CaseStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            case = CaseService.get_case(request.user, case_id)
        except ObjectDoesNotExist:
            return Response({"detail": "Case not found."}, status=status.HTTP_404_NOT_FOUND)
        except PermissionError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        try:
            case = CaseService.change_status(
                case=case,
                status=serializer.validated_data["status"],
                note=serializer.validated_data.get("note", ""),
                actor=request.user,
            )
        except PermissionError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)
        return Response({"data": CaseDetailSerializer(case).data}, status=status.HTTP_200_OK)
