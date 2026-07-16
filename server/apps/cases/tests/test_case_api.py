from datetime import date

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from apps.cases.models import Case
from apps.clients.models import Client
from apps.common.choices import UserRole
from apps.common.choices import FirmRole
from apps.firm.models import LawFirm, LawFirmMember
from apps.notifications.models import Notification
from apps.staff.models import Lawyer, Secretary, SecretaryPermissionGrant, SecretaryPermission
from apps.users.models import User


class CaseApiTests(TestCase):
    def setUp(self):
        self.client_api = APIClient()
        self.admin = User.objects.create_user(
            email="case-admin@example.com",
            password="strong-pass123",
            first_name="Case",
            last_name="Admin",
            phone_number="+254744000001",
            national_id_number="744000001",
            role=UserRole.ADMIN,
        )
        self.firm = LawFirm.objects.create(
            name="Case Firm",
            registration_number="CASE-FIRM-001",
            owner=self.admin,
        )
        self.client = Client.objects.create(
            firm=self.firm,
            created_by=self.admin,
            full_name="Mary Wanjiku",
            email="mary@example.com",
            phone_number="+254744000002",
            national_id="744000002",
            client_type=Client.ClientType.INDIVIDUAL,
            lifecycle_status=Client.LifecycleStatus.PROSPECT,
        )
        self.owner_lawyer = Lawyer.objects.create(
            user=self.admin,
            law_firm=self.firm,
            staff_number="LAW-OWNER-001",
            admission_number="ADV-OWNER-001",
            date_hired=date(2026, 1, 1),
        )
        lawyer_user = User.objects.create_user(
            email="case-lawyer@example.com",
            password="strong-pass123",
            first_name="Lawyer",
            last_name="One",
            phone_number="+254744000003",
            national_id_number="744000003",
            role=UserRole.STAFF,
        )
        self.lawyer = Lawyer.objects.create(
            user=lawyer_user,
            law_firm=self.firm,
            staff_number="LAW-CASE-001",
            admission_number="ADV-CASE-001",
            date_hired=date(2026, 7, 7),
        )
        secretary_user = User.objects.create_user(
            email="case-secretary@example.com",
            password="strong-pass123",
            first_name="Secretary",
            last_name="One",
            phone_number="+254744000004",
            national_id_number="744000004",
            role=UserRole.STAFF,
        )
        self.secretary = Secretary.objects.create(
            user=secretary_user,
            law_firm=self.firm,
            staff_number="SEC-CASE-001",
            date_hired=date(2026, 7, 7),
        )
        SecretaryPermissionGrant.objects.create(
            secretary=self.secretary,
            code=SecretaryPermission.MANAGE_CASES,
            granted_by=self.admin,
        )
        self.secretary.assigned_lawyers.add(self.lawyer)
        self.client_api.force_authenticate(user=self.admin)

    def payload(self):
        return {
            "client_id": str(self.client.id),
            "assigned_lawyer_membership_id": str(self.lawyer.id),
            "assigned_secretary_membership_id": str(self.secretary.id),
            "case_number": "CASE-2026-001",
            "title": "Land Boundary Dispute",
            "description": "Boundary dispute between neighbours.",
            "case_type": Case.CaseType.LAND,
            "court_type": Case.CourtType.ENVIRONMENT_LAND,
            "priority": Case.Priority.HIGH,
            "filing_date": "2026-07-07",
            "court_name": "ELC Nairobi",
            "court_location": "Nairobi",
            "defendant": "John Doe",
        }

    def test_admin_creates_case_for_existing_client_and_promotes_client(self):
        response = self.client_api.post(reverse("case-create"), self.payload(), format="json")

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["case"]["plaintiff_name"], "Mary Wanjiku")
        self.assertEqual(response.data["case"]["case_owner"]["party_role"], "PLAINTIFF")
        self.assertEqual(response.data["case"]["case_owner"]["full_name"], "Mary Wanjiku")
        created = Case.objects.get(case_number="CASE-2026-001")
        self.assertEqual(created.client, self.client)
        self.assertEqual(created.assigned_lawyer, self.lawyer)
        self.assertEqual(created.assigned_secretary, self.secretary)
        self.assertEqual(created.priority, Case.Priority.HIGH)

        self.client.refresh_from_db()
        self.assertEqual(
            self.client.lifecycle_status,
            Client.LifecycleStatus.OFFICIAL_CLIENT,
        )
        self.assertEqual(
            self.client.access_type,
            Client.AccessType.ASSISTED_CLIENT,
        )
        self.assertTrue(self.client.is_verified)
        self.assertTrue(
            Notification.objects.filter(
                recipient=self.lawyer.user,
                case=created,
                notification_type=Notification.NotificationType.CASE_ASSIGNMENT,
                read_at__isnull=True,
            ).exists()
        )
        self.assertTrue(
            Notification.objects.filter(
                recipient=self.secretary.user,
                case=created,
                notification_type=Notification.NotificationType.CASE_ASSIGNMENT,
                read_at__isnull=True,
            ).exists()
        )

        self.client_api.force_authenticate(user=self.lawyer.user)
        lawyer_dashboard = self.client_api.get(reverse("lawyer-dashboard"))
        self.assertEqual(lawyer_dashboard.status_code, 200, lawyer_dashboard.data)
        self.assertEqual(lawyer_dashboard.data["summary"]["unread_notifications"], 1)
        self.assertEqual(
            lawyer_dashboard.data["recent_notifications"][0]["notification_type"],
            Notification.NotificationType.CASE_ASSIGNMENT,
        )
        self.assertEqual(
            lawyer_dashboard.data["recent_notifications"][0]["case"],
            str(created.id),
        )

        self.client_api.force_authenticate(user=self.secretary.user)
        secretary_dashboard = self.client_api.get(reverse("secretary-dashboard"))
        self.assertEqual(secretary_dashboard.status_code, 200, secretary_dashboard.data)
        self.assertEqual(secretary_dashboard.data["summary"]["unread_notifications"], 1)
        self.assertEqual(
            secretary_dashboard.data["recent_notifications"][0]["notification_type"],
            Notification.NotificationType.CASE_ASSIGNMENT,
        )

    def test_case_creation_rejects_missing_client(self):
        payload = self.payload()
        payload["client_id"] = "123e4567-e89b-12d3-a456-426614174000"

        response = self.client_api.post(reverse("case-create"), payload, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(Case.objects.count(), 0)

    def test_admin_case_creation_uses_default_assignments_when_none_selected(self):
        older_secretary_user = User.objects.create_user(
            email="older-secretary@example.com",
            password="strong-pass123",
            first_name="Older",
            last_name="Secretary",
            phone_number="+254744000005",
            national_id_number="744000005",
            role=UserRole.STAFF,
        )
        older_secretary = Secretary.objects.create(
            user=older_secretary_user,
            law_firm=self.firm,
            staff_number="SEC-CASE-000",
            date_hired=date(2026, 1, 1),
        )
        payload = self.payload()
        payload["case_number"] = "CASE-2026-DEFAULTS"
        payload["assigned_lawyer_membership_id"] = None
        payload["assigned_secretary_membership_id"] = None

        response = self.client_api.post(reverse("case-create"), payload, format="json")

        self.assertEqual(response.status_code, 201, response.data)
        created = Case.objects.get(case_number="CASE-2026-DEFAULTS")
        self.assertEqual(created.assigned_lawyer, self.owner_lawyer)
        self.assertEqual(created.assigned_secretary, older_secretary)

    def test_delegated_admin_who_is_not_lawyer_cannot_access_cases(self):
        delegated_admin = User.objects.create_user(
            email="delegated-admin@example.com",
            password="strong-pass123",
            first_name="Delegated",
            last_name="Admin",
            phone_number="+254744000008",
            national_id_number="744000008",
            role=UserRole.ADMIN,
        )
        LawFirmMember.objects.create(
            firm=self.firm,
            user=delegated_admin,
            role=FirmRole.IT,
            created_by=self.admin,
            is_active=True,
        )
        payload = self.payload()
        payload["case_number"] = "CASE-2026-DELEGATED-ADMIN"
        payload["assigned_lawyer_membership_id"] = None

        self.client_api.force_authenticate(user=delegated_admin)
        list_response = self.client_api.get(reverse("case-list"))
        self.assertEqual(list_response.status_code, 200, list_response.data)
        self.assertEqual(len(list_response.data["cases"]), 0)

        response = self.client_api.post(reverse("case-create"), payload, format="json")
        self.assertEqual(response.status_code, 403, response.data)
        self.assertFalse(
            Case.objects.filter(case_number="CASE-2026-DELEGATED-ADMIN").exists()
        )

    def test_secretary_case_creation_ignores_assignment_payload_and_defaults_to_owner_lawyer(self):
        second_lawyer_user = User.objects.create_user(
            email="second-lawyer@example.com",
            password="strong-pass123",
            first_name="Second",
            last_name="Lawyer",
            phone_number="+254744000006",
            national_id_number="744000006",
            role=UserRole.STAFF,
        )
        second_lawyer = Lawyer.objects.create(
            user=second_lawyer_user,
            law_firm=self.firm,
            staff_number="LAW-CASE-002",
            admission_number="ADV-CASE-002",
            date_hired=date(2026, 8, 1),
        )
        payload = self.payload()
        payload["case_number"] = "CASE-2026-SECRETARY"
        payload["assigned_lawyer_membership_id"] = str(second_lawyer.id)
        payload["assigned_secretary_membership_id"] = str(self.secretary.id)
        payload["priority"] = Case.Priority.URGENT

        self.client_api.force_authenticate(user=self.secretary.user)
        response = self.client_api.post(reverse("secretary-cases"), payload, format="json")

        self.assertEqual(response.status_code, 201, response.data)
        created = Case.objects.get(case_number="CASE-2026-SECRETARY")
        self.assertEqual(created.assigned_lawyer, self.owner_lawyer)
        self.assertEqual(created.assigned_secretary, self.secretary)
        self.assertEqual(created.priority, Case.Priority.MEDIUM)

        priority_update = self.client_api.patch(
            reverse("case-detail", kwargs={"case_id": created.id}),
            {"priority": Case.Priority.URGENT},
            format="json",
        )
        self.assertEqual(priority_update.status_code, 403, priority_update.data)
        created.refresh_from_db()
        self.assertEqual(created.priority, Case.Priority.MEDIUM)

    def test_lawyer_only_sees_assigned_cases(self):
        response = self.client_api.post(reverse("case-create"), self.payload(), format="json")
        self.assertEqual(response.status_code, 201, response.data)

        self.client_api.force_authenticate(user=self.lawyer.user)
        list_response = self.client_api.get(reverse("lawyer-cases"))

        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(len(list_response.data["cases"]), 1)
        self.assertEqual(list_response.data["cases"][0]["title"], "Land Boundary Dispute")
        self.assertEqual(list_response.data["cases"][0]["plaintiff_name"], "Mary Wanjiku")
        self.assertEqual(
            list_response.data["cases"][0]["case_owner"]["party_role"],
            "PLAINTIFF",
        )

    def test_assigned_lawyer_can_update_case_status_and_secretary_cannot(self):
        client_user = User.objects.create_user(
            email="case-client-status@example.com",
            password="strong-pass123",
            first_name="Mary",
            last_name="Client",
            phone_number="+254744000010",
            national_id_number="744000010",
            role=UserRole.PROSPECT,
        )
        self.client.user = client_user
        self.client.save(update_fields=["user", "updated_at"])

        response = self.client_api.post(reverse("case-create"), self.payload(), format="json")
        self.assertEqual(response.status_code, 201, response.data)
        created = Case.objects.get(case_number="CASE-2026-001")

        self.client_api.force_authenticate(user=self.lawyer.user)
        status_response = self.client_api.post(
            reverse("case-status", kwargs={"case_id": created.id}),
            {
                "status": Case.Status.NOTICE_OF_APPEAL_FILED,
                "note": "Notice of Appeal lodged after judgment.",
            },
            format="json",
        )
        self.assertEqual(status_response.status_code, 200, status_response.data)
        created.refresh_from_db()
        self.assertEqual(created.status, Case.Status.NOTICE_OF_APPEAL_FILED)
        self.assertTrue(created.is_active)
        self.assertTrue(
            Notification.objects.filter(
                recipient=client_user,
                case=created,
                notification_type=Notification.NotificationType.CASE_STATUS_UPDATE,
                read_at__isnull=True,
            ).exists()
        )

        self.client_api.force_authenticate(user=self.secretary.user)
        secretary_response = self.client_api.post(
            reverse("case-status", kwargs={"case_id": created.id}),
            {"status": Case.Status.CLOSED},
            format="json",
        )
        self.assertEqual(secretary_response.status_code, 403, secretary_response.data)
        created.refresh_from_db()
        self.assertEqual(created.status, Case.Status.NOTICE_OF_APPEAL_FILED)

    def test_secretary_only_sees_assigned_cases_when_permitted(self):
        response = self.client_api.post(reverse("case-create"), self.payload(), format="json")
        self.assertEqual(response.status_code, 201, response.data)

        self.client_api.force_authenticate(user=self.secretary.user)
        list_response = self.client_api.get(reverse("secretary-cases"))

        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(len(list_response.data["cases"]), 1)
        self.assertEqual(list_response.data["cases"][0]["plaintiff_name"], "Mary Wanjiku")
        self.assertEqual(
            list_response.data["cases"][0]["case_owner"]["full_name"],
            "Mary Wanjiku",
        )

    def test_reassigning_case_notifies_new_assignee(self):
        response = self.client_api.post(reverse("case-create"), self.payload(), format="json")
        self.assertEqual(response.status_code, 201, response.data)
        created = Case.objects.get(case_number="CASE-2026-001")

        new_lawyer_user = User.objects.create_user(
            email="new-lawyer@example.com",
            password="strong-pass123",
            first_name="New",
            last_name="Lawyer",
            phone_number="+254744000009",
            national_id_number="744000009",
            role=UserRole.STAFF,
        )
        new_lawyer = Lawyer.objects.create(
            user=new_lawyer_user,
            law_firm=self.firm,
            staff_number="LAW-CASE-NEW",
            admission_number="ADV-CASE-NEW",
            date_hired=date(2026, 9, 1),
        )

        response = self.client_api.patch(
            reverse("case-reassign-lawyer", kwargs={"case_id": created.id}),
            {"membership_id": str(new_lawyer.id)},
            format="json",
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertTrue(
            Notification.objects.filter(
                recipient=new_lawyer.user,
                case=created,
                notification_type=Notification.NotificationType.CASE_REASSIGNMENT,
                read_at__isnull=True,
            ).exists()
        )
