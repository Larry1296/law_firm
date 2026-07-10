from django.urls import include, path

urlpatterns = [
    path("", include("apps.staff.it_urls")),
]
