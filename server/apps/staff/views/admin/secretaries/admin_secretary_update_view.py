from rest_framework import status
from rest_framework.response import Response

from apps.staff.serializers.admin.secretaries import (
    AdminSecretaryDetailSerializer,
    AdminSecretaryUpdateSerializer,
)
from apps.staff.services.admin.secretaries import (
    AdminSecretaryQueryService,
    AdminSecretaryUpdateService,
)
from apps.staff.views.admin.secretaries.admin_secretary_base_view import (
    AdminSecretaryBaseView,
)


class AdminSecretaryUpdateView(AdminSecretaryBaseView):
    def patch(self, request, secretary_id):
        secretary = AdminSecretaryQueryService.get_secretary(
            secretary_id=secretary_id,
            law_firm=self.get_law_firm(),
        )
        serializer = AdminSecretaryUpdateSerializer(
            secretary,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)

        secretary = AdminSecretaryUpdateService.update_secretary(
            secretary=secretary,
            validated_data=serializer.validated_data,
            updated_by=request.user,
        )

        return Response(
            {"secretary": AdminSecretaryDetailSerializer(secretary).data},
            status=status.HTTP_200_OK,
        )
