from rest_framework import status
from rest_framework.response import Response

from apps.staff.serializers.admin.secretaries import (
    AdminSecretaryCreateSerializer,
    AdminSecretaryDetailSerializer,
)
from apps.staff.services.admin.secretaries import AdminSecretaryCreateService
from apps.staff.services.admin.secretaries.admin_secretary_query_service import (
    AdminSecretaryQueryService,
)
from apps.staff.views.admin.secretaries.admin_secretary_base_view import (
    AdminSecretaryBaseView,
)


class AdminSecretaryCreateView(AdminSecretaryBaseView):
    def post(self, request):
        law_firm = self.get_law_firm()
        serializer = AdminSecretaryCreateSerializer(
            data=request.data,
            context={"law_firm": law_firm},
        )
        serializer.is_valid(raise_exception=True)

        secretary, temp_password = AdminSecretaryCreateService.create_secretary(
            law_firm=law_firm,
            validated_data=serializer.validated_data,
            created_by=request.user,
        )
        secretary = AdminSecretaryQueryService.get_secretary(
            secretary_id=secretary.id,
            law_firm=law_firm,
        )

        return Response(
            {
                "secretary": AdminSecretaryDetailSerializer(secretary).data,
                "temp_password": temp_password,
            },
            status=status.HTTP_201_CREATED,
        )
