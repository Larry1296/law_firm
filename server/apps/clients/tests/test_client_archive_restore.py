from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from apps.cases.models import Case
from apps.cases.services.case_service import CaseService
from apps.clients.models import Client
from apps.common.choices import UserRole
from apps.firm.models import LawFirm
from apps.users.models import User


class ClientArchiveRestoreTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            email="archive-admin@example.test",
            password="strong-pass123",
            first_name="Archive",
            last_name="Admin",
            phone_number="+254700920001",
            national_id_number="ARCHIVE-ADMIN-001",
            role=UserRole.ADMIN,
        )
        self.firm = LawFirm.objects.create(
            name="Archive Test Firm",
            registration_number="ARCHIVE-FIRM-001",
            owner=self.admin,
        )
        self.portal_user = User.objects.create_user(
            email="archive-client@example.test",
            password="strong-pass123",
            first_name="Archive",
            last_name="Client",
            phone_number="+254700920002",
            national_id_number="ARCHIVE-CLIENT-001",
            role=UserRole.OFFICIAL_CLIENT,
        )
        self.client_record = Client.objects.create(
            firm=self.firm,
            created_by=self.admin,
            user=self.portal_user,
            full_name="Restore State Client",
            phone_number="+254700920002",
            client_type=Client.ClientType.COMPANY,
            access_type=Client.AccessType.PORTAL_ENABLED,
            lifecycle_status=Client.LifecycleStatus.OFFICIAL,
            is_active=True,
        )
        self.active_case = Case.objects.create(
            firm=self.firm,
            client=self.client_record,
            created_by=self.admin,
            case_number="ARCHIVE-CASE-001",
            title="Active matter before client archive",
            case_type=Case.CaseType.CIVIL,
            status=Case.Status.IN_PROGRESS,
            matter_status=Case.MatterStatus.ACTIVE,
            is_active=True,
        )
        self.already_archived_case = Case.objects.create(
            firm=self.firm,
            client=self.client_record,
            created_by=self.admin,
            case_number="ARCHIVE-CASE-002",
            title="Previously archived matter",
            case_type=Case.CaseType.CIVIL,
            status=Case.Status.ARCHIVED,
            matter_status=Case.MatterStatus.ARCHIVED,
            is_active=False,
        )
        self.api = APIClient()
        self.api.force_authenticate(user=self.admin)
        self.status_url = reverse(
            "admin-client-change-status",
            kwargs={"client_id": self.client_record.id},
        )

    def test_archived_client_remains_listed_and_restore_recovers_prior_state(self):
        archive_response = self.api.post(
            self.status_url,
            {"action": "archive"},
            format="json",
        )

        self.assertEqual(archive_response.status_code, 200, archive_response.data)
        self.client_record.refresh_from_db()
        self.active_case.refresh_from_db()
        self.already_archived_case.refresh_from_db()
        self.assertEqual(
            self.client_record.lifecycle_status,
            Client.LifecycleStatus.ARCHIVED,
        )
        self.assertFalse(self.client_record.is_active)
        self.portal_user.refresh_from_db()
        self.assertFalse(self.portal_user.is_active)
        self.assertEqual(self.active_case.matter_status, Case.MatterStatus.ARCHIVED)
        self.assertEqual(self.active_case.status, Case.Status.ARCHIVED)
        self.assertFalse(self.active_case.is_active)
        self.assertTrue(self.active_case.archived_with_client)
        self.assertFalse(self.already_archived_case.archived_with_client)
        with self.assertRaisesMessage(
            PermissionError,
            "Restore the client to restore the case",
        ):
            CaseService.change_status(
                case=self.active_case,
                status=Case.Status.IN_PROGRESS,
                actor=self.admin,
            )

        list_response = self.api.get(reverse("admin-client-list"))
        self.assertEqual(list_response.status_code, 200, list_response.data)
        listed = next(
            item
            for item in list_response.data["clients"]
            if item["id"] == str(self.client_record.id)
        )
        self.assertEqual(
            listed["lifecycle_status"],
            Client.LifecycleStatus.ARCHIVED,
        )
        self.assertTrue(listed["can_restore"])

        restore_response = self.api.post(
            self.status_url,
            {"action": "restore"},
            format="json",
        )

        self.assertEqual(restore_response.status_code, 200, restore_response.data)
        self.client_record.refresh_from_db()
        self.active_case.refresh_from_db()
        self.already_archived_case.refresh_from_db()
        self.assertEqual(
            self.client_record.lifecycle_status,
            Client.LifecycleStatus.OFFICIAL,
        )
        self.assertEqual(
            self.client_record.access_type,
            Client.AccessType.PORTAL_ENABLED,
        )
        self.assertTrue(self.client_record.is_active)
        self.portal_user.refresh_from_db()
        self.assertTrue(self.portal_user.is_active)
        self.assertEqual(self.active_case.status, Case.Status.IN_PROGRESS)
        self.assertEqual(self.active_case.matter_status, Case.MatterStatus.ACTIVE)
        self.assertTrue(self.active_case.is_active)
        self.assertFalse(self.active_case.archived_with_client)
        self.assertEqual(
            self.already_archived_case.matter_status,
            Case.MatterStatus.ARCHIVED,
        )
        self.assertFalse(self.already_archived_case.is_active)
