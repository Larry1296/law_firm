"""End-to-end walkthrough of the firm intake pipeline.

The flow tested here mirrors the architecture enforced by the codebase:

    1. Create an INDIVIDUAL client through the admin client-creation API.
       The client is created as a PROSPECT/PROSPECTIVE legal entity with no
       matter and no conflict check attached to it.

    2. Propose a matter against that client. Proposing a matter creates a
       ClientMatterConflictCheck record - it is NOT a case, and it carries its
       own reference number (PMA/CONF/<year>/<n>).

    3. Perform the conflict check lifecycle:
       NOT_STARTED -> IN_PROGRESS -> CLEARED, then record the separate firm
       acceptance decision (ACCEPTED) with a scope confirmation and engagement
       status.

    4. Open the matter. CaseService validates the cleared + accepted +
       unconsumed conflict check, consumes it, promotes the client to
       OFFICIAL / OFFICIAL_CLIENT and issues the internal matter number.
"""

from datetime import date

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from apps.cases.models import Case, CaseParty
from apps.clients.models import (
    Client,
    ClientDueDiligence,
    ClientMatterConflictCheck,
    ConflictCheckHistory,
    IndividualClient,
)
from apps.common.choices import (
    ConflictCheckSourceCategory,
    ConflictCheckStatus,
    UserRole,
)
from apps.firm.models import LawFirm
from apps.staff.models import (
    Lawyer,
    LawyerPermission,
    LawyerPermissionGrant,
    Secretary,
)
from apps.users.models import User


