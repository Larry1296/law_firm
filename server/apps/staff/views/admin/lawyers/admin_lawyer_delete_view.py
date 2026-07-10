from rest_framework import status
from rest_framework.response import Response

from apps.staff.services.admin.lawyers.admin_lawyer_delete_service import (
    AdminLawyerDeleteService,
)
from apps.staff.services.admin.lawyers.admin_lawyer_query_service import (
    AdminLawyerQueryService,
)
from apps.staff.views.admin.lawyers.admin_lawyer_base_view import (
    AdminLawyerBaseView,
)


class AdminLawyerDeleteView(AdminLawyerBaseView):
    def delete(self, request, lawyer_id):
        lawyer = AdminLawyerQueryService.get_lawyer(
            lawyer_id=lawyer_id,
            law_firm=self.get_law_firm(),
        )

        AdminLawyerDeleteService.delete_lawyer(
            lawyer=lawyer,
            deleted_by=request.user,
        )

        return Response(
            {"detail": "Lawyer deleted successfully."},
            status=status.HTTP_200_OK,
        )