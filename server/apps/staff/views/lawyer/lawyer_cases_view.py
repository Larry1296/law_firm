from rest_framework import status
from rest_framework.response import Response

from apps.cases.serializers import CaseCreateSerializer, CaseDetailSerializer
from apps.cases.services import CaseService
from apps.clients.models import Client
from apps.staff.models import Lawyer, LawyerPermission, Secretary
from apps.staff.serializers.lawyer.lawyer_case_serializer import LawyerCaseSerializer
from apps.staff.services.lawyer.lawyer_case_service import LawyerCaseService
from apps.staff.views.lawyer.lawyer_base_view import LawyerBaseView


class LawyerCasesView(LawyerBaseView):
    def get(self, request, case_id=None):
        try:
            if case_id is not None:
                case = LawyerCaseService.get_case(request.user, case_id)
                if case is None:
                    return Response(
                        {"detail": "Case not found."},
                        status=status.HTTP_404_NOT_FOUND,
                    )

                serializer = LawyerCaseSerializer(case)
                return Response({"case": serializer.data}, status=status.HTTP_200_OK)

            cases = LawyerCaseService.list_cases(
                request.user,
                search=request.query_params.get("search"),
                status=request.query_params.get("status"),
                priority=request.query_params.get("priority"),
                case_type=request.query_params.get("case_type"),
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        serializer = LawyerCaseSerializer(cases, many=True)
        return Response({"cases": serializer.data}, status=status.HTTP_200_OK)

    def post(self, request):
        lawyer = getattr(request.user, "lawyer_profile", None)
        if lawyer is None or not lawyer.is_active:
            return Response({"detail": "Only active lawyers can create matters."}, status=status.HTTP_403_FORBIDDEN)
        if not lawyer.has_permission(LawyerPermission.CREATE_CASES):
            return Response({"detail": "Lawyer permission is required to create matters."}, status=status.HTTP_403_FORBIDDEN)

        try:
            serializer = CaseCreateSerializer(
                data=request.data,
                context={"firm": CaseService.get_user_firm(request.user)},
            )
            serializer.is_valid(raise_exception=True)
            case = CaseService.create_case(user=request.user, validated_data=serializer.validated_data)
        except PermissionError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        return Response({"case": CaseDetailSerializer(case).data}, status=status.HTTP_201_CREATED)


class LawyerCaseCreateOptionsView(LawyerBaseView):
    def get(self, request):
        lawyer = getattr(request.user, "lawyer_profile", None)
        if lawyer is None or not lawyer.is_active:
            return Response({"detail": "Only active lawyers can create matters."}, status=status.HTTP_403_FORBIDDEN)
        if not lawyer.has_permission(LawyerPermission.CREATE_CASES):
            return Response({"detail": "Lawyer permission is required to create matters."}, status=status.HTTP_403_FORBIDDEN)

        firm = lawyer.law_firm
        clients = Client.objects.filter(firm=firm, is_active=True).order_by("full_name")
        lawyers = Lawyer.objects.filter(law_firm=firm, is_active=True).select_related("user").order_by("user__first_name", "user__last_name")
        secretaries = Secretary.objects.filter(law_firm=firm, is_active=True).select_related("user").order_by("user__first_name", "user__last_name")

        return Response(
            {
                "clients": [
                    {
                        "id": str(client.id),
                        "client_id": str(client.id),
                        "full_name": client.full_name,
                        "client_type": client.client_type,
                        "lifecycle_status": client.lifecycle_status,
                        "access_type": client.access_type,
                        "portal_access_exists": bool(client.user_id),
                        "email": client.email,
                    }
                    for client in clients
                ],
                "lawyers": [
                    {
                        "id": str(item.id),
                        "membership_id": str(item.id),
                        "full_name": item.user.full_name,
                        "email": item.user.email,
                    }
                    for item in lawyers
                ],
                "secretaries": [
                    {
                        "id": str(item.id),
                        "membership_id": str(item.id),
                        "full_name": item.user.full_name,
                        "email": item.user.email,
                    }
                    for item in secretaries
                ],
            },
            status=status.HTTP_200_OK,
        )
