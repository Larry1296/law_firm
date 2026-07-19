from django.core.exceptions import ObjectDoesNotExist
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.cases.serializers import (
    CaseDetailSerializer,
    CaseConflictCheckSerializer,
    ClientSafeConflictCheckSerializer,
    ConflictCheckActionSerializer,
)
from apps.cases.services import CaseService
from apps.cases.services.case_conflict_check_service import CaseConflictCheckService


class CaseConflictCheckView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, case_id):
        try:
            case = CaseService.get_case(request.user, case_id)
        except ObjectDoesNotExist:
            return Response({"detail": "Case not found."}, status=status.HTTP_404_NOT_FOUND)
        except PermissionError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        check = CaseConflictCheckService.existing_check(case)
        if hasattr(request.user, "client_profile"):
            return Response(
                {
                    "conflict_check": {
                        "status": CaseConflictCheckService.client_safe_status(check)
                    }
                },
                status=status.HTTP_200_OK,
            )
        if check:
            conflict_check = CaseConflictCheckSerializer(check, context={"request": request}).data
        else:
            conflict_check = {
                "exists": False,
                "status": "NOT_STARTED",
                "status_label": "Not started",
                "available_actions": (
                    ["INITIATE"]
                    if CaseConflictCheckService.can_initiate(request.user, case)
                    else []
                ),
            }
        return Response({"conflict_check": conflict_check}, status=status.HTTP_200_OK)


class CaseConflictCheckActionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, case_id):
        serializer = ConflictCheckActionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"success": False, "errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            case = CaseService.get_case(request.user, case_id)
        except ObjectDoesNotExist:
            return Response({"detail": "Case not found."}, status=status.HTTP_404_NOT_FOUND)
        except PermissionError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        try:
            check = CaseConflictCheckService.perform_action(
                case=case,
                actor=request.user,
                action=serializer.validated_data["action"],
                effective_at=serializer.validated_data.get("effective_at"),
                reason=serializer.validated_data.get("reason", ""),
                data=serializer.validated_data.get("data") or {},
            )
        except PermissionError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)
        except ValidationError as exc:
            return Response(
                {"success": False, "errors": exc.detail},
                status=status.HTTP_400_BAD_REQUEST,
            )

        case.refresh_from_db()
        return Response(
            {
                "conflict_check": CaseConflictCheckSerializer(check, context={"request": request}).data,
                "data": CaseDetailSerializer(case, context={"request": request}).data,
            },
            status=status.HTTP_200_OK,
        )
