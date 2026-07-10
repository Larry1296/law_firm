from django.core.exceptions import ObjectDoesNotExist
from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.cases.serializers import CaseDetailSerializer
from apps.cases.services import CaseService


class CaseAssignmentSerializer(serializers.Serializer):
    membership_id = serializers.UUIDField()


class CaseReassignLawyerView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, case_id):
        serializer = CaseAssignmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            case = CaseService.get_case(request.user, case_id)
            case = CaseService.reassign_lawyer(
                case=case,
                lawyer_id=serializer.validated_data["membership_id"],
                actor=request.user,
            )
        except ObjectDoesNotExist:
            return Response({"detail": "Case or lawyer not found."}, status=status.HTTP_404_NOT_FOUND)

        return Response({"data": CaseDetailSerializer(case).data}, status=status.HTTP_200_OK)


class CaseReassignSecretaryView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, case_id):
        serializer = CaseAssignmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            case = CaseService.get_case(request.user, case_id)
            case = CaseService.reassign_secretary(
                case=case,
                secretary_id=serializer.validated_data["membership_id"],
                actor=request.user,
            )
        except ObjectDoesNotExist:
            return Response({"detail": "Case or secretary not found."}, status=status.HTTP_404_NOT_FOUND)

        return Response({"data": CaseDetailSerializer(case).data}, status=status.HTTP_200_OK)
