from apps.common.choices import FirmRole
from apps.staff.models import HR, HRPermissionGrant
from apps.staff.serializers.admin.hr import (
    AdminHRChangeStatusSerializer,
    AdminHRCreateSerializer,
    AdminHRDetailSerializer,
    AdminHRListSerializer,
    AdminHRPermissionSerializer,
    AdminHRUpdateSerializer,
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


class AdminHRBaseView(GenericAdminStaffBaseView):
    model = HR
    permission_model = HRPermissionGrant
    permission_relation_name = "hr"
    firm_role = FirmRole.HR
    staff_number_prefix = "HR"
    staff_response_key = "hr"
    list_response_key = "hr_staff"
    create_serializer_class = AdminHRCreateSerializer
    list_serializer_class = AdminHRListSerializer
    detail_serializer_class = AdminHRDetailSerializer
    update_serializer_class = AdminHRUpdateSerializer
    change_status_serializer_class = AdminHRChangeStatusSerializer
    permission_serializer_class = AdminHRPermissionSerializer
    not_found_message = "HR staff member not found."


class AdminHRListView(AdminHRBaseView, GenericAdminStaffListView):
    pass


class AdminHRCreateView(AdminHRBaseView, GenericAdminStaffCreateView):
    pass


class AdminHRDetailView(AdminHRBaseView, GenericAdminStaffDetailView):
    pass


class AdminHRUpdateView(AdminHRBaseView, GenericAdminStaffUpdateView):
    pass


class AdminHRDeleteView(AdminHRBaseView, GenericAdminStaffDeleteView):
    pass


class AdminHRActivateView(AdminHRBaseView, GenericAdminStaffActivateView):
    pass


class AdminHRDeactivateView(AdminHRBaseView, GenericAdminStaffDeactivateView):
    pass


class AdminHRChangeStatusView(AdminHRBaseView, GenericAdminStaffChangeStatusView):
    pass


class AdminHRPermissionView(AdminHRBaseView, GenericAdminStaffPermissionView):
    pass


__all__ = [
    "AdminHRActivateView",
    "AdminHRBaseView",
    "AdminHRChangeStatusView",
    "AdminHRCreateView",
    "AdminHRDeactivateView",
    "AdminHRDeleteView",
    "AdminHRDetailView",
    "AdminHRListView",
    "AdminHRPermissionView",
    "AdminHRUpdateView",
]
