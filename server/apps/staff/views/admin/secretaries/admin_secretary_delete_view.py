from rest_framework import status
from rest_framework.response import Response

from apps.staff.services.admin.secretaries import (
    AdminSecretaryDeleteService,
    AdminSecretaryQueryService,
)
from apps.staff.views.admin.secretaries.admin_secretary_base_view import (
    AdminSecretaryBaseView,
)


class AdminSecretaryDeleteView(AdminSecretaryBaseView):
    def delete(self, request, secretary_id):
        secretary = AdminSecretaryQueryService.get_secretary(
            secretary_id=secretary_id,
            law_firm=self.get_law_firm(),
        )
        AdminSecretaryDeleteService.delete_secretary(
            secretary=secretary,
            deleted_by=request.user,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)
