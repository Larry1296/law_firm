from apps.staff.views.staff_workspace_views import (
    StaffWorkspaceChangePasswordView,
    StaffWorkspaceDashboardView,
    StaffWorkspaceItemsView,
    StaffWorkspaceProfileView,
)
from apps.firm.services.it_system_report_service import ITSystemReportService
from rest_framework import status
from rest_framework.response import Response


class ITProfileView(StaffWorkspaceProfileView):
    profile_attr = "it_profile"
    role_label = "IT"


class ITDashboardView(StaffWorkspaceDashboardView):
    profile_attr = "it_profile"
    role_label = "IT"
    default_work = staticmethod(
        lambda profile: {
            "can_manage_users": profile.can_manage_users,
            "can_manage_system_settings": profile.can_manage_system_settings,
            "can_manage_security": profile.can_manage_security,
            "can_access_audit_logs": profile.can_access_audit_logs,
        }
    )


class ITChangePasswordView(StaffWorkspaceChangePasswordView):
    profile_attr = "it_profile"
    role_label = "IT"


class ITTasksView(StaffWorkspaceItemsView):
    profile_attr = "it_profile"
    role_label = "IT"
    item_type = "task"
    response_key = "tasks"


class ITDocumentsView(StaffWorkspaceItemsView):
    profile_attr = "it_profile"
    role_label = "IT"
    item_type = "document"
    response_key = "documents"


class ITCalendarView(StaffWorkspaceItemsView):
    profile_attr = "it_profile"
    role_label = "IT"
    item_type = "calendar-event"
    response_key = "calendar"


class ITNotificationsView(StaffWorkspaceItemsView):
    profile_attr = "it_profile"
    role_label = "IT"
    item_type = "notification"
    response_key = "notifications"


class ITSystemsView(StaffWorkspaceItemsView):
    profile_attr = "it_profile"
    role_label = "IT"
    item_type = "system"
    response_key = "systems"

    def get(self, request):
        try:
            profile = self.get_profile()
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        report = ITSystemReportService.build_report(profile.law_firm)
        return Response(
            {
                "systems": report["dashboards"],
                "report": report,
            },
            status=status.HTTP_200_OK,
        )


__all__ = [
    "ITCalendarView",
    "ITChangePasswordView",
    "ITDashboardView",
    "ITDocumentsView",
    "ITNotificationsView",
    "ITProfileView",
    "ITSystemsView",
    "ITTasksView",
]
