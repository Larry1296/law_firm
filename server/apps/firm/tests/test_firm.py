from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from apps.common.choices import FirmRole, UserRole
from apps.firm.models import LawFirm, LawFirmMember
from apps.staff.models import IT
from apps.users.models import User


class AdminDelegationTests(TestCase):
    def setUp(self):
        self.api = APIClient()
        self.owner = User.objects.create_user(
            email="owner@example.com",
            password="strong-pass123",
            first_name="Firm",
            last_name="Owner",
            phone_number="+254700100001",
            national_id_number="700100001",
            role=UserRole.ADMIN,
        )
        self.firm = LawFirm.objects.create(
            name="Delegation Firm",
            registration_number="DELEGATION-001",
            owner=self.owner,
        )
        self.staff_user = User.objects.create_user(
            email="staff@example.com",
            password="strong-pass123",
            first_name="Staff",
            last_name="Member",
            phone_number="+254700100002",
            national_id_number="700100002",
            role=UserRole.STAFF,
        )
        LawFirmMember.objects.create(
            firm=self.firm,
            user=self.staff_user,
            role=FirmRole.IT,
            created_by=self.owner,
            is_active=True,
        )
        IT.objects.create(
            user=self.staff_user,
            law_firm=self.firm,
            staff_number="IT-001",
            department="Technology",
            date_hired="2026-01-01",
        )

    def test_owner_can_delegate_and_revoke_admin_role(self):
        self.api.force_authenticate(user=self.owner)

        response = self.api.post(
            reverse("admin-firm-admin-delegation"),
            {"user_id": str(self.staff_user.id)},
            format="json",
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.staff_user.refresh_from_db()
        self.assertEqual(self.staff_user.role, UserRole.ADMIN)
        self.assertTrue(self.staff_user.is_staff)
        self.assertEqual(self.firm.owner, self.owner)

        response = self.api.delete(
            reverse(
                "admin-firm-admin-delegation-detail",
                kwargs={"user_id": self.staff_user.id},
            ),
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.staff_user.refresh_from_db()
        self.assertEqual(self.staff_user.role, UserRole.STAFF)
        self.assertFalse(self.staff_user.is_staff)
        self.assertEqual(self.firm.owner, self.owner)

    def test_delegation_dropdown_uses_staff_firm_role_label(self):
        self.api.force_authenticate(user=self.owner)

        response = self.api.get(reverse("admin-firm-admin-delegation"))

        self.assertEqual(response.status_code, 200, response.data)
        staff_member = response.data["eligible_staff"][0]
        self.assertEqual(staff_member["firm_role"], FirmRole.IT)
        self.assertEqual(staff_member["firm_role_label"], "IT Support")
        self.assertEqual(staff_member["department"], "Technology")
        self.assertEqual(staff_member["label"], "Staff Member (IT Support - Technology)")
