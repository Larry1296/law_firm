from rest_framework import status
from rest_framework.response import Response

from apps.staff.serializers.admin.lawyers.admin_lawyer_detail_serializer import (
    AdminLawyerDetailSerializer,
)
from apps.staff.services.admin.lawyers.admin_lawyer_query_service import (
    AdminLawyerQueryService,
)
from apps.staff.views.admin.lawyers.admin_lawyer_base_view import (
    AdminLawyerBaseView,
)


class AdminLawyerDetailView(AdminLawyerBaseView):
    def get(self, request, lawyer_id):
        try:
            lawyer = AdminLawyerQueryService.get_lawyer(
                lawyer_id=lawyer_id,
                law_firm=self.get_law_firm(),
            )
        except Exception:
            return Response(
                {"detail": "Lawyer not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = AdminLawyerDetailSerializer(lawyer)

        return Response(
            {"lawyer": serializer.data},
            status=status.HTTP_200_OK,
        )
