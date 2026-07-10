from rest_framework import status
from rest_framework.response import Response

from apps.staff.serializers.admin.lawyers.admin_lawyer_detail_serializer import (
    AdminLawyerDetailSerializer,
)
from apps.staff.services.admin.lawyers.admin_lawyer_query_service import (
    AdminLawyerQueryService,
)
from apps.staff.services.admin.lawyers.admin_lawyer_status_service import (
    AdminLawyerStatusService,
)
from apps.staff.views.admin.lawyers.admin_lawyer_base_view import (
    AdminLawyerBaseView,
)


class AdminLawyerDeactivateView(AdminLawyerBaseView):
    def post(self, request, lawyer_id):
        lawyer = AdminLawyerQueryService.get_lawyer(
            lawyer_id=lawyer_id,
            law_firm=self.get_law_firm(),
        )

        lawyer = AdminLawyerStatusService.deactivate_lawyer(
            lawyer=lawyer,
            updated_by=request.user,
        )

        return Response(
            {"lawyer": AdminLawyerDetailSerializer(lawyer).data},
            status=status.HTTP_200_OK,
        )