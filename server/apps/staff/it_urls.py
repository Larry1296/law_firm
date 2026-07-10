from django.urls import path

from apps.staff.views.it import (
    ITCalendarView,
    ITChangePasswordView,
    ITDashboardView,
    ITDocumentsView,
    ITNotificationsView,
    ITProfileView,
    ITSystemsView,
    ITTasksView,
)

urlpatterns = [
    path("profile/", ITProfileView.as_view(), name="it-profile"),
    path("dashboard/", ITDashboardView.as_view(), name="it-dashboard"),
    path("systems/", ITSystemsView.as_view(), name="it-systems"),
    path("tasks/", ITTasksView.as_view(), name="it-tasks"),
    path("documents/", ITDocumentsView.as_view(), name="it-documents"),
    path("calendar/", ITCalendarView.as_view(), name="it-calendar"),
    path("notifications/", ITNotificationsView.as_view(), name="it-notifications"),
    path("change-password/", ITChangePasswordView.as_view(), name="it-change-password"),
]
