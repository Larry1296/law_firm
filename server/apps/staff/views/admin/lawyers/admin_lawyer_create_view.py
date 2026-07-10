from rest_framework import status
from rest_framework.response import Response

from apps.staff.serializers.admin.lawyers.admin_lawyer_create_serializer import (
    AdminLawyerCreateSerializer,
)
from apps.staff.serializers.admin.lawyers.admin_lawyer_detail_serializer import (
    AdminLawyerDetailSerializer,
)
from apps.staff.services.admin.lawyers.admin_lawyer_create_service import (
    AdminLawyerCreateService,
)
from apps.staff.services.admin.lawyers.admin_lawyer_query_service import (
    AdminLawyerQueryService,
)
from apps.staff.views.admin.lawyers.admin_lawyer_base_view import (
    AdminLawyerBaseView,
)


class AdminLawyerCreateView(AdminLawyerBaseView):
    def post(self, request):
        law_firm = self.get_law_firm()

        serializer = AdminLawyerCreateSerializer(
            data=request.data,
            context={"law_firm": law_firm},
        )
        serializer.is_valid(raise_exception=True)

        lawyer, temp_password = AdminLawyerCreateService.create_lawyer(
            law_firm=law_firm,
            validated_data=serializer.validated_data,
            created_by=request.user,
        )
        lawyer = AdminLawyerQueryService.get_lawyer(
            lawyer_id=lawyer.id,
            law_firm=law_firm,
        )

        return Response(
            {
                "lawyer": AdminLawyerDetailSerializer(lawyer).data,
                "temp_password": temp_password,
            },
            status=status.HTTP_201_CREATED,
        )
