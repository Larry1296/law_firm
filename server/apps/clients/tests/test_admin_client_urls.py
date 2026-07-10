from datetime import date

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from apps.common.choices import FirmRole, UserRole
from apps.clients.models import Client
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

    def test_delegated_admin_can_access_client_list(self):
        self.client.force_authenticate(user=self.delegated_admin)
        response = self.client.get(reverse("admin-client-list"))
        self.assertEqual(response.status_code, 200, response.data)

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
