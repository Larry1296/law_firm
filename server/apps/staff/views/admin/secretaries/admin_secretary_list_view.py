from rest_framework import status
from rest_framework.response import Response

from apps.staff.serializers.admin.secretaries import AdminSecretaryListSerializer
from apps.staff.services.admin.secretaries import AdminSecretaryQueryService
from apps.staff.views.admin.secretaries.admin_secretary_base_view import (
    AdminSecretaryBaseView,
)


class AdminSecretaryListView(AdminSecretaryBaseView):
    def get(self, request):
        law_firm = self.get_law_firm()
        secretaries = AdminSecretaryQueryService.list_secretaries(
            law_firm=law_firm,
            employment_status=request.query_params.get("employment_status"),
            is_active=request.query_params.get("is_active"),
            search=request.query_params.get("search"),
        )

        serializer = AdminSecretaryListSerializer(secretaries, many=True)
        active = secretaries.filter(is_active=True).count()
        inactive = secretaries.filter(is_active=False).count()

        return Response(
            {
                "secretaries": serializer.data,
                "metadata": {
                    "total_records": secretaries.count(),
                    "summary": {
                        "active": active,
                        "inactive": inactive,
                    },
                },
            },
            status=status.HTTP_200_OK,
        )
