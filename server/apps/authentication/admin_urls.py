from apps.authentication.views.login_view import LoginView
from django.urls import path


urlpatterns = [
    path("", LoginView.as_view(), name="admin-client-list"),
]