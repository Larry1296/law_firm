from django.urls import include, path

urlpatterns = [
    path("firm/", include("apps.firm.admin_urls")),
    path("staff/", include("apps.staff.admin_urls")),
    path("clients/", include("apps.clients.admin_urls")),
    path("communications/", include("apps.communications.admin_urls")),
]
