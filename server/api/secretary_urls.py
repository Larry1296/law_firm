from django.urls import include, path

urlpatterns = [
    path("", include("apps.staff.secretary_urls")),
]
