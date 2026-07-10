from apps.staff.views.staff_workspace_views import (
    StaffWorkspaceChangePasswordView,
    StaffWorkspaceDashboardView,
    StaffWorkspaceItemsView,
    StaffWorkspaceProfileView,
)


class AccountantProfileView(StaffWorkspaceProfileView):
    profile_attr = "accountant_profile"
    role_label = "Accountant"


class AccountantDashboardView(StaffWorkspaceDashboardView):
    profile_attr = "accountant_profile"
    role_label = "Accountant"
    default_work = staticmethod(
        lambda profile: {
            "can_manage_invoices": profile.can_manage_invoices,
            "can_manage_payments": profile.can_manage_payments,
            "can_manage_expenses": profile.can_manage_expenses,
            "can_view_financial_reports": profile.can_view_financial_reports,
        }
    )


class AccountantChangePasswordView(StaffWorkspaceChangePasswordView):
    profile_attr = "accountant_profile"
    role_label = "Accountant"


class AccountantTasksView(StaffWorkspaceItemsView):
    profile_attr = "accountant_profile"
    role_label = "Accountant"
    item_type = "task"
    response_key = "tasks"


class AccountantDocumentsView(StaffWorkspaceItemsView):
    profile_attr = "accountant_profile"
    role_label = "Accountant"
    item_type = "document"
    response_key = "documents"


class AccountantCalendarView(StaffWorkspaceItemsView):
    profile_attr = "accountant_profile"
    role_label = "Accountant"
    item_type = "calendar-event"
    response_key = "calendar"


class AccountantNotificationsView(StaffWorkspaceItemsView):
    profile_attr = "accountant_profile"
    role_label = "Accountant"
    item_type = "notification"
    response_key = "notifications"


class AccountantBillingView(StaffWorkspaceItemsView):
    profile_attr = "accountant_profile"
    role_label = "Accountant"
    item_type = "billing"
    response_key = "billing"


__all__ = [
    "AccountantBillingView",
    "AccountantCalendarView",
    "AccountantChangePasswordView",
    "AccountantDashboardView",
    "AccountantDocumentsView",
    "AccountantNotificationsView",
    "AccountantProfileView",
    "AccountantTasksView",
]
