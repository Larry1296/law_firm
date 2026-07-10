from apps.staff.views.staff_workspace_views import (
    StaffWorkspaceChangePasswordView,
    StaffWorkspaceDashboardView,
    StaffWorkspaceItemsView,
    StaffWorkspaceProfileView,
)


class HRProfileView(StaffWorkspaceProfileView):
    profile_attr = "hr_profile"
    role_label = "HR"


class HRDashboardView(StaffWorkspaceDashboardView):
    profile_attr = "hr_profile"
    role_label = "HR"
    default_work = staticmethod(
        lambda profile: {
            "can_manage_staff_records": profile.can_manage_staff_records,
            "can_manage_recruitment": profile.can_manage_recruitment,
            "can_manage_leave": profile.can_manage_leave,
            "can_manage_payroll_records": profile.can_manage_payroll_records,
        }
    )


class HRChangePasswordView(StaffWorkspaceChangePasswordView):
    profile_attr = "hr_profile"
    role_label = "HR"


class HRTasksView(StaffWorkspaceItemsView):
    profile_attr = "hr_profile"
    role_label = "HR"
    item_type = "task"
    response_key = "tasks"


class HRDocumentsView(StaffWorkspaceItemsView):
    profile_attr = "hr_profile"
    role_label = "HR"
    item_type = "document"
    response_key = "documents"


class HRCalendarView(StaffWorkspaceItemsView):
    profile_attr = "hr_profile"
    role_label = "HR"
    item_type = "calendar-event"
    response_key = "calendar"


class HRNotificationsView(StaffWorkspaceItemsView):
    profile_attr = "hr_profile"
    role_label = "HR"
    item_type = "notification"
    response_key = "notifications"


class HRStaffRecordsView(StaffWorkspaceItemsView):
    profile_attr = "hr_profile"
    role_label = "HR"
    item_type = "staff-record"
    response_key = "staff_records"


__all__ = [
    "HRCalendarView",
    "HRChangePasswordView",
    "HRDashboardView",
    "HRDocumentsView",
    "HRNotificationsView",
    "HRProfileView",
    "HRStaffRecordsView",
    "HRTasksView",
]
