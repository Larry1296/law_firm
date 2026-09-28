from datetime import date, timedelta
from decimal import Decimal

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.billing.models import TaxConfiguration
from apps.billing.services.finance_service import InvoiceService
from apps.cases.models import Case
from apps.clients.models import Client
from apps.common.choices import UserRole
from apps.documents.models import DocumentRequest
from apps.firm.models import LawFirm
from apps.staff.models import Lawyer, Secretary
from apps.users.models import User


def user(email, role, phone):
    return User.objects.create_user(
        email=email, password="Strong-pass-123", first_name="Test", last_name="User",
        phone_number=phone, national_id_number=phone[-9:], role=role,
    )


class FilingRegisterTests(TestCase):
    def setUp(self):
        self.owner = user("owner@register.test", UserRole.ADMIN, "+254733000001")
        self.firm = LawFirm.objects.create(name="Register Firm", registration_number="REG-1", owner=self.owner)
        self.lawyer_user = user("advocate@register.test", UserRole.STAFF, "+254733000002")
        self.lawyer = Lawyer.objects.create(
            user=self.lawyer_user, law_firm=self.firm, staff_number="R-1", admission_number="P.105/1/20", date_hired=date(2020, 1, 1),
        )
        self.other_user = user("other@register.test", UserRole.STAFF, "+254733000003")
        Lawyer.objects.create(
            user=self.other_user, law_firm=self.firm, staff_number="R-2", admission_number="P.105/2/20", date_hired=date(2020, 1, 1),
        )
        self.secretary_user = user("secretary@register.test", UserRole.STAFF, "+254733000004")
        self.secretary = Secretary.objects.create(user=self.secretary_user, law_firm=self.firm, staff_number="R-3", date_hired=date(2021, 1, 1))
        self.client_user = user("client@register.test", UserRole.OFFICIAL_CLIENT, "+254733000005")
        self.client_record = Client.objects.create(
            firm=self.firm, user=self.client_user, created_by=self.owner, full_name="Register Client Ltd",
            client_type=Client.ClientType.COMPANY, lifecycle_status=Client.LifecycleStatus.OFFICIAL_CLIENT,
        )
        self.matter = Case.objects.create(
            firm=self.firm, client=self.client_record, created_by=self.owner, case_number="MAT-REG-001",
            title="Register Client Ltd v Debtor Ltd", case_type=Case.CaseType.DEBT_RECOVERY,
            matter_status=Case.MatterStatus.MATTER_OPEN, court_stage=Case.CourtStage.NOT_FILED,
            entry_route=Case.EntryRoute.EXISTING_FILED_COURT_CASE,
            assigned_lawyer=self.lawyer, assigned_secretary=self.secretary,
        )
        self.api = APIClient()

    def record(self, as_user, filing_type, status=201, **fields):
        self.api.force_authenticate(as_user)
        response = self.api.post(f"/api/cases/{self.matter.id}/filings/", {"filing_type": filing_type, **fields}, format="json")
        self.assertEqual(response.status_code, status, response.data)
        return response.data

    def transition(self, to_state, status=200, dimension="COURT_STAGE", metadata=None):
        self.api.force_authenticate(self.lawyer_user)
        response = self.api.post(f"/api/cases/{self.matter.id}/transitions/", {
            "dimension": dimension, "to_state": to_state, "reason": "Recorded by the advocate.", "metadata": metadata or {},
        }, format="json")
        self.assertEqual(response.status_code, status, response.data)
        self.matter.refresh_from_db()

    def move_to(self, stage, **fields):
        Case.objects.filter(id=self.matter.id).update(court_stage=stage, official_court_case_number="MCCOMMSU/E9/2026", **fields)
        self.matter.refresh_from_db()

    def test_demand_letter_holds_filing_until_the_chosen_period_lapses(self):
        data = self.record(self.lawyer_user, "DEMAND_LETTER", response_period_days=14)
        due = timezone.localdate() + timedelta(days=14)
        self.assertEqual(data["next_action"], f"Await demand response (due {due:%d %b %Y})")
        self.assertEqual(self.matter.deadlines.get().due_at.date(), due)

    def test_demand_period_must_be_7_14_or_21_days(self):
        self.record(self.lawyer_user, "DEMAND_LETTER", status=400, response_period_days=10)
        self.assertFalse(self.matter.filings.exists())

    def test_only_people_assigned_to_the_matter_may_update_the_register(self):
        # Matters not assigned to an advocate are invisible to them, so the register is too.
        self.record(self.other_user, "DEMAND_LETTER", status=404, response_period_days=7)
        self.record(self.secretary_user, "DEMAND_LETTER", response_period_days=7)

    def test_plaint_is_recorded_through_the_filed_transition_not_the_register(self):
        self.record(self.lawyer_user, "PLAINT", status=400)

    def test_default_judgment_requires_a_request_for_judgment(self):
        self.move_to(Case.CourtStage.AWAITING_RESPONSE)
        served = timezone.now() - timedelta(days=20)
        self.record(self.secretary_user, "AFFIDAVIT_OF_SERVICE", served_at=served.isoformat())
        self.matter.refresh_from_db()
        self.assertEqual(self.matter.next_action, "Review default judgment (Order 10) for advocate decision")

        self.transition("JUDGMENT_DELIVERED", status=400)
        self.record(self.lawyer_user, "REQUEST_FOR_JUDGMENT", title="Request for judgment in default of appearance")
        self.transition("JUDGMENT_DELIVERED")
        self.assertEqual(self.matter.court_stage, Case.CourtStage.JUDGMENT_DELIVERED)

    def test_settled_suit_concludes_before_trial_only_after_the_outcome_is_recorded(self):
        self.move_to(Case.CourtStage.PRE_TRIAL)
        self.transition("CONCLUDED", status=400)
        self.record(self.lawyer_user, "CONSENT", title="Consent recording settlement")
        self.transition("SETTLED", dimension="OUTCOME_STATUS")
        self.transition("CONCLUDED")
        self.assertEqual(self.matter.court_stage, Case.CourtStage.CONCLUDED)

    def test_judgment_in_a_magistrates_court_opens_the_30_day_appeal_window(self):
        self.move_to(Case.CourtStage.JUDGMENT_DELIVERED, court_type=Case.CourtType.MAGISTRATE)
        delivered = timezone.now() - timedelta(days=2)
        self.record(self.lawyer_user, "JUDGMENT", title="Judgment", filed_at=delivered.isoformat())
        deadline = self.matter.deadlines.get(source__startswith="APPEAL_WINDOW:")
        self.assertEqual(deadline.due_at.date(), timezone.localdate(delivered) + timedelta(days=30))
        self.assertIn("79G", deadline.description)

        self.record(self.lawyer_user, "MEMORANDUM_OF_APPEAL", title="Memorandum of appeal")
        deadline.refresh_from_db()
        self.assertEqual(deadline.status, "COMPLETED")

    def test_high_court_judgment_needs_notice_of_appeal_in_14_days_then_record_in_60(self):
        self.move_to(Case.CourtStage.JUDGMENT_DELIVERED, court_type=Case.CourtType.HIGH_COURT)
        self.record(self.lawyer_user, "JUDGMENT", title="Judgment")
        window = self.matter.deadlines.get(source__startswith="APPEAL_WINDOW:")
        self.assertEqual(window.due_at.date(), timezone.localdate() + timedelta(days=14))

        self.record(self.lawyer_user, "NOTICE_OF_APPEAL", title="Notice of appeal")
        window.refresh_from_db()
        self.assertEqual(window.status, "COMPLETED")
        record = self.matter.deadlines.get(source=f"RECORD_OF_APPEAL:{self.matter.id}")
        self.assertEqual(record.due_at.date(), timezone.localdate() + timedelta(days=60))

        self.record(self.lawyer_user, "RECORD_OF_APPEAL", title="Record of appeal")
        record.refresh_from_db()
        self.assertEqual(record.status, "COMPLETED")

    def test_failed_service_can_return_for_fresh_or_substituted_service(self):
        self.move_to(Case.CourtStage.SERVICE_IN_PROGRESS)
        self.transition("AWAITING_SERVICE")

    def test_client_cannot_upload_against_another_clients_request(self):
        stranger = Client.objects.create(
            firm=self.firm, created_by=self.owner, full_name="Another Client", client_type=Client.ClientType.INDIVIDUAL,
        )
        other_matter = Case.objects.create(
            firm=self.firm, client=stranger, created_by=self.owner, case_number="MAT-REG-002", title="Other",
            case_type=Case.CaseType.CIVIL, assigned_lawyer=self.lawyer,
        )
        request = DocumentRequest.objects.create(
            firm=self.firm, client=stranger, case=other_matter, requested_by=self.lawyer_user,
            title="ID copy", document_type="IDENTIFICATION", status=DocumentRequest.Status.OPEN,
        )
        self.api.force_authenticate(self.client_user)
        response = self.api.post("/api/client/documents/", {
            "request_id": str(request.id), "file": SimpleUploadedFile("id.pdf", b"%PDF-1.4", content_type="application/pdf"),
        }, format="multipart")
        self.assertEqual(response.status_code, 400)
        request.refresh_from_db()
        self.assertEqual(request.status, DocumentRequest.Status.OPEN)

    def test_invoice_adds_vat_on_fees_only_and_rounds_to_cents(self):
        tax = TaxConfiguration.objects.create(firm=self.firm, effective_from=date(2026, 1, 1), vat_registered=True, vat_rate=Decimal("16.000"))
        lines = InvoiceService.with_vat([
            {"line_type": "PROFESSIONAL_FEE", "description": "Attendance", "quantity": Decimal("1.50"), "unit_price": Decimal("3333.33")},
            {"line_type": "DISBURSEMENT", "description": "Court fees", "quantity": Decimal("1"), "unit_price": Decimal("1050.00")},
        ], tax)
        professional, vat, disbursements, _, total = InvoiceService._totals(lines)
        self.assertEqual(professional, Decimal("5000.00"))  # 4999.995 rounded half up
        self.assertEqual(vat, Decimal("800.00"))
        self.assertEqual(disbursements, Decimal("1050.00"))
        self.assertEqual(total, Decimal("6850.00"))
