from datetime import date

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from apps.cases.models import Case
from apps.common.choices import FirmRole, UserRole
from apps.clients.models import Client, ClientAddress, ClientContact, IndividualClient, NGOClient
from apps.firm.models import LawFirm, LawFirmMember
from apps.users.models import User


class AdminClientUrlTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin_user = User.objects.create_user(
            email="admin-client@example.com",
            password="strong-pass123",
            first_name="Admin",
            last_name="Client",
            phone_number="+254700000020",
            national_id_number="123456790",
            role=UserRole.ADMIN,
        )
        self.firm = LawFirm.objects.create(
            name="Client Test Law Firm",
            registration_number="REG-CLIENT-001",
            owner=self.admin_user,
        )
        self.delegated_admin = User.objects.create_user(
            email="delegated-client-admin@example.com",
            password="strong-pass123",
            first_name="Delegated",
            last_name="Admin",
            phone_number="+254700000022",
            national_id_number="123456791",
            role=UserRole.ADMIN,
        )
        LawFirmMember.objects.create(
            firm=self.firm,
            user=self.delegated_admin,
            role=FirmRole.IT,
            created_by=self.admin_user,
            is_active=True,
        )

    def test_admin_client_list_route_is_available(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(reverse("admin-client-list"))
        self.assertEqual(response.status_code, 200)

    def test_delegated_non_owner_admin_cannot_access_client_list(self):
        self.client.force_authenticate(user=self.delegated_admin)
        response = self.client.get(reverse("admin-client-list"))
        self.assertEqual(response.status_code, 403, response.data)

    def test_admin_client_detail_route_is_available(self):
        client = Client.objects.create(
            firm=self.firm,
            full_name="Jane Doe",
            email="jane@example.com",
            phone_number="+254700000021",
            client_type=Client.ClientType.INDIVIDUAL,
            access_type=Client.AccessType.ASSISTED_CLIENT,
            national_id="12345679",
            date_of_birth=date(1990, 1, 1),
        )
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(reverse("admin-client-detail", kwargs={"client_id": str(client.id)}))
        self.assertEqual(response.status_code, 200)

    def test_prospect_without_case_is_hard_deleted(self):
        portal_user = User.objects.create_user(
            email="prospect-delete-login@example.com",
            password="strong-pass123",
            first_name="Prospect",
            last_name="Delete",
            phone_number="+254700000123",
            national_id_number="123456793",
            role=UserRole.PROSPECT,
        )
        client = Client.objects.create(
            firm=self.firm,
            full_name="Prospect Delete",
            email="prospect-delete@example.com",
            phone_number="+254700000023",
            client_type=Client.ClientType.INDIVIDUAL,
            access_type=Client.AccessType.PROSPECT,
            lifecycle_status=Client.LifecycleStatus.PROSPECT,
            user=portal_user,
        )
        IndividualClient.objects.create(
            client=client,
            first_name="Prospect",
            last_name="Delete",
        )
        ClientContact.objects.create(
            client=client,
            full_name="Prospect Contact",
            phone_number="+254700000124",
            is_primary=True,
        )
        ClientAddress.objects.create(
            client=client,
            country="Kenya",
            full_address="Nairobi",
            is_primary=True,
        )
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.delete(
            reverse("admin-client-delete", kwargs={"client_id": str(client.id)})
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["action"], "deleted")
        self.assertFalse(Client.objects.filter(id=client.id).exists())
        self.assertFalse(User.objects.filter(id=portal_user.id).exists())
        self.assertFalse(IndividualClient.objects.filter(client_id=client.id).exists())
        self.assertFalse(ClientContact.objects.filter(client_id=client.id).exists())
        self.assertFalse(ClientAddress.objects.filter(client_id=client.id).exists())

    def test_case_linked_client_is_archived_instead_of_hard_deleted(self):
        client = Client.objects.create(
            firm=self.firm,
            full_name="Official Archive",
            email="official-archive@example.com",
            phone_number="+254700000024",
            client_type=Client.ClientType.INDIVIDUAL,
            access_type=Client.AccessType.ASSISTED_CLIENT,
            lifecycle_status=Client.LifecycleStatus.OFFICIAL_CLIENT,
        )
        Case.objects.create(
            firm=self.firm,
            client=client,
            created_by=self.admin_user,
            case_number="ARCHIVE-001",
            title="Archive Test Case",
            case_type=Case.CaseType.CIVIL,
            court_type=Case.CourtType.HIGH_COURT,
        )
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.delete(
            reverse("admin-client-delete", kwargs={"client_id": str(client.id)})
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["action"], "archived")
        client.refresh_from_db()
        self.assertFalse(client.is_active)
        self.assertEqual(client.lifecycle_status, Client.LifecycleStatus.ARCHIVED)
        self.assertEqual(
            client.previous_lifecycle_status,
            Client.LifecycleStatus.OFFICIAL_CLIENT,
        )
        self.assertIsNotNone(client.soft_deleted_at)

    def test_archived_client_can_be_restored_to_previous_state(self):
        client = Client.objects.create(
            firm=self.firm,
            full_name="Restore Official",
            email="restore-official@example.com",
            phone_number="+254700000025",
            client_type=Client.ClientType.INDIVIDUAL,
            access_type=Client.AccessType.ASSISTED_CLIENT,
            lifecycle_status=Client.LifecycleStatus.OFFICIAL_CLIENT,
        )
        Case.objects.create(
            firm=self.firm,
            client=client,
            created_by=self.admin_user,
            case_number="RESTORE-001",
            title="Restore Test Case",
            case_type=Case.CaseType.CIVIL,
            court_type=Case.CourtType.HIGH_COURT,
        )
        self.client.force_authenticate(user=self.admin_user)
        self.client.delete(
            reverse("admin-client-delete", kwargs={"client_id": str(client.id)})
        )

        response = self.client.post(
            reverse("admin-client-change-status", kwargs={"client_id": str(client.id)}),
            {"action": "restore"},
            format="json",
        )

        self.assertEqual(response.status_code, 200, response.data)
        client.refresh_from_db()
        self.assertTrue(client.is_active)
        self.assertEqual(
            client.lifecycle_status,
            Client.LifecycleStatus.OFFICIAL_CLIENT,
        )
        self.assertEqual(client.access_type, Client.AccessType.ASSISTED_CLIENT)
        self.assertIsNone(client.previous_lifecycle_status)
        self.assertIsNone(client.previous_access_type)
        self.assertIsNone(client.previous_is_active)
        self.assertIsNone(client.soft_deleted_at)

    def test_admin_religious_organization_keeps_specific_client_type(self):
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.post(
            reverse("admin-religious-organization-client-create"),
            {
                "ngo_name": "Grace Chapel Ministries",
                "registration_number": "REL-001",
                "email": "grace@example.com",
                "phone_number": "+254700000026",
                "access_type": Client.AccessType.ASSISTED_CLIENT,
                "registration_authority": "Registrar of Societies",
                "sector": "Faith based organization",
                "director_name": "Rev. Jane",
                "director_contact": "+254700000027",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201, response.data)
        created = Client.objects.get(full_name="Grace Chapel Ministries")
        self.assertEqual(created.client_type, Client.ClientType.RELIGIOUS_ORGANIZATION)
        self.assertTrue(NGOClient.objects.filter(client=created).exists())
