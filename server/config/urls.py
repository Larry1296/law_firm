from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),

    path("api/auth/", include("apps.authentication.urls")),
    path("api/cases/", include("apps.cases.urls")),
    path("api/events/", include("apps.events.urls")),
    path("api/courtroom/", include("apps.courtroom.urls")),
    path("api/communications/", include("apps.communications.urls")),
    path("api/notifications/", include("apps.notifications.urls")),

    path("api/admin/", include("api.admin_urls")),
    path("api/staff/lawyer/", include("api.lawyer_urls")),
    path("api/staff/secretary/", include("api.secretary_urls")),
    path("api/staff/accountant/", include("api.accountant_urls")),
    path("api/staff/hr/", include("api.hr_urls")),
    path("api/staff/it/", include("api.it_urls")),
    path("api/client/", include("api.client_urls")),
]
