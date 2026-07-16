from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views.login_view import LoginView
from .views.logout_view import LogoutView
from .views.register_view import RegisterClientView, RegisterFirmView
from .views.change_password_view import ChangePasswordView
from .views.me_view import MeView

urlpatterns = [
    path("register/", RegisterClientView.as_view(), name="register-client"),
    path("register-firm/", RegisterFirmView.as_view(), name="register-firm"),
    path("login/", LoginView.as_view(), name="login"),
    path("me/", MeView.as_view(), name="auth-me"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("change-password/", ChangePasswordView.as_view(), name="change-password"),
]
