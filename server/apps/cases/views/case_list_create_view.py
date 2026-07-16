from django.core.exceptions import ObjectDoesNotExist
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.cases.serializers import CaseCreateSerializer, CaseDetailSerializer, CaseSerializer
from apps.cases.services import CaseService


class CaseListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            queryset = CaseService.list_cases(
                request.user,
                search=request.query_params.get("search"),
                status=request.query_params.get("status"),
                priority=request.query_params.get("priority"),
                case_type=request.query_params.get("case_type"),
            )
        except PermissionError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        cases = CaseSerializer(queryset, many=True).data
        return Response(
            {
                "data": {
                    "summary": CaseService.summary(queryset),
                    "cases": cases,
                    "lawyer_performance": [],
                    "top_clients": [],
                    "court_distribution": [],
                    "case_type_breakdown": [],
                    "status_breakdown": [],
                    "priority_breakdown": [],
                    "monthly_case_intake": [],
                },
                "summary": CaseService.summary(queryset),
                "cases": cases,
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        serializer = CaseCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            case = CaseService.create_case(
                user=request.user,
                validated_data=serializer.validated_data,
            )
        except ObjectDoesNotExist:
            return Response(
                {"detail": "Selected client or staff assignment was not found."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except PermissionError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        return Response(
            {
                "data": CaseDetailSerializer(case, context={"request": request}).data,
                "case": CaseDetailSerializer(case, context={"request": request}).data,
            },
            status=status.HTTP_201_CREATED,
        )
