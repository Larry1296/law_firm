from datetime import date

from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.cases.models import (
    ArbitrationProceeding,
    Case,
    CaseActivity,
    CaseParty,
    CaseTimeline,
    CaseFiling,
    CourtProceeding,
    LandMatterDetails,
    MonetaryRelief,
    NonContentiousMatterDetails,
    TribunalProceeding,
)
from apps.clients.models import Client
from apps.clients.models import ClientMatterConflictCheck, ConflictCheckHistory, ConflictCheckParty
from apps.common.choices import ConflictCheckSourceCategory, ConflictCheckStatus, UserRole
from apps.firm.models import LawFirm
from apps.staff.models import Lawyer, Secretary
from apps.users.models import User


class UniversalMatterCreationTests(TestCase):
    def setUp(self):
        self.api = APIClient()
        self.admin = User.objects.create_user(
            email="matter-admin@example.test",
            password="strong-pass123",
            first_name="Matter",
            last_name="Admin",
            phone_number="+254700000001",
            national_id_number="MATADMIN001",
            role=UserRole.ADMIN,
        )
        self.firm = LawFirm.objects.create(
            name="Matter Firm",
            registration_number="MAT-FIRM-001",
            owner=self.admin,
        )
        self.lawyer = Lawyer.objects.create(
            user=self.admin,
            law_firm=self.firm,
            staff_number="MAT-LAW-001",
            admission_number="ADV-MAT-001",
            date_hired=date(2026, 1, 1),
        )
        secretary_user = User.objects.create_user(
            email="matter-secretary@example.test",
            password="strong-pass123",
            first_name="Matter",
            last_name="Secretary",
            phone_number="+254700000002",
            national_id_number="MATSEC001",
            role=UserRole.STAFF,
        )
        self.secretary = Secretary.objects.create(
            user=secretary_user,
            law_firm=self.firm,
            staff_number="MAT-SEC-001",
            date_hired=date(2026, 1, 2),
        )
        self.client = Client.objects.create(
            firm=self.firm,
            created_by=self.admin,
            full_name="Musau Building Construction LTD",
            client_type=Client.ClientType.COMPANY,
            lifecycle_status=Client.LifecycleStatus.PROSPECT,
        )
        self.api.force_authenticate(self.admin)

    def cleared_conflict_check(self, title="Universal proposed matter"):
        index = ClientMatterConflictCheck.objects.count() + 1
        check = ClientMatterConflictCheck.objects.create(
            firm=self.firm,
            client=self.client,
            reference_number=f"PMA/CONF/2026/MAT-{index:04d}",
            proposed_matter_title=title,
            proposed_instructions="Universal matter workflow test.",
            status=ConflictCheckStatus.CLEARED,
            responsible_lawyer=self.lawyer,
            names_checked=[self.client.full_name, "Metro Data Systems Limited"],
            source_categories_checked=[
                ConflictCheckSourceCategory.CURRENT_CLIENTS,
                ConflictCheckSourceCategory.OPEN_MATTERS,
            ],
            result_summary="No relevant conflict identified for the proposed instructions based on the information and records checked.",
            decision_confirmation=True,
            decided_by=self.lawyer,
            decided_at=timezone.now(),
            completed_at=timezone.now(),
            created_by=self.admin,
            acceptance_decision=ClientMatterConflictCheck.AcceptanceDecision.ACCEPTED,
            scope_confirmation="Accepted scope confirmed for test matter.",
            engagement_status=ClientMatterConflictCheck.EngagementStatus.SIGNED,
            accepted_by=lawyer if 'lawyer' in locals() else self.lawyer,
            accepted_at=timezone.now(),
            acceptance_decided_by=lawyer if 'lawyer' in locals() else self.lawyer,
            acceptance_decided_at=timezone.now(),
        )
        ConflictCheckParty.objects.create(
            conflict_check=check,
            name=self.client.full_name,
            party_type=ConflictCheckParty.PartyType.ORGANISATION,
            role=ConflictCheckParty.PartyRole.PROSPECTIVE_CLIENT,
            created_by=self.admin,
        )
        ConflictCheckParty.objects.create(
            conflict_check=check,
            name="Metro Data Systems Limited",
            party_type=ConflictCheckParty.PartyType.ORGANISATION,
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

    def base_payload(self, **overrides):
        check = self.cleared_conflict_check(title=overrides.get("title", "Universal proposed matter"))
        payload = {
            "client_id": str(self.client.id),
            "conflict_check_id": str(check.id),
            "assigned_lawyer_membership_id": str(self.lawyer.id),
            "assigned_secretary_membership_id": str(self.secretary.id),
            "title": "Musau Building Construction LTD matter",
            "description": "Universal matter workflow test.",
            "case_type": Case.CaseType.CIVIL,
            "procedure_type": Case.ProcedureTrack.CIVIL_SUIT,
            "procedure_track": Case.ProcedureTrack.CIVIL_SUIT,
            "priority": Case.Priority.MEDIUM,
            "client_party_role": CaseParty.PartyRole.PLAINTIFF,
            "practice_area": Case.PracticeArea.CIVIL_COMMERCIAL_LITIGATION,
            "matter_nature": Case.MatterNature.CONTENTIOUS,
            "forum": Case.Forum.COURT,
        }
        payload.update(overrides)
        return payload

    def post(self, payload):
        response = self.api.post(reverse("case-create"), payload, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        return Case.objects.get(id=response.data["data"]["id"])

    def test_existing_filed_court_case_persists_court_details_and_money(self):
        case = self.post(self.base_payload(
            entry_route=Case.EntryRoute.EXISTING_FILED_COURT_CASE,
            practice_area=Case.PracticeArea.LAND_ENVIRONMENT,
            official_court_case_number="ELC E012 of 2026",
            filing_date="2026-07-17",
            efiling_reference="EFILE-2026-00045871",
            payment_reference="KES-PAY-2026-781245",
            payment_date="2026-07-17",
            court_type=Case.CourtType.ENVIRONMENT_LAND,
            court_name="Environment and Land Court",
            court_station="Nairobi",
            registry="Milimani Law Courts Registry",
            parties=[{"party_type": "COMPANY", "role": "DEFENDANT", "organization_name": "Metro Data Systems Limited", "is_adverse": True}],
            land_details={"title_number": "NAIROBI/BLOCK/1", "property_description": "Commercial property"},
            monetary_relief={"relief_type": MonetaryRelief.ReliefType.QUANTIFIED, "currency": "KES", "principal_amount": "7500000.00"},
        ))
        self.assertTrue(case.case_number.startswith("MAT-2026-"))
        self.assertNotEqual(case.case_number, case.official_court_case_number)
        self.assertEqual(case.official_court_case_number, "ELC E012 of 2026")
        self.assertEqual(case.court_stage, Case.CourtStage.FILED)
        self.assertEqual(case.matter_status, Case.MatterStatus.MATTER_OPEN)
        self.assertEqual(case.court_proceeding.efiling_reference, "EFILE-2026-00045871")
        self.assertEqual(case.court_proceeding.payment_reference, "KES-PAY-2026-781245")
        self.assertEqual(case.court_proceeding.payment_date, date(2026, 7, 17))
        self.assertTrue(CaseFiling.objects.filter(case=case, filing_type=CaseFiling.FilingType.ORIGINATING_CLAIM, official_court_case_number="ELC E012 of 2026", source="EXISTING_FILED_COURT_CASE_REGISTRATION").exists())
        self.assertEqual(case.land_details.title_number, "NAIROBI/BLOCK/1")
        self.assertEqual(str(case.monetary_relief.principal_amount), "7500000.00")
        self.assertEqual(case.parties.filter(is_adverse=True).count(), 1)

    def test_existing_filed_court_case_accepts_nested_court_date_strings(self):
        case = self.post(self.base_payload(
            entry_route=Case.EntryRoute.EXISTING_FILED_COURT_CASE,
            court_proceeding={
                "official_court_case_number": "HCCOMM E014 of 2026",
                "filing_date": "2026-07-17",
                "efiling_reference": "EFILE-2026-00045872",
                "payment_reference": "KES-PAY-2026-781246",
                "payment_date": "2026-07-17",
                "court_type": Case.CourtType.HIGH_COURT,
                "court_level": "SUPERIOR_COURT",
                "court_name": "High Court of Kenya",
                "court_station": "Nairobi",
                "division": Case.CourtDivision.COMMERCIAL_TAX,
                "registry": "Milimani Commercial and Tax Division Registry",
            },
        ))
        self.assertTrue(case.case_number.startswith("MAT-2026-"))
        self.assertNotEqual(case.case_number, case.official_court_case_number)
        self.assertEqual(case.official_court_case_number, "HCCOMM E014 of 2026")
        self.assertEqual(case.filing_date, date(2026, 7, 17))
        self.assertEqual(case.court_stage, Case.CourtStage.FILED)
        self.assertEqual(case.court_proceeding.filing_date, date(2026, 7, 17))

    def test_new_instruction_creates_unfiled_matter_without_court_filing_facts(self):
        case = self.post(self.base_payload(entry_route=Case.EntryRoute.NEW_INSTRUCTION))
        self.assertEqual(case.matter_status, Case.MatterStatus.MATTER_OPEN)
        self.assertEqual(case.court_stage, Case.CourtStage.NOT_FILED)
        self.assertEqual(case.official_court_case_number, "")
        self.assertFalse(CourtProceeding.objects.filter(matter=case, official_court_case_number__gt="").exists())

    def test_tribunal_arbitration_and_non_contentious_routes_persist_details(self):
        tribunal = self.post(self.base_payload(
            entry_route=Case.EntryRoute.EXISTING_TRIBUNAL_MATTER,
            forum=Case.Forum.TRIBUNAL,
            practice_area=Case.PracticeArea.TRIBUNAL_PROCEEDINGS,
            procedure_type=Case.ProcedureTrack.TRIBUNAL_MATTER,
            procedure_track=Case.ProcedureTrack.TRIBUNAL_MATTER,
            tribunal_proceeding={"tribunal_name": "Business Premises Rent Tribunal", "tribunal_reference": "BPRT-001"},
        ))
        arbitration = self.post(self.base_payload(
            entry_route=Case.EntryRoute.EXISTING_ARBITRATION,
            forum=Case.Forum.ARBITRATION,
            practice_area=Case.PracticeArea.ARBITRATION_MEDIATION,
            procedure_type=Case.ProcedureTrack.ARBITRATION,
            procedure_track=Case.ProcedureTrack.ARBITRATION,
            arbitration_proceeding={"arbitration_reference": "ARB-001", "institution": "NCIA", "seat": "Nairobi"},
        ))
        advisory = self.post(self.base_payload(
            entry_route=Case.EntryRoute.NON_CONTENTIOUS_MATTER,
            forum=Case.Forum.NO_FORMAL_FORUM,
            matter_nature=Case.MatterNature.ADVISORY,
            practice_area=Case.PracticeArea.CORPORATE_COMMERCIAL,
            procedure_type=Case.ProcedureTrack.NON_CONTENTIOUS,
            procedure_track=Case.ProcedureTrack.NON_CONTENTIOUS,
            non_contentious_details={"instruction_type": "Contract Review", "deliverable": "Reviewed contract"},
        ))
        self.assertTrue(TribunalProceeding.objects.filter(matter=tribunal, tribunal_name="Business Premises Rent Tribunal").exists())
        self.assertTrue(ArbitrationProceeding.objects.filter(matter=arbitration, institution="NCIA").exists())
        self.assertTrue(NonContentiousMatterDetails.objects.filter(matter=advisory, instruction_type="Contract Review").exists())
        self.assertEqual(advisory.court_stage, Case.CourtStage.NOT_APPLICABLE)


    def test_cts_reference_is_verified_through_controlled_action(self):
        case = self.post(self.base_payload(
            entry_route=Case.EntryRoute.EXISTING_FILED_COURT_CASE,
            official_court_case_number="HCCOMM E014 of 2026",
            filing_date="2026-07-17",
            efiling_reference="EFILE-2026-00045872",
            payment_reference="KES-PAY-2026-781246",
            payment_date="2026-07-17",
            court_type=Case.CourtType.HIGH_COURT,
            court_station="Nairobi",
            registry="Commercial Registry",
        ))

        response = self.api.post(
            reverse("case-jurisdiction-action", kwargs={"case_id": case.id}),
            {
                "action": "VERIFY_CTS",
                "cts_reference": " cts-hccomm-2026-001248 ",
                "verification_source": "Judiciary eFiling portal and Milimani Commercial Registry record",
                "reason": "CTS reference confirmed against the filed court record.",
                "jurisdiction_notes": "Court record metadata matched the eFiling record.",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        case.refresh_from_db()
        self.assertEqual(case.cts_reference, "CTS-HCCOMM-2026-001248")
        self.assertEqual(case.court_proceeding.cts_reference, "CTS-HCCOMM-2026-001248")
        self.assertTrue(CaseActivity.objects.filter(case=case, action="CTS_REFERENCE_VERIFIED").exists())
        self.assertTrue(CaseTimeline.objects.filter(case=case, action="Court Record Verified").exists())

    def test_cts_verification_requires_reference_source_and_reason(self):
        case = self.post(self.base_payload(
            entry_route=Case.EntryRoute.EXISTING_FILED_COURT_CASE,
            official_court_case_number="HCCOMM E015 of 2026",
            filing_date="2026-07-17",
            efiling_reference="EFILE-2026-00045873",
            court_type=Case.CourtType.HIGH_COURT,
            court_station="Nairobi",
            registry="Commercial Registry",
        ))

        response = self.api.post(
            reverse("case-jurisdiction-action", kwargs={"case_id": case.id}),
            {"action": "VERIFY_CTS", "cts_reference": "", "verification_source": "", "reason": ""},
            format="json",
        )
        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("cts_reference", response.data["errors"])
        self.assertIn("verification_source", response.data["errors"])
        self.assertIn("reason", response.data["errors"])

    def test_controlled_create_fields_are_rejected(self):
        payload = self.base_payload(entry_route=Case.EntryRoute.NEW_INSTRUCTION, cts_reference="CTS-001")
        response = self.api.post(reverse("case-create"), payload, format="json")
        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("cts_reference", response.data["errors"])


    def test_existing_filed_small_claim_uses_claimant_and_respondent(self):
        case = self.post(self.base_payload(
            entry_route=Case.EntryRoute.EXISTING_FILED_COURT_CASE,
            case_type=Case.CaseType.SMALL_CLAIM,
            procedure_type=Case.ProcedureTrack.SMALL_CLAIM,
            procedure_track=Case.ProcedureTrack.SMALL_CLAIM,
            client_party_role=CaseParty.PartyRole.PLAINTIFF,
            official_court_case_number="SCCCOMM E0001 of 2026",
            filing_date="2026-07-17",
            efiling_reference="EFILE-SCC-2026-0001",
            payment_reference="PAY-SCC-2026-0001",
            payment_date="2026-07-17",
            court_type=Case.CourtType.SMALL_CLAIMS,
            court_level="SUBORDINATE_COURT",
            court_station="Milimani Small Claims Court",
            registry="Small Claims Court Registry",
            defendant="Apex Skyline Developers Limited",
        ))
        represented = case.parties.get(is_our_client=True)
        adverse = case.parties.get(is_adverse=True)
        self.assertEqual(represented.party_role, CaseParty.PartyRole.CLAIMANT)
        self.assertEqual(adverse.party_role, CaseParty.PartyRole.RESPONDENT)
        self.assertEqual(case.matter_status, Case.MatterStatus.MATTER_OPEN)
        self.assertEqual(case.court_stage, Case.CourtStage.FILED)

    def test_payment_reference_requires_payment_date(self):
        payload = self.base_payload(
            entry_route=Case.EntryRoute.EXISTING_FILED_COURT_CASE,
            official_court_case_number="HCCOMM E099 of 2026",
            filing_date="2026-07-17",
            efiling_reference="EFILE-2026-099",
            payment_reference="PAY-099",
            court_type=Case.CourtType.HIGH_COURT,
            court_station="Milimani",
            registry="Commercial Registry",
        )
        payload.pop("payment_date", None)
        response = self.api.post(reverse("case-create"), payload, format="json")
        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("payment_date", response.data["errors"])

    def test_detail_serializer_exposes_originating_intake_conflict_without_legacy_actions(self):
        check = self.cleared_conflict_check(title="Originating intake conflict")
        case = self.post(self.base_payload(
            conflict_check_id=str(check.id),
            entry_route=Case.EntryRoute.EXISTING_FILED_COURT_CASE,
            official_court_case_number="HCCOMM E777 of 2026",
            filing_date="2026-07-17",
            efiling_reference="EFILE-2026-777",
            payment_reference="PAY-777",
            payment_date="2026-07-17",
            court_type=Case.CourtType.HIGH_COURT,
            court_station="Milimani",
            registry="Commercial Registry",
        ))
        response = self.api.get(reverse("case-detail", kwargs={"case_id": case.id}))
        self.assertEqual(response.status_code, 200, response.data)
        data = response.data["data"]
        self.assertEqual(data["originating_conflict_check"]["reference_number"], check.reference_number)
        self.assertEqual(data["conflict_check"]["source"], "originating_proposed_matter")
        self.assertEqual(data["conflict_check"]["available_actions"], [])
        self.assertIsNone(data["conflict_record"])
        self.assertNotIn("restricted_note", data["originating_conflict_check"])
