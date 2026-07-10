from rest_framework import status
from rest_framework.response import Response

from apps.staff.serializers.admin.secretaries import AdminSecretaryDetailSerializer
from apps.staff.services.admin.secretaries import (
    AdminSecretaryQueryService,
    AdminSecretaryStatusService,
)
from apps.staff.views.admin.secretaries.admin_secretary_base_view import (
    AdminSecretaryBaseView,
)


class AdminSecretaryDeactivateView(AdminSecretaryBaseView):
    def post(self, request, secretary_id):
        secretary = AdminSecretaryQueryService.get_secretary(
            secretary_id=secretary_id,
            law_firm=self.get_law_firm(),
        )
        secretary = AdminSecretaryStatusService.deactivate_secretary(
            secretary=secretary,
            updated_by=request.user,
        )
        return Response(
            {"secretary": AdminSecretaryDetailSerializer(secretary).data},
            status=status.HTTP_200_OK,
        )
