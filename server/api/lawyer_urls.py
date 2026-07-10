from django.urls import include, path

urlpatterns = [
    path("", include("apps.staff.lawyer_urls")),
]