from apps.common.choices import FirmRole
from apps.staff.models import IT, ITPermissionGrant
from apps.staff.serializers.admin.it import (
    AdminITChangeStatusSerializer,
    AdminITCreateSerializer,
    AdminITDetailSerializer,
    AdminITListSerializer,
    AdminITPermissionSerializer,
    AdminITUpdateSerializer,
)
from apps.staff.views.admin.generic_staff_admin_views import (
    GenericAdminStaffActivateView,
    GenericAdminStaffBaseView,
    GenericAdminStaffChangeStatusView,
    GenericAdminStaffCreateView,
    GenericAdminStaffDeactivateView,
    GenericAdminStaffDeleteView,
    GenericAdminStaffDetailView,
    GenericAdminStaffListView,
    GenericAdminStaffPermissionView,
    GenericAdminStaffUpdateView,
)


class AdminITBaseView(GenericAdminStaffBaseView):
    model = IT
    permission_model = ITPermissionGrant
    permission_relation_name = "it"
    firm_role = FirmRole.IT
    staff_number_prefix = "IT"
    staff_response_key = "it"
    list_response_key = "it_staff"
    create_serializer_class = AdminITCreateSerializer
    list_serializer_class = AdminITListSerializer
    detail_serializer_class = AdminITDetailSerializer
    update_serializer_class = AdminITUpdateSerializer
    change_status_serializer_class = AdminITChangeStatusSerializer
    permission_serializer_class = AdminITPermissionSerializer
    not_found_message = "IT staff member not found."


class AdminITListView(AdminITBaseView, GenericAdminStaffListView):
    pass


class AdminITCreateView(AdminITBaseView, GenericAdminStaffCreateView):
    pass


class AdminITDetailView(AdminITBaseView, GenericAdminStaffDetailView):
    pass


class AdminITUpdateView(AdminITBaseView, GenericAdminStaffUpdateView):
    pass


class AdminITDeleteView(AdminITBaseView, GenericAdminStaffDeleteView):
    pass


class AdminITActivateView(AdminITBaseView, GenericAdminStaffActivateView):
    pass


class AdminITDeactivateView(AdminITBaseView, GenericAdminStaffDeactivateView):
    pass


class AdminITChangeStatusView(AdminITBaseView, GenericAdminStaffChangeStatusView):
    pass


class AdminITPermissionView(AdminITBaseView, GenericAdminStaffPermissionView):
    pass


__all__ = [
    "AdminITActivateView",
    "AdminITBaseView",
    "AdminITChangeStatusView",
    "AdminITCreateView",
    "AdminITDeactivateView",
    "AdminITDeleteView",
    "AdminITDetailView",
    "AdminITListView",
    "AdminITPermissionView",
    "AdminITUpdateView",
]
