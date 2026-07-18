from datetime import date

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from apps.cases.models import (
    ArbitrationProceeding,
    Case,
    CaseParty,
    CourtProceeding,
    LandMatterDetails,
    MonetaryRelief,
    NonContentiousMatterDetails,
    TribunalProceeding,
)
from apps.clients.models import Client
from apps.common.choices import UserRole
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

    def base_payload(self, **overrides):
        payload = {
            "client_id": str(self.client.id),
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
            court_type=Case.CourtType.ENVIRONMENT_LAND,
            court_name="Environment and Land Court",
            court_station="Nairobi",
            registry="Milimani Law Courts Registry",
            parties=[{"party_type": "COMPANY", "role": "DEFENDANT", "organization_name": "Metro Data Systems Limited", "is_adverse": True}],
            land_details={"title_number": "NAIROBI/BLOCK/1", "property_description": "Commercial property"},
            monetary_relief={"relief_type": MonetaryRelief.ReliefType.QUANTIFIED, "currency": "KES", "principal_amount": "7500000.00"},
        ))
        self.assertTrue(case.case_number.startswith("MAT-"))
        self.assertEqual(case.official_court_case_number, "ELC E012 of 2026")
        self.assertEqual(case.court_stage, Case.CourtStage.FILED)
        self.assertEqual(case.matter_status, Case.MatterStatus.ACTIVE)
        self.assertEqual(case.court_proceeding.efiling_reference, "EFILE-2026-00045871")
        self.assertEqual(case.land_details.title_number, "NAIROBI/BLOCK/1")
        self.assertEqual(str(case.monetary_relief.principal_amount), "7500000.00")
        self.assertEqual(case.parties.filter(is_adverse=True).count(), 1)

    def test_new_instruction_creates_unfiled_matter_without_court_filing_facts(self):
        case = self.post(self.base_payload(entry_route=Case.EntryRoute.NEW_INSTRUCTION))
        self.assertEqual(case.matter_status, Case.MatterStatus.INSTRUCTIONS_RECEIVED)
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

    def test_controlled_create_fields_are_rejected(self):
        payload = self.base_payload(entry_route=Case.EntryRoute.NEW_INSTRUCTION, cts_reference="CTS-001")
        response = self.api.post(reverse("case-create"), payload, format="json")
        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("cts_reference", response.data["errors"])
