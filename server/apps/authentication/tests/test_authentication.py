from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIClient

from apps.clients.models import Client
from apps.common.choices import UserRole
from apps.firm.models import LawFirm
from apps.users.models import User


class PublicRegistrationDisabledTests(TestCase):
    def setUp(self):
        self.api = APIClient()
        self.owner = User.objects.create_user(
            email="owner@example.com",
            password="strong-pass123",
            first_name="Firm",
            last_name="Owner",
            phone_number="+254733000001",
            national_id_number="733000001",
            role=UserRole.ADMIN,
        )
        self.firm = LawFirm.objects.create(
            name="Registration Firm",
            registration_number="REG-FIRM-001",
            owner=self.owner,
            is_active=True,
        )

    def test_public_client_and_firm_registration_routes_do_not_exist(self):
        response = self.api.post(
            "/api/auth/register/",
            {
                "full_name": "Self Registered Client",
                "email": "self-client@example.com",
                "phone_number": "+254733000002",
                "national_id": "733000002",
                "client_type": Client.ClientType.INDIVIDUAL,
                "password": "strong-pass123",
            },
            format="json",
        )

        firm_response = self.api.post("/api/auth/register-firm/", {}, format="json")
        self.assertEqual(response.status_code, 404)
        self.assertEqual(firm_response.status_code, 404)
        self.assertFalse(User.objects.filter(email="self-client@example.com").exists())


class AdminLoginPasswordResetTests(TestCase):
    def setUp(self):
        self.api = APIClient()

    def test_admin_created_normally_does_not_require_password_reset(self):
        user = User.objects.create_admin(
            email="admin-default@example.com",
            password="strong-pass123",
            first_name="Firm",
            last_name="Owner",
            phone_number="+254733000003",
            national_id_number="733000003",
        )

        self.assertFalse(user.must_change_password)

    def test_admin_login_clears_stale_password_reset_flag(self):
        user = User.objects.create_user(
            email="admin-stale@example.com",
            password="strong-pass123",
            first_name="Firm",
            last_name="Owner",
            phone_number="+254733000004",
            national_id_number="733000004",
            role=UserRole.ADMIN,
            must_change_password=True,
            is_staff=True,
        )

        response = self.api.post(
            reverse("login"),
            {
                "email": "admin-stale@example.com",
                "password": "strong-pass123",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertFalse(response.data["user"]["must_change_password"])

        user.refresh_from_db()
        self.assertFalse(user.must_change_password)


class PasswordResetFlowTests(TestCase):
    def setUp(self):
        self.api = APIClient()
        self.user = User.objects.create_user(
            email="reset-user@example.com",
            password="old-pass123",
            first_name="Reset",
            last_name="User",
            phone_number="+254733000005",
            national_id_number="733000005",
            role=UserRole.PROSPECT,
            must_change_password=True,
        )

    def test_forgot_password_returns_generic_response_for_existing_user(self):
        response = self.api.post(
            reverse("forgot-password"),
            {"email": self.user.email},
            format="json",
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(
            response.data["detail"],
            "Password reset link sent if email exists",
        )

    @override_settings(DEBUG=True)
    def test_reset_password_updates_user_password(self):
        forgot_response = self.api.post(
            reverse("forgot-password"),
            {"email": self.user.email},
            format="json",
        )
        self.assertEqual(forgot_response.status_code, 200, forgot_response.data)
        reset_data = forgot_response.data["debug"]

        response = self.api.post(
            reverse("reset-password"),
            {
                "uid": reset_data["uid"],
                "token": reset_data["token"],
                "new_password": "new-strong-pass123",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("new-strong-pass123"))
        self.assertFalse(self.user.must_change_password)

    def test_reset_password_rejects_invalid_token(self):
        response = self.api.post(
            reverse("reset-password"),
            {
                "uid": "invalid",
                "token": "invalid",
                "new_password": "new-strong-pass123",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400, response.data)
