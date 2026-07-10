from django.urls import include, path

urlpatterns = [
    path("", include("apps.staff.hr_urls")),
]
