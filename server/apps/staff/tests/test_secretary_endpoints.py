from datetime import date

from django.test import TestCase
from django.urls import resolve, reverse
from rest_framework.test import APIClient

from apps.common.choices import UserRole
from apps.firm.models.law_firm import LawFirm
from apps.staff.models import Secretary, SecretaryPermission
from apps.users.models import User


class SecretaryUrlTests(TestCase):
    def test_admin_secretary_detail_route_is_available(self):
        resolver = resolve(
            "/api/admin/staff/secretaries/123e4567-e89b-12d3-a456-426614174000/"
        )
        self.assertEqual(resolver.view_name, "admin-secretary-detail")

    def test_secretary_dashboard_route_is_available(self):
        resolver = resolve("/api/staff/secretary/dashboard/")
        self.assertEqual(resolver.view_name, "secretary-dashboard")


class SecretaryEndpointTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin_user = User.objects.create_user(
            email="secretary-admin@example.com",
            password="strong-pass123",
            first_name="Admin",
            last_name="User",
            phone_number="+254711000001",
            national_id_number="711000001",
            role=UserRole.ADMIN,
        )
        self.firm = LawFirm.objects.create(
            name="Secretary Test Firm",
            registration_number="SEC-FIRM-001",
            owner=self.admin_user,
        )

    def test_admin_can_create_secretary(self):
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.post(
            reverse("admin-secretary-create"),
            {
                "first_name": "Sarah",
                "last_name": "Secretary",
                "email": "sarah.secretary@example.com",
                "phone_number": "+254711000002",
                "national_id_number": "711000002",
                "date_hired": "2026-07-06",
                "permission_codes": [SecretaryPermission.MANAGE_CASES],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(
            Secretary.objects.filter(user__email="sarah.secretary@example.com").exists()
        )
        self.assertIn("temp_password", response.data)

    def test_secretary_dashboard_and_permission_gate(self):
        secretary_user = User.objects.create_user(
            email="secretary-user@example.com",
            password="strong-pass123",
            first_name="Sec",
            last_name="User",
            phone_number="+254711000003",
            national_id_number="711000003",
            role=UserRole.STAFF,
        )
        secretary = Secretary.objects.create(
            user=secretary_user,
            law_firm=self.firm,
            staff_number="SEC-TEST-001",
            date_hired=date(2026, 7, 6),
        )

        self.client.force_authenticate(user=secretary_user)

        dashboard_response = self.client.get(reverse("secretary-dashboard"))
        self.assertEqual(dashboard_response.status_code, 200)

        blocked_cases_response = self.client.get(reverse("secretary-cases"))
        self.assertEqual(blocked_cases_response.status_code, 403)

        self.client.force_authenticate(user=self.admin_user)
        permission_response = self.client.post(
            reverse(
                "admin-secretary-permissions",
                kwargs={"secretary_id": str(secretary.id)},
            ),
            {"permission_codes": [SecretaryPermission.MANAGE_CASES]},
            format="json",
        )
        self.assertEqual(permission_response.status_code, 200)

        self.client.force_authenticate(user=secretary_user)
        allowed_cases_response = self.client.get(reverse("secretary-cases"))
        self.assertEqual(allowed_cases_response.status_code, 200)
