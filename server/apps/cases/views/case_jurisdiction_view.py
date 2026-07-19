from django.core.exceptions import ObjectDoesNotExist
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.cases.serializers import CaseDetailSerializer, CaseJurisdictionActionSerializer
from apps.cases.services import CaseService
from apps.cases.services.case_jurisdiction_service import CaseJurisdictionService


class CaseJurisdictionVerificationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, case_id):
        serializer = CaseJurisdictionActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            case = CaseService.get_case(request.user, case_id)
        except ObjectDoesNotExist:
            return Response({"detail": "Case not found."}, status=status.HTTP_404_NOT_FOUND)
        except PermissionError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        try:
            action = serializer.validated_data["action"]
            if action == "VERIFY":
                case = CaseJurisdictionService.verify(
                    case=case,
                    actor=request.user,
                    data=serializer.validated_data,
                )
            elif action == "VERIFY_CTS":
                case = CaseJurisdictionService.verify_cts_reference(
                    case=case,
                    actor=request.user,
                    data=serializer.validated_data,
                )
            else:
                case = CaseJurisdictionService.revoke(
                    case=case,
                    actor=request.user,
                    reason=serializer.validated_data.get("reason", ""),
                )
        except PermissionError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)
        except ValidationError as exc:
            return Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {"data": CaseDetailSerializer(case, context={"request": request}).data},
            status=status.HTTP_200_OK,
        )
