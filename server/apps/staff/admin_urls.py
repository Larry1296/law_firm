from django.urls import include, path

urlpatterns = [
    path("lawyers/", include("apps.staff.lawyer_admin_urls")),
    path("secretaries/", include("apps.staff.secretary_admin_urls")),
    path("accountants/", include("apps.staff.accountant_admin_urls")),
    path("hr/", include("apps.staff.hr_admin_urls")),
    path("it/", include("apps.staff.it_admin_urls")),
]
