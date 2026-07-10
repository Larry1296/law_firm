from django.urls import path

from apps.staff.views.accountant import (
    AccountantBillingView,
    AccountantCalendarView,
    AccountantChangePasswordView,
    AccountantDashboardView,
    AccountantDocumentsView,
    AccountantNotificationsView,
    AccountantProfileView,
    AccountantTasksView,
)

urlpatterns = [
    path("profile/", AccountantProfileView.as_view(), name="accountant-profile"),
    path("dashboard/", AccountantDashboardView.as_view(), name="accountant-dashboard"),
    path("billing/", AccountantBillingView.as_view(), name="accountant-billing"),
    path("tasks/", AccountantTasksView.as_view(), name="accountant-tasks"),
    path("documents/", AccountantDocumentsView.as_view(), name="accountant-documents"),
    path("calendar/", AccountantCalendarView.as_view(), name="accountant-calendar"),
    path("notifications/", AccountantNotificationsView.as_view(), name="accountant-notifications"),
    path("change-password/", AccountantChangePasswordView.as_view(), name="accountant-change-password"),
]
