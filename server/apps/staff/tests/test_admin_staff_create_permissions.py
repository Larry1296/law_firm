from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from apps.common.choices import UserRole
from apps.firm.models.law_firm import LawFirm
from apps.staff.models import (
    Accountant,
    AccountantPermission,
    HR,
    HRPermission,
    IT,
    ITPermission,
    Lawyer,
    LawyerPermission,
    Secretary,
    SecretaryPermission,
)
from apps.users.models import User


class AdminStaffCreatePermissionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin_user = User.objects.create_user(
            email="staff-permission-admin@example.com",
            password="strong-pass123",
            first_name="Admin",
            last_name="User",
            phone_number="+254733000001",
            national_id_number="733000001",
            role=UserRole.ADMIN,
        )
        self.firm = LawFirm.objects.create(
            name="Staff Permission Firm",
            registration_number="STAFF-PERM-001",
            owner=self.admin_user,
        )
        self.client.force_authenticate(user=self.admin_user)

    def base_payload(self, *, index):
        return {
            "first_name": f"Staff{index}",
            "last_name": "Member",
            "email": f"staff.permission.{index}@example.com",
            "phone_number": f"+254733000{index:03d}",
            "national_id_number": f"733000{index:03d}",
            "date_hired": "2026-07-07",
        }

    def assert_created_with_permissions(
        self,
        *,
        route_name,
        response_key,
        model,
        permission_codes,
        payload,
    ):
        response = self.client.post(
            reverse(route_name),
            {**payload, "permission_codes": permission_codes},
            format="json",
        )

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data[response_key]["permissions"], permission_codes)

        staff = model.objects.get(user__email=payload["email"])
        self.assertEqual(
            list(staff.permissions.filter(is_active=True).values_list("code", flat=True)),
            permission_codes,
        )

    def test_admin_create_lawyer_saves_selected_permissions(self):
        self.assert_created_with_permissions(
            route_name="admin-lawyer-create",
            response_key="lawyer",
            model=Lawyer,
            permission_codes=[LawyerPermission.CREATE_CASES],
            payload={
                **self.base_payload(index=2),
                "admission_number": "ADV-PERM-001",
            },
        )

    def test_admin_create_secretary_saves_selected_permissions(self):
        self.assert_created_with_permissions(
            route_name="admin-secretary-create",
            response_key="secretary",
            model=Secretary,
            permission_codes=[SecretaryPermission.MANAGE_CASES],
            payload=self.base_payload(index=3),
        )

    def test_admin_create_accountant_saves_selected_permissions(self):
        self.assert_created_with_permissions(
            route_name="admin-accountant-create",
            response_key="accountant",
            model=Accountant,
            permission_codes=[AccountantPermission.MANAGE_INVOICES],
            payload=self.base_payload(index=4),
        )

    def test_admin_create_hr_saves_selected_permissions(self):
        self.assert_created_with_permissions(
            route_name="admin-hr-create",
            response_key="hr",
            model=HR,
            permission_codes=[HRPermission.MANAGE_STAFF_RECORDS],
            payload=self.base_payload(index=5),
        )

    def test_admin_create_it_saves_selected_permissions(self):
        self.assert_created_with_permissions(
            route_name="admin-it-create",
            response_key="it",
            model=IT,
            permission_codes=[ITPermission.MANAGE_USERS],
            payload=self.base_payload(index=6),
        )
