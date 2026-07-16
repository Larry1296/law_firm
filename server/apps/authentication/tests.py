from django.test import TestCase

# Create your tests here.
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from apps.clients.models import Client
from apps.common.choices import UserRole
from apps.firm.models import LawFirm
from apps.users.models import User


class ClientRegistrationTests(TestCase):
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

    def test_self_registration_creates_unverified_prospect_with_portal_access(self):
        response = self.api.post(
            reverse("register-client"),
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

        self.assertEqual(response.status_code, 201, response.data)
        self.assertIn("access", response.data)
        self.assertEqual(response.data["user"]["role"], UserRole.PROSPECT)
        self.assertEqual(response.data["firm"]["id"], self.firm.id)

        user = User.objects.get(email="self-client@example.com")
        client = user.client_profile
        self.assertEqual(client.firm, self.firm)
        self.assertEqual(client.access_type, Client.AccessType.PROSPECT)
        self.assertEqual(client.lifecycle_status, Client.LifecycleStatus.PROSPECT)
        self.assertFalse(client.is_verified)
        self.assertFalse(user.must_change_password)


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
