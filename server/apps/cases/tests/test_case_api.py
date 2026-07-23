from datetime import date, timedelta

from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.cases.models import Case, CaseActivity, CaseEvent
from apps.clients.models import Client
from apps.clients.models import ClientMatterConflictCheck, ConflictCheckHistory, ConflictCheckParty
from apps.common.choices import ConflictCheckSourceCategory, ConflictCheckStatus, UserRole
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

    def cleared_conflict_check(self, client=None, lawyer=None, title="Land Boundary Dispute"):
        client = client or self.client
        lawyer = lawyer or self.owner_lawyer
        index = ClientMatterConflictCheck.objects.count() + 1
        check = ClientMatterConflictCheck.objects.create(
            firm=self.firm,
            client=client,
            reference_number=f"PMA/CONF/2026/API-{index:04d}",
            proposed_matter_title=title,
            proposed_instructions="Boundary dispute between neighbours.",
            status=ConflictCheckStatus.CLEARED,
            responsible_lawyer=lawyer,
            names_checked=[client.full_name, "John Doe"],
            source_categories_checked=[
                ConflictCheckSourceCategory.CURRENT_CLIENTS,
                ConflictCheckSourceCategory.OPEN_MATTERS,
            ],
            result_summary="No relevant conflict identified for the proposed instructions based on the information and records checked.",
            decision_confirmation=True,
            decided_by=lawyer,
            decided_at=timezone.now(),
            completed_at=timezone.now(),
            created_by=self.admin,
        )
        ConflictCheckParty.objects.create(
            conflict_check=check,
            name=client.full_name,
            party_type=ConflictCheckParty.PartyType.PERSON if client.client_type == Client.ClientType.INDIVIDUAL else ConflictCheckParty.PartyType.ORGANISATION,
            role=ConflictCheckParty.PartyRole.PROSPECTIVE_CLIENT,
            created_by=self.admin,
        )
        ConflictCheckParty.objects.create(
            conflict_check=check,
            name="John Doe",
            party_type=ConflictCheckParty.PartyType.PERSON,
            role=ConflictCheckParty.PartyRole.PROPOSED_ADVERSE_PARTY,
            created_by=self.admin,
        )
        ConflictCheckHistory.objects.create(
            conflict_check=check,
            from_status=ConflictCheckStatus.IN_PROGRESS,
            to_status=ConflictCheckStatus.CLEARED,
            action="FINAL_DECISION_RECORDED",
            summary=check.result_summary,
            actor=self.admin,
        )
        return check

    def payload(self):
        check = self.cleared_conflict_check(lawyer=self.lawyer)
        return {
            "client_id": str(self.client.id),
            "conflict_check_id": str(check.id),
            "assigned_lawyer_membership_id": str(self.lawyer.id),
            "assigned_secretary_membership_id": str(self.secretary.id),
            "official_court_case_number": "ELC E001 of 2026",
            "filing_date": "2026-07-17",
            "efiling_reference": "EFILE-2026-000001",
            "payment_reference": "KES-PAY-2026-000001",
            "title": "Land Boundary Dispute",
            "description": "Boundary dispute between neighbours.",
            "case_type": Case.CaseType.LAND,
            "court_type": Case.CourtType.ENVIRONMENT_LAND,
            "priority": Case.Priority.HIGH,
            "court_name": "ELC Nairobi",
            "court_station": "Nairobi",
            "court_location": "Nairobi",
            "defendant": "John Doe",
        }

    def test_admin_creates_case_for_existing_client_and_promotes_client(self):
        response = self.client_api.post(reverse("case-create"), self.payload(), format="json")

        self.assertEqual(response.status_code, 201, response.data)
        self.assertNotIn("case", response.data)
        self.assertEqual(response.data["data"]["plaintiff_name"], "Mary Wanjiku")
        self.assertEqual(response.data["data"]["case_owner"]["party_role"], "PLAINTIFF")
        self.assertEqual(response.data["data"]["case_owner"]["full_name"], "Mary Wanjiku")
        created = Case.objects.get(id=response.data["data"]["id"])
        self.assertEqual(created.client, self.client)
        self.assertEqual(created.case_number, "ELC E001 of 2026")
        self.assertEqual(created.official_court_case_number, "ELC E001 of 2026")
        self.assertEqual(created.court_stage, Case.CourtStage.FILED)
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
        self.assertFalse(self.client.is_verified)
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
        payload["official_court_case_number"] = "ELC E002 of 2026"
        payload["efiling_reference"] = "EFILE-2026-000002"
        payload["assigned_lawyer_membership_id"] = None
        payload["assigned_secretary_membership_id"] = None

        response = self.client_api.post(reverse("case-create"), payload, format="json")

        self.assertEqual(response.status_code, 201, response.data)
        created = Case.objects.get(id=response.data["data"]["id"])
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
        payload["official_court_case_number"] = "ELC E003 of 2026"
        payload["efiling_reference"] = "EFILE-2026-000003"
        payload["assigned_lawyer_membership_id"] = None

        self.client_api.force_authenticate(user=delegated_admin)
        list_response = self.client_api.get(reverse("case-list"))
        self.assertEqual(list_response.status_code, 200, list_response.data)
        self.assertEqual(len(list_response.data["cases"]), 0)

        response = self.client_api.post(reverse("case-create"), payload, format="json")
        self.assertEqual(response.status_code, 403, response.data)
        self.assertFalse(
            Case.objects.filter(official_court_case_number="ELC E003 of 2026").exists()
        )

    def test_authorized_secretary_case_creation_uses_same_contract_and_assignment_payload(self):
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
        payload["official_court_case_number"] = "ELC E004 of 2026"
        payload["efiling_reference"] = "EFILE-2026-000004"
        payload["assigned_lawyer_membership_id"] = str(second_lawyer.id)
        payload["assigned_secretary_membership_id"] = str(self.secretary.id)
        payload["priority"] = Case.Priority.URGENT

        self.client_api.force_authenticate(user=self.secretary.user)
        response = self.client_api.post(reverse("secretary-cases"), payload, format="json")

        self.assertEqual(response.status_code, 403, response.data)
        self.assertFalse(Case.objects.filter(official_court_case_number="ELC E004 of 2026").exists())

    def test_authorized_secretary_can_create_company_client_case(self):
        company = Client.objects.create(
            firm=self.firm,
            created_by=self.admin,
            full_name="Musau Building Construction LTD",
            email="legal@musau.test",
            phone_number="+254744000099",
            client_type=Client.ClientType.COMPANY,
            lifecycle_status=Client.LifecycleStatus.OFFICIAL_CLIENT,
        )
        payload = self.payload()
        payload.update(
            {
                "client_id": str(company.id),
                "official_court_case_number": "ELC E005 of 2026",
                "efiling_reference": "EFILE-2026-000005",
                "defendant": "Metro Data Systems Limited",
            }
        )

        self.client_api.force_authenticate(user=self.secretary.user)
        response = self.client_api.post(reverse("secretary-cases"), payload, format="json")

        self.assertEqual(response.status_code, 403, response.data)
        self.assertFalse(Case.objects.filter(official_court_case_number="ELC E005 of 2026").exists())

    def test_secretary_without_manage_cases_permission_receives_403(self):
        user = User.objects.create_user(
            email="no-case-secretary@example.com",
            password="strong-pass123",
            first_name="No",
            last_name="Cases",
            phone_number="+254744000020",
            national_id_number="744000020",
            role=UserRole.STAFF,
        )
        Secretary.objects.create(
            user=user,
            law_firm=self.firm,
            staff_number="SEC-NO-CASES",
            date_hired=date(2026, 1, 1),
        )

        self.client_api.force_authenticate(user=user)
        response = self.client_api.post(reverse("secretary-cases"), self.payload(), format="json")

        self.assertEqual(response.status_code, 403, response.data)

    def test_secretary_cannot_create_case_for_another_firm_client(self):
        other_admin = User.objects.create_user(
            email="other-firm-owner@example.com",
            password="strong-pass123",
            first_name="Other",
            last_name="Owner",
            phone_number="+254744000021",
            national_id_number="744000021",
            role=UserRole.ADMIN,
        )
        other_firm = LawFirm.objects.create(name="Other Firm", registration_number="OTHER-FIRM-001", owner=other_admin)
        other_client = Client.objects.create(
            firm=other_firm,
            created_by=other_admin,
            full_name="Other Firm Client",
            client_type=Client.ClientType.COMPANY,
            lifecycle_status=Client.LifecycleStatus.OFFICIAL_CLIENT,
        )
        payload = self.payload()
        payload["client_id"] = str(other_client.id)
        payload["official_court_case_number"] = "ELC E006 of 2026"
        payload["efiling_reference"] = "EFILE-2026-000006"

        self.client_api.force_authenticate(user=self.secretary.user)
        response = self.client_api.post(reverse("secretary-cases"), payload, format="json")

        self.assertEqual(response.status_code, 400, response.data)

    def test_secretary_cannot_assign_another_firm_staff(self):
        other_admin = User.objects.create_user(
            email="other-staff-owner@example.com",
            password="strong-pass123",
            first_name="Other",
            last_name="StaffOwner",
            phone_number="+254744000022",
            national_id_number="744000022",
            role=UserRole.ADMIN,
        )
        other_firm = LawFirm.objects.create(name="Other Staff Firm", registration_number="OTHER-FIRM-002", owner=other_admin)
        other_lawyer_user = User.objects.create_user(
            email="other-lawyer@example.com",
            password="strong-pass123",
            first_name="Other",
            last_name="Lawyer",
            phone_number="+254744000023",
            national_id_number="744000023",
            role=UserRole.STAFF,
        )
        other_lawyer = Lawyer.objects.create(
            user=other_lawyer_user,
            law_firm=other_firm,
            staff_number="OTHER-LAW-001",
            admission_number="OTHER-ADV-001",
            date_hired=date(2026, 1, 1),
        )
        payload = self.payload()
        payload["official_court_case_number"] = "ELC E007 of 2026"
        payload["efiling_reference"] = "EFILE-2026-000007"
        payload["assigned_lawyer_membership_id"] = str(other_lawyer.id)

        self.client_api.force_authenticate(user=self.secretary.user)
        response = self.client_api.post(reverse("secretary-cases"), payload, format="json")

        self.assertEqual(response.status_code, 403, response.data)

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
        created = Case.objects.get(id=response.data["data"]["id"])

        self.client_api.force_authenticate(user=self.lawyer.user)
        next_event_at = timezone.now() + timedelta(days=14)
        status_response = self.client_api.post(
            reverse("case-status", kwargs={"case_id": created.id}),
            {
                "status": Case.Status.HEARING,
                "note": "Matter certified ready for hearing.",
                "next_event": {
                    "starts_at": next_event_at.isoformat(),
                    "court_station": "Milimani Law Courts",
                    "courtroom": "Court 3",
                    "is_client_visible": True,
                },
            },
            format="json",
        )
        self.assertEqual(status_response.status_code, 200, status_response.data)
        created.refresh_from_db()
        self.assertEqual(created.status, Case.Status.HEARING)
        self.assertTrue(created.is_active)
        self.assertIsNotNone(created.next_court_date)
        self.assertEqual(created.next_action, f"Hearing - {created.case_number}")
        next_event = CaseEvent.objects.get(case=created, event_type=CaseEvent.EventType.HEARING)
        self.assertEqual(next_event.title, f"Hearing - {created.case_number}")
        self.assertEqual(next_event.court_station, "Milimani Law Courts")
        self.assertEqual(next_event.courtroom, "Court 3")
        self.assertTrue(next_event.is_client_visible)
        self.assertTrue(
            Notification.objects.filter(
                recipient=client_user,
                case=created,
                notification_type=Notification.NotificationType.CASE_EVENT,
                read_at__isnull=True,
            ).exists()
        )
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
        self.assertEqual(created.status, Case.Status.HEARING)

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
        created = Case.objects.get(id=response.data["data"]["id"])

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
