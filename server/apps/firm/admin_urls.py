from django.urls import path

from apps.firm.views.admin.admin_branch_detail_view import AdminBranchDetailView
from apps.firm.views.admin.admin_branch_list_view import AdminBranchListView
from apps.firm.views.admin.admin_department_detail_view import AdminDepartmentDetailView
from apps.firm.views.admin.admin_department_list_view import AdminDepartmentListView
from apps.firm.views.admin.admin_delegation_view import AdminDelegationView
from apps.firm.views.admin.admin_firm_settings_view import AdminFirmSettingsView
from apps.firm.views.admin.admin_firm_view import AdminFirmDetailView
from apps.firm.views.admin.admin_it_report_view import AdminITReportView
from apps.firm.views.admin.admin_owner_lawyer_profile_view import AdminOwnerLawyerProfileView
from apps.firm.views.admin.admin_staff_options_view import AdminStaffOptionsView

urlpatterns = [
    path("branches/", AdminBranchListView.as_view(), name="admin-firm-branches"),
    path("branches/<uuid:branch_id>/", AdminBranchDetailView.as_view(), name="admin-firm-branch-detail"),
    path("departments/", AdminDepartmentListView.as_view(), name="admin-firm-departments"),
    path("departments/<uuid:department_id>/", AdminDepartmentDetailView.as_view(), name="admin-firm-department-detail"),
    path("staff-options/", AdminStaffOptionsView.as_view(), name="admin-firm-staff-options"),
    path("admin-delegation/", AdminDelegationView.as_view(), name="admin-firm-admin-delegation"),
    path("admin-delegation/<uuid:user_id>/", AdminDelegationView.as_view(), name="admin-firm-admin-delegation-detail"),
    path("it-report/", AdminITReportView.as_view(), name="admin-firm-it-report"),
    path("owner-lawyer-profile/", AdminOwnerLawyerProfileView.as_view(), name="admin-owner-lawyer-profile"),
    path("settings/", AdminFirmSettingsView.as_view(), name="admin-firm-settings"),
    path("", AdminFirmDetailView.as_view(), name="admin-firm-detail"),
]
