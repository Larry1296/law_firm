from django.urls import path

from apps.staff.views.lawyer.lawyer_calendar_view import LawyerCalendarView
from apps.staff.views.lawyer.lawyer_cases_view import LawyerCaseCreateOptionsView, LawyerCasesView
from apps.staff.views.lawyer.lawyer_change_password_view import LawyerChangePasswordView
from apps.staff.views.lawyer.lawyer_clients_view import LawyerClientsView
from apps.staff.views.lawyer.lawyer_dashboard_view import LawyerDashboardView
from apps.staff.views.lawyer.lawyer_documents_view import LawyerDocumentsView
from apps.staff.views.lawyer.lawyer_notifications_view import LawyerNotificationsView
from apps.staff.views.lawyer.lawyer_profile_view import LawyerProfileView
from apps.staff.views.lawyer.lawyer_tasks_view import LawyerTasksView

urlpatterns = [
    path("profile/", LawyerProfileView.as_view(), name="lawyer-profile"),
    path("dashboard/", LawyerDashboardView.as_view(), name="lawyer-dashboard"),
    path("cases/", LawyerCasesView.as_view(), name="lawyer-cases"),
    path("cases/create-options/", LawyerCaseCreateOptionsView.as_view(), name="lawyer-case-create-options"),
    path("cases/<str:case_id>/", LawyerCasesView.as_view(), name="lawyer-case-detail"),
    path("clients/", LawyerClientsView.as_view(), name="lawyer-clients"),
    path("calendar/", LawyerCalendarView.as_view(), name="lawyer-calendar"),
    path("tasks/", LawyerTasksView.as_view(), name="lawyer-tasks"),
    path("documents/", LawyerDocumentsView.as_view(), name="lawyer-documents"),
    path("documents/upload/", LawyerDocumentsView.as_view(), name="lawyer-document-upload"),
    path("notifications/", LawyerNotificationsView.as_view(), name="lawyer-notifications"),
    path("change-password/", LawyerChangePasswordView.as_view(), name="lawyer-change-password"),
]
