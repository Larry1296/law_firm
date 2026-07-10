from rest_framework import status
from rest_framework.response import Response

from apps.staff.serializers.admin.secretaries import AdminSecretaryDetailSerializer
from apps.staff.services.admin.secretaries import AdminSecretaryQueryService
from apps.staff.views.admin.secretaries.admin_secretary_base_view import (
    AdminSecretaryBaseView,
)


class AdminSecretaryDetailView(AdminSecretaryBaseView):
    def get(self, request, secretary_id):
        try:
            secretary = AdminSecretaryQueryService.get_secretary(
                secretary_id=secretary_id,
                law_firm=self.get_law_firm(),
            )
        except Exception:
            return Response(
                {"detail": "Secretary not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(
            {"secretary": AdminSecretaryDetailSerializer(secretary).data},
            status=status.HTTP_200_OK,
        )
