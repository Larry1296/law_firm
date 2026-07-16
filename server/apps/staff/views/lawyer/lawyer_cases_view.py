from rest_framework import status
from rest_framework.response import Response

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
