from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from apps.cases.models import Case
from apps.clients.models import Client
from apps.common.choices import UserRole
from apps.firm.models import LawFirm
from apps.notifications.models import Notification
from apps.users.models import User


class ClientCasesEndpointTests(TestCase):
    def setUp(self):
        self.api_client = APIClient()
        self.admin = User.objects.create_user(
            email="client-case-admin@example.com",
            password="strong-pass123",
            first_name="Client",
            last_name="Admin",
            phone_number="+254722000001",
            national_id_number="722000001",
            role=UserRole.ADMIN,
        )
        self.firm = LawFirm.objects.create(
            name="Client Case Firm",
            registration_number="CLIENT-CASE-001",
            owner=self.admin,
        )
        self.client_user = User.objects.create_user(
            email="official-client@example.com",
            password="strong-pass123",
            first_name="Official",
            last_name="Client",
            phone_number="+254722000002",
            national_id_number="722000002",
            role=UserRole.OFFICIAL_CLIENT,
        )
        self.client_profile = Client.objects.create(
            firm=self.firm,
            user=self.client_user,
            created_by=self.admin,
            full_name="Official Client",
            email=self.client_user.email,
            phone_number="+254722000002",
            client_type=Client.ClientType.INDIVIDUAL,
            access_type=Client.AccessType.ASSISTED_CLIENT,
            lifecycle_status=Client.LifecycleStatus.OFFICIAL_CLIENT,
        )
        self.case = Case.objects.create(
            firm=self.firm,
            client=self.client_profile,
            created_by=self.admin,
            case_number="CLIENT-CASE-001",
            title="Client Visible Matter",
            case_type=Case.CaseType.CIVIL,
            court_type=Case.CourtType.HIGH_COURT,
        )

    def test_client_can_list_and_view_own_cases(self):
        self.api_client.force_authenticate(user=self.client_user)

        list_response = self.api_client.get(reverse("client-cases"))
        self.assertEqual(list_response.status_code, 200, list_response.data)
        self.assertEqual(len(list_response.data["cases"]), 1)
        self.assertEqual(list_response.data["cases"][0]["plaintiff_name"], "Official Client")
        self.assertEqual(
            list_response.data["cases"][0]["case_owner"]["party_role"],
            "PLAINTIFF",
        )

        detail_response = self.api_client.get(
            reverse("client-case-detail", kwargs={"case_id": str(self.case.id)})
        )
        self.assertEqual(detail_response.status_code, 200, detail_response.data)
        self.assertEqual(detail_response.data["case"]["id"], str(self.case.id))
        self.assertEqual(detail_response.data["case"]["case_owner"]["full_name"], "Official Client")
        self.assertEqual(
            detail_response.data["case"]["case_owner"]["email"],
            self.client_user.email,
        )
        self.assertEqual(
            detail_response.data["case"]["case_owner"]["phone_number"],
            "+254722000002",
        )
        self.assertEqual(
            detail_response.data["case"]["client"]["email"],
            self.client_user.email,
        )
        self.assertEqual(
            detail_response.data["case"]["client"]["phone_number"],
            "+254722000002",
        )
        self.assertIn("firm", detail_response.data["case"])
        self.assertNotIn("assigned_lawyer", detail_response.data["case"])
        self.assertNotIn("assigned_secretary", detail_response.data["case"])

    def test_client_dashboard_uses_live_case_and_notification_counts(self):
        Notification.objects.create(
            firm=self.firm,
            recipient=self.client_user,
            case=self.case,
            notification_type=Notification.NotificationType.CASE_STATUS_UPDATE,
            title="Case status updated",
            message="Your case status changed.",
        )
        self.api_client.force_authenticate(user=self.client_user)

        response = self.api_client.get(reverse("client-dashboard"))

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["client"]["full_name"], "Official Client")
        self.assertEqual(response.data["summary"]["total_cases"], 1)
        self.assertEqual(response.data["summary"]["active_cases"], 1)
        self.assertEqual(response.data["summary"]["unread_notifications"], 1)
