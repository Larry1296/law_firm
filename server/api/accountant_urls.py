from django.urls import include, path

urlpatterns = [
    path("", include("apps.staff.accountant_urls")),
]
