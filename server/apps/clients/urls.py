from django.urls import path

from apps.clients.views.client.client_dashboard_view import ClientDashboardView
from apps.clients.views.client.client_profile_view import ClientProfileView
from apps.clients.views.client.client_cases_view import ClientCasesView
from apps.clients.views.client.client_documents_view import ClientDocumentsView

urlpatterns = [
    path("profile/", ClientProfileView.as_view(), name="client-profile"),
    path("dashboard/", ClientDashboardView.as_view(), name="client-dashboard"),
    path("cases/", ClientCasesView.as_view(), name="client-cases"),
    path("cases/<str:case_id>/", ClientCasesView.as_view(), name="client-case-detail"),
    path("documents/", ClientDocumentsView.as_view(), name="client-documents"),
]
