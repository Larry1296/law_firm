from rest_framework import status
from rest_framework.response import Response

from apps.staff.serializers.admin.lawyers import (
    AdminLawyerDetailSerializer,
    AdminLawyerPermissionSerializer,
)
from apps.staff.services.admin.lawyers import (
    AdminLawyerPermissionService,
    AdminLawyerQueryService,
)
from apps.staff.views.admin.lawyers.admin_lawyer_base_view import (
    AdminLawyerBaseView,
)


class AdminLawyerPermissionView(AdminLawyerBaseView):
    def post(self, request, lawyer_id):
        serializer = AdminLawyerPermissionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        lawyer = AdminLawyerQueryService.get_lawyer(
            lawyer_id=lawyer_id,
            law_firm=self.get_law_firm(),
        )
        lawyer = AdminLawyerPermissionService.sync_permissions(
            lawyer=lawyer,
            permission_codes=serializer.validated_data["permission_codes"],
            granted_by=request.user,
        )

        return Response(
            {"lawyer": AdminLawyerDetailSerializer(lawyer).data},
            status=status.HTTP_200_OK,
        )
