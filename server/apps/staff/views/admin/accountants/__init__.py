from apps.common.choices import FirmRole
from apps.staff.models import Accountant, AccountantPermissionGrant
from apps.staff.serializers.admin.accountants import (
    AdminAccountantChangeStatusSerializer,
    AdminAccountantCreateSerializer,
    AdminAccountantDetailSerializer,
    AdminAccountantListSerializer,
    AdminAccountantPermissionSerializer,
    AdminAccountantUpdateSerializer,
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


class AdminAccountantBaseView(GenericAdminStaffBaseView):
    model = Accountant
    permission_model = AccountantPermissionGrant
    permission_relation_name = "accountant"
    firm_role = FirmRole.ACCOUNTANT
    staff_number_prefix = "ACC"
    staff_response_key = "accountant"
    list_response_key = "accountants"
    create_serializer_class = AdminAccountantCreateSerializer
    list_serializer_class = AdminAccountantListSerializer
    detail_serializer_class = AdminAccountantDetailSerializer
    update_serializer_class = AdminAccountantUpdateSerializer
    change_status_serializer_class = AdminAccountantChangeStatusSerializer
    permission_serializer_class = AdminAccountantPermissionSerializer
    not_found_message = "Accountant not found."


class AdminAccountantListView(AdminAccountantBaseView, GenericAdminStaffListView):
    pass


class AdminAccountantCreateView(AdminAccountantBaseView, GenericAdminStaffCreateView):
    pass


class AdminAccountantDetailView(AdminAccountantBaseView, GenericAdminStaffDetailView):
    pass


class AdminAccountantUpdateView(AdminAccountantBaseView, GenericAdminStaffUpdateView):
    pass


class AdminAccountantDeleteView(AdminAccountantBaseView, GenericAdminStaffDeleteView):
    pass


class AdminAccountantActivateView(AdminAccountantBaseView, GenericAdminStaffActivateView):
    pass


class AdminAccountantDeactivateView(AdminAccountantBaseView, GenericAdminStaffDeactivateView):
    pass


class AdminAccountantChangeStatusView(AdminAccountantBaseView, GenericAdminStaffChangeStatusView):
    pass


class AdminAccountantPermissionView(AdminAccountantBaseView, GenericAdminStaffPermissionView):
    pass


__all__ = [
    "AdminAccountantActivateView",
    "AdminAccountantBaseView",
    "AdminAccountantChangeStatusView",
    "AdminAccountantCreateView",
    "AdminAccountantDeactivateView",
    "AdminAccountantDeleteView",
    "AdminAccountantDetailView",
    "AdminAccountantListView",
    "AdminAccountantPermissionView",
    "AdminAccountantUpdateView",
]
