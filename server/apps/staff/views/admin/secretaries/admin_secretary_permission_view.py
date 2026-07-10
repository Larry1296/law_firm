from rest_framework import status
from rest_framework.response import Response

from apps.staff.serializers.admin.secretaries import (
    AdminSecretaryDetailSerializer,
    AdminSecretaryPermissionSerializer,
)
from apps.staff.services.admin.secretaries import (
    AdminSecretaryPermissionService,
    AdminSecretaryQueryService,
)
from apps.staff.views.admin.secretaries.admin_secretary_base_view import (
    AdminSecretaryBaseView,
)


class AdminSecretaryPermissionView(AdminSecretaryBaseView):
    def post(self, request, secretary_id):
        serializer = AdminSecretaryPermissionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        secretary = AdminSecretaryQueryService.get_secretary(
            secretary_id=secretary_id,
            law_firm=self.get_law_firm(),
        )
        secretary = AdminSecretaryPermissionService.sync_permissions(
            secretary=secretary,
            permission_codes=serializer.validated_data["permission_codes"],
            granted_by=request.user,
        )
        return Response(
            {"secretary": AdminSecretaryDetailSerializer(secretary).data},
            status=status.HTTP_200_OK,
        )
