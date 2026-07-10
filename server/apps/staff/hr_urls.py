from django.urls import path

from apps.staff.views.hr import (
    HRCalendarView,
    HRChangePasswordView,
    HRDashboardView,
    HRDocumentsView,
    HRNotificationsView,
    HRProfileView,
    HRStaffRecordsView,
    HRTasksView,
)

urlpatterns = [
    path("profile/", HRProfileView.as_view(), name="hr-profile"),
    path("dashboard/", HRDashboardView.as_view(), name="hr-dashboard"),
    path("staff-records/", HRStaffRecordsView.as_view(), name="hr-staff-records"),
    path("tasks/", HRTasksView.as_view(), name="hr-tasks"),
    path("documents/", HRDocumentsView.as_view(), name="hr-documents"),
    path("calendar/", HRCalendarView.as_view(), name="hr-calendar"),
    path("notifications/", HRNotificationsView.as_view(), name="hr-notifications"),
    path("change-password/", HRChangePasswordView.as_view(), name="hr-change-password"),
]
