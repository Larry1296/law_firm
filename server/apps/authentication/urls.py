from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views.login_view import LoginView
from .views.logout_view import LogoutView
from .views.change_password_view import ChangePasswordView
from .views.forgot_password_view import ForgotPasswordView
from .views.me_view import MeView
from .views.reset_password_view import ResetPasswordView

urlpatterns = [
    path("login/", LoginView.as_view(), name="login"),
    path("me/", MeView.as_view(), name="auth-me"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("change-password/", ChangePasswordView.as_view(), name="change-password"),
    path("forgot-password/", ForgotPasswordView.as_view(), name="forgot-password"),
    path("reset-password/", ResetPasswordView.as_view(), name="reset-password"),
]
