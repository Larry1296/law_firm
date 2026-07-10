from rest_framework import status
from rest_framework.response import Response

from apps.staff.serializers.admin.secretaries import (
    AdminSecretaryChangeStatusSerializer,
    AdminSecretaryDetailSerializer,
)
from apps.staff.services.admin.secretaries import (
    AdminSecretaryQueryService,
    AdminSecretaryStatusService,
)
from apps.staff.views.admin.secretaries.admin_secretary_base_view import (
    AdminSecretaryBaseView,
)


class AdminSecretaryChangeStatusView(AdminSecretaryBaseView):
    def post(self, request, secretary_id):
        serializer = AdminSecretaryChangeStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        secretary = AdminSecretaryQueryService.get_secretary(
            secretary_id=secretary_id,
            law_firm=self.get_law_firm(),
        )
        secretary = AdminSecretaryStatusService.change_status(
            secretary=secretary,
            employment_status=serializer.validated_data["employment_status"],
            termination_reason=serializer.validated_data.get("termination_reason"),
            updated_by=request.user,
        )
        return Response(
            {"secretary": AdminSecretaryDetailSerializer(secretary).data},
            status=status.HTTP_200_OK,
        )
