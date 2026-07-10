from rest_framework import status
from rest_framework.response import Response

from apps.staff.serializers.admin.lawyers.admin_lawyer_detail_serializer import (
    AdminLawyerDetailSerializer,
)
from apps.staff.serializers.admin.lawyers.admin_lawyer_update_serializer import (
    AdminLawyerUpdateSerializer,
)
from apps.staff.services.admin.lawyers.admin_lawyer_query_service import (
    AdminLawyerQueryService,
)
from apps.staff.services.admin.lawyers.admin_lawyer_update_service import (
    AdminLawyerUpdateService,
)
from apps.staff.views.admin.lawyers.admin_lawyer_base_view import (
    AdminLawyerBaseView,
)


class AdminLawyerUpdateView(AdminLawyerBaseView):
    def patch(self, request, lawyer_id):
        lawyer = AdminLawyerQueryService.get_lawyer(
            lawyer_id=lawyer_id,
            law_firm=self.get_law_firm(),
        )

        serializer = AdminLawyerUpdateSerializer(
            lawyer,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)

        lawyer = AdminLawyerUpdateService.update_lawyer(
            lawyer=lawyer,
            validated_data=serializer.validated_data,
            updated_by=request.user,
        )

        return Response(
            {"lawyer": AdminLawyerDetailSerializer(lawyer).data},
            status=status.HTTP_200_OK,
        )