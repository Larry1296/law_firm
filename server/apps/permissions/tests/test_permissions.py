from django.test import TestCase

from apps.users.models import User
from apps.common.choices import UserRole

from apps.permissions.services.permission_service import PermissionService


class PermissionServiceTests(TestCase):

    def setUp(self):
        self.admin = User.objects.create_user(
            email="admin@test.com",
            password="password123",
            first_name="Admin",
            last_name="User",
            phone_number="0700000001",
            national_id_number="10000001",
            role=UserRole.ADMIN,
        )

        self.staff = User.objects.create_user(
            email="staff@test.com",
            password="password123",
            first_name="Staff",
            last_name="User",
            phone_number="0700000002",
            national_id_number="10000002",
            role=UserRole.STAFF,
        )

        self.client_user = User.objects.create_user(
            email="client@test.com",
            password="password123",
            first_name="Client",
            last_name="User",
            phone_number="0700000003",
            national_id_number="10000003",
            role=UserRole.OFFICIAL_CLIENT,
        )

        self.prospect = User.objects.create_user(
            email="prospect@test.com",
            password="password123",
            first_name="Prospect",
            last_name="User",
            phone_number="0700000004",
            national_id_number="10000004",
            role=UserRole.PROSPECT,
        )

    def test_is_admin(self):
        self.assertTrue(
            PermissionService.is_admin(self.admin)
        )

        self.assertFalse(
            PermissionService.is_admin(self.staff)
        )

    def test_is_staff(self):
        self.assertTrue(
            PermissionService.is_staff(self.staff)
        )

        self.assertFalse(
            PermissionService.is_staff(self.client_user)
        )

    def test_is_client(self):
        self.assertTrue(
            PermissionService.is_client(self.client_user)
        )

        self.assertFalse(
            PermissionService.is_client(self.staff)
        )

    def test_is_prospect(self):
        self.assertTrue(
            PermissionService.is_prospect(
                self.prospect
            )
        )

        self.assertFalse(
            PermissionService.is_prospect(
                self.client_user
            )
        )
