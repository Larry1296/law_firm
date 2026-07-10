from django.core.exceptions import ObjectDoesNotExist
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.cases.serializers import CaseDetailSerializer, CaseUpdateSerializer
from apps.cases.services import CaseService


class CaseDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_case(self, request, case_id):
        return CaseService.get_case(request.user, case_id)

    def get(self, request, case_id):
        try:
            case = self.get_case(request, case_id)
        except ObjectDoesNotExist:
            return Response({"detail": "Case not found."}, status=status.HTTP_404_NOT_FOUND)
        except PermissionError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        return Response({"data": CaseDetailSerializer(case).data}, status=status.HTTP_200_OK)

    def patch(self, request, case_id):
        try:
            case = self.get_case(request, case_id)
        except ObjectDoesNotExist:
            return Response({"detail": "Case not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = CaseUpdateSerializer(case, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        case = CaseService.update_case(
            case=case,
            validated_data=serializer.validated_data,
            actor=request.user,
        )
        return Response({"data": CaseDetailSerializer(case).data}, status=status.HTTP_200_OK)