class ClientIntakeToMatterFlowTests(TestCase):
    """Individual client -> proposed matter -> conflict check -> matter."""

    def setUp(self):
        self.api = APIClient()

        self.admin = User.objects.create_user(
            email="flow-admin@example.test",
            password="strong-pass123",
            first_name="Flow",
            last_name="Admin",
            phone_number="+254700900001",
            national_id_number="FLOWADMIN001",
            role=UserRole.ADMIN,
        )
        self.firm = LawFirm.objects.create(
            name="Flow & Partners Advocates",
            registration_number="FLOW-FIRM-001",
            owner=self.admin,
        )
        # The owning admin is also an admitted advocate: conflict decisions and
        # firm acceptance may only be recorded by an active advocate.
        self.lawyer = Lawyer.objects.create(
            user=self.admin,
            law_firm=self.firm,
            staff_number="FLOW-LAW-001",
            admission_number="ADV-FLOW-001",
            date_hired=date(2026, 1, 1),
        )
        LawyerPermissionGrant.objects.create(
            lawyer=self.lawyer,
            code=LawyerPermission.CREATE_CASES,
            granted_by=self.admin,
        )
        secretary_user = User.objects.create_user(
            email="flow-secretary@example.test",
            password="strong-pass123",
            first_name="Flow",
            last_name="Secretary",
            phone_number="+254700900002",
            national_id_number="FLOWSEC001",
            role=UserRole.STAFF,
        )
        self.secretary = Secretary.objects.create(
            user=secretary_user,
            law_firm=self.firm,
            staff_number="FLOW-SEC-001",
            date_hired=date(2026, 1, 2),
        )

        self.api.force_authenticate(self.admin)

    # ------------------------------------------------------------------
    # Step 1 - individual client creation
    # ------------------------------------------------------------------
    def individual_payload(self, **overrides):
        data = {
            "full_name": "Wanjiru Njeri Kamau",
            "first_name": "Wanjiru",
            "middle_name": "Njeri",
            "last_name": "Kamau",
            "phone_number": "+254733900111",
            "email": "",
            "access_type": Client.AccessType.ASSISTED,
            "identification_type": IndividualClient.IdentificationType.NATIONAL_ID,
            "identification_number": "31456789",
            "identification_country": "Kenya",
            "national_id": "31456789",
            "kra_pin": "A031456789Z",
            "date_of_birth": "1985-04-23",
            "gender": IndividualClient.Gender.FEMALE,
            "occupation_status": IndividualClient.OccupationStatus.SELF_EMPLOYED,
            "occupation": "Trader",
            "nationality": "Kenyan",
            "citizenship": "Kenya",
            "preferred_language": "Kiswahili",
            "preferred_contact_channel": "PHONE",
            "country": "Kenya",
            "county": "Nairobi",
            "city": "Nairobi",
            "street": "Ngara",
            "address_description": "Ngara, Nairobi",
            "full_address": "Ngara, Nairobi",
            "privacy_notice_version": "2026-07",
            "privacy_notice_delivery_method": IndividualClient.PrivacyNoticeDeliveryMethod.VERBAL,
            "privacy_notice_acknowledged": True,
            "privacy_acknowledgement_reference": "SIGNED-FLOW-001",
            "privacy_lawful_basis": "CONTRACT_AND_LEGAL_OBLIGATION",
            "personal_data_source": IndividualClient.PersonalDataSource.CLIENT,
            "onboarding_method": IndividualClient.OnboardingMethod.IN_PERSON,
            "acting_for_self": True,
            "purpose_and_nature_of_relationship": "Recovery of an unpaid commercial debt",
            "next_of_kin_name": "Peter Kamau Mwangi",
            "next_of_kin_relationship": "Spouse",
            "next_of_kin_phone": "+254733900112",
            "next_of_kin_email": "",
        }
        data.update(overrides)
        return data

    def create_individual_client(self, **overrides):
        response = self.api.post(
            reverse("admin-individual-client-create"),
            self.individual_payload(**overrides),
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        return Client.objects.get(id=response.data["client"]["id"]), response

    def test_step_1_individual_client_is_created_as_a_prospect_only(self):
        client, response = self.create_individual_client()

        # Client identity
        self.assertEqual(client.client_type, Client.ClientType.INDIVIDUAL)
        self.assertEqual(client.access_type, Client.AccessType.ASSISTED)
        self.assertEqual(client.firm_id, self.firm.id)

        # Assisted clients get no portal user and no temporary password
        self.assertIsNone(client.user_id)
        self.assertIsNone(response.data["portal_user"])
        self.assertIsNone(response.data["temp_password"])

        # Profile + due diligence rows are written by the service layer
        profile = IndividualClient.objects.get(client=client)
        self.assertEqual(profile.nationality, "Kenyan")
        self.assertTrue(profile.privacy_notice_acknowledged)
        due_diligence = ClientDueDiligence.objects.get(client=client)
        self.assertTrue(due_diligence.acting_for_self)

        # Business rule: a new client is a prospect with no matter and no check
        self.assertIn(
            client.lifecycle_status,
            {Client.LifecycleStatus.PROSPECT, Client.LifecycleStatus.PROSPECTIVE},
        )
        self.assertFalse(client.is_verified)
        self.assertFalse(client.cases.exists())
        self.assertFalse(client.matter_conflict_checks.exists())

    # ------------------------------------------------------------------
    # Step 2 - propose a matter (creates the conflict check record)
    # ------------------------------------------------------------------
    def proposed_matter_payload(self, title="Recovery of unpaid supply invoices"):
        return {
            "proposed_matter_title": title,
            "proposed_instructions": (
                "Client instructs the firm to recover KES 4,200,000 in unpaid "
                "invoices from a former trading partner."
            ),
            "factual_summary": "Goods were supplied in 2025 and remain unpaid.",
            "desired_outcome": "Full payment of the principal sum, interest and costs.",
            "urgency_level": "STANDARD",
            "responsible_lawyer_id": str(self.lawyer.id),
            "parties": [
                {
                    "name": "Highridge Supplies Limited",
                    "party_type": "ORGANISATION",
                    "role": "PROPOSED_ADVERSE_PARTY",
                }
            ],
        }

    def propose_matter(self, client, title="Recovery of unpaid supply invoices"):
        response = self.api.post(
            reverse("admin-client-conflict-checks", kwargs={"client_id": client.id}),
            self.proposed_matter_payload(title),
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        return ClientMatterConflictCheck.objects.get(
            id=response.data["conflict_check"]["id"]
        )

    def test_step_2_proposed_matter_creates_a_conflict_check_not_a_case(self):
        client, _ = self.create_individual_client()
        check = self.propose_matter(client)

        self.assertEqual(check.client_id, client.id)
        self.assertEqual(check.firm_id, self.firm.id)
        self.assertEqual(check.status, ConflictCheckStatus.NOT_STARTED)
        self.assertTrue(check.reference_number.startswith("PMA/CONF/"))
        self.assertEqual(
            check.acceptance_decision,
            ClientMatterConflictCheck.AcceptanceDecision.PENDING,
        )

        # No case yet - only the proposed matter exists
        self.assertIsNone(check.created_case_id)
        self.assertIsNone(check.consumed_at)
        self.assertFalse(Case.objects.filter(client=client).exists())

        # Client + adverse party are both captured as screened parties
        self.assertEqual(check.parties.count(), 2)
        self.assertTrue(
            check.parties.filter(role="PROPOSED_ADVERSE_PARTY", name="Highridge Supplies Limited").exists()
        )
        self.assertTrue(
            ConflictCheckHistory.objects.filter(
                conflict_check=check, action="PROPOSED_MATTER_CREATED"
            ).exists()
        )

        # Client is still a prospect
        client.refresh_from_db()
        self.assertIn(
            client.lifecycle_status,
            {Client.LifecycleStatus.PROSPECT, Client.LifecycleStatus.PROSPECTIVE},
        )

    # ------------------------------------------------------------------
    # Step 3 - run the conflict check and record firm acceptance
    # ------------------------------------------------------------------
    def start_check(self, client, check):
        response = self.api.post(
            reverse(
                "admin-client-conflict-check-start",
                kwargs={"client_id": client.id, "check_id": check.id},
            ),
            {"summary": "Conflict search commenced against firm records."},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        check.refresh_from_db()
        return check

    def clear_check(self, client, check):
        response = self.api.post(
            reverse(
                "admin-client-conflict-check-decide",
                kwargs={"client_id": client.id, "check_id": check.id},
            ),
            {
                "decision": ConflictCheckStatus.CLEARED,
                "names_checked": [client.full_name, "Highridge Supplies Limited"],
                "source_categories_checked": [
                    ConflictCheckSourceCategory.CURRENT_CLIENTS,
                    ConflictCheckSourceCategory.FORMER_CLIENTS,
                    ConflictCheckSourceCategory.OPEN_MATTERS,
                    ConflictCheckSourceCategory.CLOSED_MATTERS,
                ],
                "result_summary": (
                    "No relevant conflict identified for the proposed instructions "
                    "based on the information and records checked."
                ),
                "decision_confirmation": True,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        check.refresh_from_db()
        return check

    def accept_matter(self, client, check):
        response = self.api.post(
            reverse(
                "admin-client-conflict-check-acceptance",
                kwargs={"client_id": client.id, "check_id": check.id},
            ),
            {
                "decision": ClientMatterConflictCheck.AcceptanceDecision.ACCEPTED,
                "scope_confirmation": (
                    "Debt recovery instructions accepted: demand, plaint and "
                    "prosecution of the claim to judgment."
                ),
                "engagement_status": ClientMatterConflictCheck.EngagementStatus.SIGNED,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        check.refresh_from_db()
        return check

    def cleared_and_accepted_check(self, client, title="Recovery of unpaid supply invoices"):
        check = self.propose_matter(client, title)
        check = self.start_check(client, check)
        check = self.clear_check(client, check)
        return self.accept_matter(client, check)

    def test_step_3_conflict_check_lifecycle_clears_and_is_accepted(self):
        client, _ = self.create_individual_client()
        check = self.propose_matter(client)

        check = self.start_check(client, check)
        self.assertEqual(check.status, ConflictCheckStatus.IN_PROGRESS)

        check = self.clear_check(client, check)
        self.assertEqual(check.status, ConflictCheckStatus.CLEARED)
        self.assertTrue(check.decision_confirmation)
        self.assertEqual(check.decided_by_id, self.lawyer.id)
        self.assertIsNotNone(check.decided_at)
        self.assertIn(client.full_name, check.names_checked)

        # Clearance alone must not open a matter
        self.assertEqual(
            check.acceptance_decision,
            ClientMatterConflictCheck.AcceptanceDecision.PENDING,
        )
        response = self.api.post(
            reverse("case-create"), self.matter_payload(client, check), format="json"
        )
        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("acceptance_decision", response.data)

        check = self.accept_matter(client, check)
        self.assertEqual(
            check.acceptance_decision,
            ClientMatterConflictCheck.AcceptanceDecision.ACCEPTED,
        )
        self.assertEqual(check.accepted_by_id, self.lawyer.id)
        self.assertIsNotNone(check.accepted_at)

        # The check is now listed as cleared + unconsumed and ready for opening
        ready = self.api.get(
            reverse(
                "admin-client-conflict-checks-cleared-unconsumed",
                kwargs={"client_id": client.id},
            )
        )
        self.assertEqual(ready.status_code, 200, ready.data)
        self.assertEqual(
            [item["id"] for item in ready.data["conflict_checks"]], [str(check.id)]
        )

    def test_step_3_uncleared_check_cannot_open_a_matter(self):
        client, _ = self.create_individual_client()
        check = self.propose_matter(client)

        response = self.api.post(
            reverse("case-create"), self.matter_payload(client, check), format="json"
        )
        self.assertEqual(response.status_code, 400, response.data)
        self.assertFalse(Case.objects.filter(client=client).exists())

    # ------------------------------------------------------------------
    # Step 4 - open the matter
    # ------------------------------------------------------------------
    def matter_payload(self, client, check, **overrides):
        payload = {
            "client_id": str(client.id),
            "conflict_check_id": str(check.id),
            "assigned_lawyer_membership_id": str(self.lawyer.id),
            "assigned_secretary_membership_id": str(self.secretary.id),
            "entry_route": Case.EntryRoute.NEW_INSTRUCTION,
            "title": "Wanjiru Njeri Kamau v Highridge Supplies Limited",
            "description": "Recovery of KES 4,200,000 in unpaid supply invoices.",
            "case_type": Case.CaseType.DEBT_RECOVERY,
            "practice_area": Case.PracticeArea.CIVIL_COMMERCIAL_LITIGATION,
            "matter_nature": Case.MatterNature.CONTENTIOUS,
            "forum": Case.Forum.COURT,
            "procedure_type": Case.ProcedureTrack.CIVIL_SUIT,
            "procedure_track": Case.ProcedureTrack.CIVIL_SUIT,
            "priority": Case.Priority.MEDIUM,
            "client_party_role": CaseParty.PartyRole.PLAINTIFF,
            "defendant": "Highridge Supplies Limited",
        }
        payload.update(overrides)
        return payload

    def test_step_4_matter_opens_consumes_the_check_and_promotes_the_client(self):
        client, _ = self.create_individual_client()
        check = self.cleared_and_accepted_check(client)

        response = self.api.post(
            reverse("case-create"), self.matter_payload(client, check), format="json"
        )
        self.assertEqual(response.status_code, 201, response.data)
        case = Case.objects.get(id=response.data["data"]["id"])

        # Internal matter number is firm-issued and distinct from any court number
        self.assertTrue(case.case_number.startswith("MAT-"))
        self.assertEqual(case.official_court_case_number, "")
        self.assertEqual(case.matter_status, Case.MatterStatus.MATTER_OPEN)
        self.assertEqual(case.court_stage, Case.CourtStage.NOT_FILED)
        self.assertEqual(case.client_id, client.id)
        self.assertEqual(case.firm_id, self.firm.id)
        self.assertEqual(case.assigned_lawyer_id, self.lawyer.id)
        self.assertEqual(case.assigned_secretary_id, self.secretary.id)

        # Parties derived from the intake
        self.assertTrue(case.parties.filter(is_our_client=True).exists())
        self.assertTrue(case.parties.filter(is_adverse=True).exists())

        # The conflict check is consumed exactly once
        check.refresh_from_db()
        self.assertEqual(check.created_case_id, case.id)
        self.assertIsNotNone(check.consumed_at)
        self.assertTrue(
            ConflictCheckHistory.objects.filter(
                conflict_check=check, action="CONSUMED_FOR_CASE"
            ).exists()
        )

        # Prospect is promoted to an official client
        client.refresh_from_db()
        self.assertEqual(client.lifecycle_status, Client.LifecycleStatus.OFFICIAL)

    def test_step_4_a_consumed_check_cannot_open_a_second_matter(self):
        client, _ = self.create_individual_client()
        check = self.cleared_and_accepted_check(client)

        first = self.api.post(
            reverse("case-create"), self.matter_payload(client, check), format="json"
        )
        self.assertEqual(first.status_code, 201, first.data)

        second = self.api.post(
            reverse("case-create"),
            self.matter_payload(client, check, title="Second attempt on same clearance"),
            format="json",
        )
        self.assertEqual(second.status_code, 400, second.data)
        self.assertEqual(Case.objects.filter(client=client).count(), 1)

    def test_full_intake_pipeline_end_to_end(self):
        """The whole journey in one pass, in the order the firm works it."""
        # 1. Client
        client, _ = self.create_individual_client()
        self.assertFalse(client.matter_conflict_checks.exists())

        # 2. Proposed matter
        check = self.propose_matter(client, title="Debt recovery - Highridge")
        self.assertEqual(check.status, ConflictCheckStatus.NOT_STARTED)

        # 3. Conflict check + acceptance
        check = self.start_check(client, check)
        check = self.clear_check(client, check)
        check = self.accept_matter(client, check)
        self.assertEqual(check.status, ConflictCheckStatus.CLEARED)
        self.assertEqual(
            check.acceptance_decision,
            ClientMatterConflictCheck.AcceptanceDecision.ACCEPTED,
        )

        # 4. Matter
        response = self.api.post(
            reverse("case-create"), self.matter_payload(client, check), format="json"
        )
        self.assertEqual(response.status_code, 201, response.data)
        case = Case.objects.get(id=response.data["data"]["id"])

        # One client, one proposed matter, one conflict clearance, one matter
        client.refresh_from_db()
        check.refresh_from_db()
        self.assertEqual(client.matter_conflict_checks.count(), 1)
        self.assertEqual(client.cases.count(), 1)
        self.assertEqual(check.created_case_id, case.id)
        self.assertEqual(client.lifecycle_status, Client.LifecycleStatus.OFFICIAL)
