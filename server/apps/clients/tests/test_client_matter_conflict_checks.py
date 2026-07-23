from datetime import date

from django.urls import reverse
from rest_framework.test import APITestCase

from apps.cases.models import Case
from apps.clients.models import Client, ClientMatterConflictCheck, ConflictCheckHistory
from apps.common.choices import ConflictCheckSourceCategory, ConflictCheckStatus, UserRole
from apps.firm.models import LawFirm
from apps.staff.models import Lawyer, LawyerPermission, LawyerPermissionGrant, Secretary
from apps.users.models import User


class ClientMatterConflictCheckTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            email="conflict-admin@example.com",
            password="pass",
            first_name="Conflict",
            last_name="Admin",
            phone_number="+254711100001",
            national_id_number="CONFADMIN001",
            role=UserRole.ADMIN,
        )
        self.firm = LawFirm.objects.create(name="Conflict Firm", registration_number="CONF-FIRM", owner=self.admin)
        self.lawyer = Lawyer.objects.create(
            user=self.admin,
            law_firm=self.firm,
            staff_number="ADV-CONF-001",
            admission_number="ADV-CONF-001",
            date_hired=date(2026, 1, 1),
        )
        LawyerPermissionGrant.objects.create(
            lawyer=self.lawyer,
            code=LawyerPermission.CREATE_CASES,
            granted_by=self.admin,
        )
        self.secretary_user = User.objects.create_user(
            email="conflict-secretary@example.com",
            password="pass",
            first_name="Conflict",
            last_name="Secretary",
            phone_number="+254711100002",
            national_id_number="CONFSEC001",
            role=UserRole.STAFF,
        )
        self.secretary = Secretary.objects.create(
            user=self.secretary_user,
            law_firm=self.firm,
            staff_number="SEC-CONF-001",
            date_hired=date(2026, 1, 2),
        )
        self.portal_user = User.objects.create_user(
            email="conflict-client@example.com",
            password="pass",
            first_name="Conflict",
            last_name="Client",
            phone_number="+254711100003",
            national_id_number="CONFCLIENT001",
            role=UserRole.PROSPECT,
        )
        self.client_record = Client.objects.create(
            firm=self.firm,
            user=self.portal_user,
            created_by=self.admin,
            full_name="Conflict Client Ltd",
            email="conflict-client@example.com",
            phone_number="+254711100003",
            client_type=Client.ClientType.COMPANY,
            access_type=Client.AccessType.PROSPECT,
            lifecycle_status=Client.LifecycleStatus.PROSPECT,
            is_verified=False,
        )
        self.client.force_authenticate(self.admin)

    def proposed_payload(self, title="Debt recovery"):
        return {
            "proposed_matter_title": title,
            "proposed_instructions": "Recover an unpaid commercial debt.",
            "factual_summary": "Invoices remain unpaid.",
            "desired_outcome": "Payment and costs.",
            "responsible_lawyer_id": str(self.lawyer.id),
            "parties": [
                {
                    "name": "Proposed Adverse Ltd",
                    "party_type": "ORGANISATION",
                    "role": "PROPOSED_ADVERSE_PARTY",
                }
            ],
        }

    def create_check(self):
        response = self.client.post(
            reverse("admin-client-conflict-checks", kwargs={"client_id": self.client_record.id}),
            self.proposed_payload(),
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        return ClientMatterConflictCheck.objects.get(id=response.data["conflict_check"]["id"])

    def clear_check(self, check):
        response = self.client.post(
            reverse("admin-client-conflict-check-start", kwargs={"client_id": self.client_record.id, "check_id": check.id}),
            {},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        response = self.client.post(
            reverse("admin-client-conflict-check-decide", kwargs={"client_id": self.client_record.id, "check_id": check.id}),
            {
                "decision": ConflictCheckStatus.CLEARED,
                "names_checked": ["Conflict Client Ltd", "Proposed Adverse Ltd"],
                "source_categories_checked": [
                    ConflictCheckSourceCategory.CURRENT_CLIENTS,
                    ConflictCheckSourceCategory.OPEN_MATTERS,
                ],
                "result_summary": "No relevant conflict identified for the proposed instructions based on the information and records checked.",
                "decision_confirmation": True,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        check.refresh_from_db()
        return check

    def case_payload(self, check, number="ELC E100 of 2026"):
        return {
            "client_id": str(self.client_record.id),
            "conflict_check_id": str(check.id),
            "assigned_lawyer_membership_id": str(self.lawyer.id),
            "assigned_secretary_membership_id": str(self.secretary.id),
            "official_court_case_number": number,
            "filing_date": "2026-07-17",
            "efiling_reference": "EFILE-CONF-001",
            "payment_reference": "PAY-CONF-001",
            "title": "Conflict Client Ltd v Proposed Adverse Ltd",
            "description": "Debt recovery.",
            "case_type": Case.CaseType.DEBT_RECOVERY,
            "procedure_track": Case.ProcedureTrack.CIVIL_SUIT,
            "court_type": Case.CourtType.MAGISTRATE,
            "court_station": "Milimani",
            "defendant": "Proposed Adverse Ltd",
        }

    def test_client_creation_state_is_prospect_and_has_no_case_or_check(self):
        self.assertEqual(self.client_record.lifecycle_status, Client.LifecycleStatus.PROSPECT)
        self.assertFalse(self.client_record.is_verified)
        self.assertFalse(self.client_record.cases.exists())
        self.assertFalse(self.client_record.matter_conflict_checks.exists())

    def test_conflict_check_exists_without_case_and_records_history(self):
        check = self.create_check()
        self.assertEqual(check.status, ConflictCheckStatus.NOT_STARTED)
        self.assertIsNone(check.created_case_id)
        self.assertEqual(check.parties.count(), 2)
        self.assertTrue(ConflictCheckHistory.objects.filter(conflict_check=check, action="PROPOSED_MATTER_CREATED").exists())

    def test_one_client_can_have_many_independent_checks(self):
        first = self.create_check()
        second_response = self.client.post(
            reverse("admin-client-conflict-checks", kwargs={"client_id": self.client_record.id}),
            self.proposed_payload(title="Employment claim"),
            format="json",
        )
        self.assertEqual(second_response.status_code, 201, second_response.data)
        self.assertEqual(self.client_record.matter_conflict_checks.count(), 2)
        self.assertNotEqual(str(first.id), second_response.data["conflict_check"]["id"])

    def test_secretary_cannot_record_conflict_decision(self):
        check = self.clear_check(self.create_check())
        second = self.create_check()
        self.client.post(
            reverse("admin-client-conflict-check-start", kwargs={"client_id": self.client_record.id, "check_id": second.id}),
            {},
            format="json",
        )
        self.client.force_authenticate(self.secretary_user)
        response = self.client.post(
            reverse("admin-client-conflict-check-decide", kwargs={"client_id": self.client_record.id, "check_id": second.id}),
            {
                "decision": ConflictCheckStatus.CONFLICT_CONFIRMED,
                "internal_reason": "Acting would conflict with current instructions.",
                "decision_confirmation": True,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 403, response.data)
        self.assertEqual(check.status, ConflictCheckStatus.CLEARED)

    def test_case_creation_requires_cleared_unconsumed_check_and_consumes_it(self):
        uncleared = self.create_check()
        response = self.client.post(reverse("case-create"), self.case_payload(uncleared), format="json")
        self.assertEqual(response.status_code, 400, response.data)

        check = self.clear_check(uncleared)
        response = self.client.post(reverse("case-create"), self.case_payload(check), format="json")
        self.assertEqual(response.status_code, 201, response.data)
        check.refresh_from_db()
        self.client_record.refresh_from_db()
        self.portal_user.refresh_from_db()
        self.assertIsNotNone(check.created_case_id)
        self.assertIsNotNone(check.consumed_at)
        self.assertEqual(self.client_record.lifecycle_status, Client.LifecycleStatus.OFFICIAL_CLIENT)
        self.assertEqual(self.portal_user.role, UserRole.OFFICIAL_CLIENT)
        self.assertFalse(self.client_record.is_verified)

        second_response = self.client.post(reverse("case-create"), self.case_payload(check, "ELC E101 of 2026"), format="json")
        self.assertEqual(second_response.status_code, 400, second_response.data)

    def test_conflict_confirmed_is_terminal_and_cannot_create_case(self):
        check = self.create_check()
        self.client.post(
            reverse("admin-client-conflict-check-start", kwargs={"client_id": self.client_record.id, "check_id": check.id}),
            {},
            format="json",
        )
        response = self.client.post(
            reverse("admin-client-conflict-check-decide", kwargs={"client_id": self.client_record.id, "check_id": check.id}),
            {
                "decision": ConflictCheckStatus.CONFLICT_CONFIRMED,
                "internal_reason": "Firm acts for the proposed adverse party.",
                "decision_confirmation": True,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        response = self.client.post(reverse("case-create"), self.case_payload(check), format="json")
        self.assertEqual(response.status_code, 400, response.data)
        self.client_record.refresh_from_db()
        self.assertEqual(self.client_record.lifecycle_status, Client.LifecycleStatus.PROSPECT)
