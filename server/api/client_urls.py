from django.urls import include, path

urlpatterns = [
    path("", include("apps.clients.urls")),
]
