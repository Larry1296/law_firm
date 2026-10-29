from django.contrib import admin
from django.urls import path, include

from apps.firm.views.public.firm_logo_view import FirmLogoView

from apps.clients.views.client_visit_views import ArrivalClientSearchView, ClientVisitListView, ClientVisitActionView, ReturningVisitorView
from apps.clients.views.queue_configuration_view import QueueConfigurationView

urlpatterns = [
    path("api/tutorials/", include("apps.tutorials.urls")),
    path("api/admin/firm/queue-configuration/", QueueConfigurationView.as_view(), name="queue-configuration"),
    path("api/arrivals/", ClientVisitListView.as_view(), name="client-arrivals"),
    path("api/arrivals/visitors/", ReturningVisitorView.as_view(), name="client-arrival-visitors"),
    path("api/arrivals/clients/", ArrivalClientSearchView.as_view(), name="client-arrival-clients"),
    path("api/arrivals/<uuid:visit_id>/", ClientVisitActionView.as_view(), name="client-arrival-action"),
    path("admin/", admin.site.urls),

    path("api/auth/", include("apps.authentication.urls")),
    path("api/cases/", include("apps.cases.urls")),
    path("api/events/", include("apps.events.urls")),
    path("api/courtroom/", include("apps.courtroom.urls")),
    path("api/communications/", include("apps.communications.urls")),
    path("api/notifications/", include("apps.notifications.urls")),
    path("api/documents/", include("apps.documents.urls")),
    path("api/finance/", include("apps.billing.urls")),
    path("api/subscription/", include("apps.subscriptions.urls")),
    path("api/platform/", include("apps.platform_admin.urls")),
    path("api/firm-logo/<uuid:firm_id>/", FirmLogoView.as_view(), name="firm-logo"),
    path("api/audit-logs/", include("apps.audit_logs.urls")),
    path("api/", include("apps.ai.urls")),

    path("api/admin/", include("api.admin_urls")),
    path("api/staff/lawyer/", include("api.lawyer_urls")),
    path("api/staff/secretary/", include("api.secretary_urls")),
    path("api/staff/accountant/", include("api.accountant_urls")),
    path("api/staff/hr/", include("api.hr_urls")),
    path("api/staff/it/", include("api.it_urls")),
    path("api/client/", include("api.client_urls")),
]
