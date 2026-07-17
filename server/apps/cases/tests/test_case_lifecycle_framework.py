from datetime import date, timedelta

from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.cases.models import (
    Case,
    CaseActivity,
    CaseConflictCheck,
    CaseEvent,
    CaseLifecycleTransition,
    CaseParty,
    CaseTask,
    CaseTimeline,
)
from apps.clients.models import Client
from apps.common.choices import UserRole
from apps.firm.models import LawFirm
from apps.staff.models import Lawyer, Secretary
from apps.users.models import User


class CaseLifecycleFrameworkTests(TestCase):
    def setUp(self):
        self.api = APIClient()
        self.admin = User.objects.create_user(
            email="lifecycle-admin@example.com",
            password="strong-pass123",
            first_name="Lifecycle",
            last_name="Admin",
            phone_number="+254722300001",
            national_id_number="LCADMIN001",
            role=UserRole.ADMIN,
        )
        self.firm = LawFirm.objects.create(
            name="Lifecycle Firm",
            registration_number="LIFE-FIRM-001",
            owner=self.admin,
        )
        self.lawyer = Lawyer.objects.create(
            user=self.admin,
            law_firm=self.firm,
            staff_number="LAW-LIFE-001",
            admission_number="ADV-LIFE-001",
            date_hired=date(2026, 1, 1),
        )
        self.secretary_user = User.objects.create_user(
            email="lifecycle-secretary@example.com",
            password="strong-pass123",
            first_name="Lifecycle",
            last_name="Secretary",
            phone_number="+254722300002",
            national_id_number="LCSEC001",
            role=UserRole.STAFF,
        )
        self.secretary = Secretary.objects.create(
            user=self.secretary_user,
            law_firm=self.firm,
            staff_number="SEC-LIFE-001",
            date_hired=date(2026, 1, 2),
        )
        self.client_user = User.objects.create_user(
            email="lakeview.lifecycle@example.test",
            password="strong-pass123",
            first_name="Lakeview",
            last_name="Portal",
            phone_number="+254722300003",
            national_id_number="LCPORTAL001",
            role=UserRole.PROSPECT,
        )
        self.client = Client.objects.create(
            firm=self.firm,
            user=self.client_user,
            created_by=self.admin,
            full_name="Lakeview Technologies Limited",
            email=self.client_user.email,
            phone_number="+254722300003",
            client_type=Client.ClientType.COMPANY,
            access_type=Client.AccessType.PROSPECT,
            lifecycle_status=Client.LifecycleStatus.PROSPECT,
        )
        self.api.force_authenticate(user=self.admin)

    def payload(self, case_number=None):
        case_number = case_number or f"ELC E{Case.objects.count() + 12:03d} of 2026"
        return {
            "client_id": str(self.client.id),
            "assigned_lawyer_membership_id": str(self.lawyer.id),
            "assigned_secretary_membership_id": str(self.secretary.id),
            "official_court_case_number": case_number,
            "filing_date": "2026-07-17",
            "efiling_reference": f"EFILE-{case_number.replace(' ', '-').replace('/', '-')}",
            "payment_reference": f"PAY-{case_number.replace(' ', '-').replace('/', '-')}",
            "title": "Lakeview Technologies Limited v Highland Distributors Limited",
            "description": "Debt recovery claim.",
            "case_type": Case.CaseType.DEBT_RECOVERY,
            "procedure_track": Case.ProcedureTrack.CIVIL_SUIT,
            "court_type": Case.CourtType.MAGISTRATE,
            "court_station": "Milimani",
            "registry": "Civil Registry",
            "claim_amount": "1850000.00",
            "currency": "KES",
            "jurisdiction_notes": "The claim amount is recorded for jurisdiction assessment before filing.",
            "defendant": "Highland Distributors Limited",
        }

    def create_case(self, case_number=None):
        case_number = case_number or f"ELC E{Case.objects.count() + 12:03d} of 2026"
        response = self.api.post(reverse("case-create"), self.payload(case_number), format="json")
        self.assertEqual(response.status_code, 201, response.data)
        return Case.objects.get(official_court_case_number=case_number)

    def transition(self, case, dimension, to_state, metadata=None, reason="Lifecycle test"):
        return self.api.post(
            reverse("case-lifecycle-transition", kwargs={"case_id": case.id}),
            {
                "dimension": dimension,
                "to_state": to_state,
                "effective_at": timezone.now().isoformat(),
                "reason": reason,
                "metadata": metadata or {},
            },
            format="json",
        )

    def test_new_civil_case_starts_at_instructions_received(self):
        case = self.create_case()
        self.assertEqual(case.matter_status, Case.MatterStatus.INSTRUCTIONS_RECEIVED)

    def test_new_registered_litigation_case_starts_filed(self):
        case = self.create_case()
        self.assertEqual(case.court_stage, Case.CourtStage.FILED)

    def test_internal_number_is_not_official_court_number(self):
        case = self.create_case()
        self.assertTrue(case.case_number.startswith("MAT-"))
        self.assertEqual(case.official_court_case_number, "ELC E012 of 2026")
        self.assertNotEqual(case.case_number, case.official_court_case_number)

    def test_first_case_changes_client_lifecycle_without_removing_portal_access(self):
        self.create_case()
        self.client.refresh_from_db()
        self.client_user.refresh_from_db()
        self.assertEqual(self.client.lifecycle_status, Client.LifecycleStatus.OFFICIAL_CLIENT)
        self.assertEqual(self.client.access_type, Client.AccessType.PROSPECT)
        self.assertEqual(self.client.user_id, self.client_user.id)
        self.assertTrue(self.client_user.is_active)

    def test_invalid_lifecycle_transition_is_rejected(self):
        case = self.create_case()
        response = self.transition(
            case,
            CaseLifecycleTransition.Dimension.COURT_STAGE,
            Case.CourtStage.JUDGMENT_DELIVERED,
        )
        self.assertEqual(response.status_code, 400, response.data)

    def test_case_creation_saves_claim_amount_currency_and_jurisdiction_notes(self):
        case = self.create_case()
        self.assertEqual(str(case.claim_amount), "1850000.00")
        self.assertEqual(case.currency, "KES")
        self.assertIn("claim amount is recorded", case.jurisdiction_notes)

    def test_ordinary_creation_cannot_set_jurisdiction_verification_actor(self):
        payload = self.payload("CASE-JURIS-REJECT")
        payload["jurisdiction_verified"] = True
        payload["jurisdiction_verified_by"] = str(self.admin.id)
        response = self.api.post(reverse("case-create"), payload, format="json")
        self.assertEqual(response.status_code, 400, response.data)
        self.assertEqual(Case.objects.filter(official_court_case_number="CASE-JURIS-REJECT").count(), 0)

    def test_legacy_status_is_not_authoritative_for_lifecycle(self):
        case = self.create_case()
        original_status = case.status
        response = self.transition(
            case,
            CaseLifecycleTransition.Dimension.MATTER_STATUS,
            Case.MatterStatus.CONFLICT_CHECK_PENDING,
        )
        self.assertEqual(response.status_code, 200, response.data)
        case.refresh_from_db()
        self.assertEqual(case.matter_status, Case.MatterStatus.CONFLICT_CHECK_PENDING)
        self.assertEqual(case.status, original_status)

    def test_ordinary_update_cannot_bypass_lifecycle_through_legacy_status(self):
        case = self.create_case()
        response = self.api.patch(
            reverse("case-detail", kwargs={"case_id": case.id}),
            {"status": Case.Status.CLOSED},
            format="json",
        )
        self.assertEqual(response.status_code, 400, response.data)
        case.refresh_from_db()
        self.assertEqual(case.matter_status, Case.MatterStatus.INSTRUCTIONS_RECEIVED)

    def test_valid_transition_creates_immutable_history(self):
        case = self.create_case()
        response = self.transition(
            case,
            CaseLifecycleTransition.Dimension.MATTER_STATUS,
            Case.MatterStatus.CONFLICT_CHECK_PENDING,
        )
        self.assertEqual(response.status_code, 200, response.data)
        history = case.lifecycle_transitions.filter(to_state=Case.MatterStatus.CONFLICT_CHECK_PENDING).get()
        self.assertEqual(history.from_state, Case.MatterStatus.INSTRUCTIONS_RECEIVED)
        self.assertEqual(history.reason, "Lifecycle test")
        self.assertTrue(CaseConflictCheck.objects.filter(case=case, status=CaseConflictCheck.Status.PENDING).exists())

    def test_repeated_transition_request_is_safely_rejected(self):
        case = self.create_case()
        self.transition(case, CaseLifecycleTransition.Dimension.MATTER_STATUS, Case.MatterStatus.CONFLICT_CHECK_PENDING)
        response = self.transition(case, CaseLifecycleTransition.Dimension.MATTER_STATUS, Case.MatterStatus.CONFLICT_CHECK_PENDING)
        self.assertEqual(response.status_code, 400, response.data)

    def test_transition_requires_permission(self):
        other = User.objects.create_user(
            email="other-client@example.test",
            password="strong-pass123",
            first_name="Other",
            last_name="Client",
            phone_number="+254722300004",
            national_id_number="LCOTHER001",
            role=UserRole.PROSPECT,
        )
        other_client = Client.objects.create(
            firm=self.firm,
            user=other,
            full_name="Other Client",
            email=other.email,
            phone_number=other.phone_number,
            client_type=Client.ClientType.INDIVIDUAL,
            lifecycle_status=Client.LifecycleStatus.OFFICIAL_CLIENT,
        )
        case = self.create_case()
        self.api.force_authenticate(user=other)
        response = self.transition(case, CaseLifecycleTransition.Dimension.MATTER_STATUS, Case.MatterStatus.CONFLICT_CHECK_PENDING)
        self.assertEqual(response.status_code, 404)
        self.assertNotEqual(other_client.id, self.client.id)

    def test_conflict_identified_branch_can_cancel_matter(self):
        case = self.create_case()
        self.transition(case, CaseLifecycleTransition.Dimension.MATTER_STATUS, Case.MatterStatus.CONFLICT_CHECK_PENDING)
        self.conflict_action(case, "POTENTIAL_CONFLICT", reason="Potential adverse relationship found.")
        self.transition(case, CaseLifecycleTransition.Dimension.MATTER_STATUS, Case.MatterStatus.CONFLICT_IDENTIFIED)
        response = self.transition(case, CaseLifecycleTransition.Dimension.MATTER_STATUS, Case.MatterStatus.CANCELLED)
        self.assertEqual(response.status_code, 200, response.data)

    def test_case_creation_requires_filed_case_data(self):
        payload = self.payload("ELC E099 of 2026")
        payload.pop("official_court_case_number")
        payload.pop("filing_date")
        payload.pop("efiling_reference")
        response = self.api.post(reverse("case-create"), payload, format="json")
        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("official_court_case_number", response.data["errors"])
        self.assertIn("filing_date", response.data["errors"])
        self.assertIn("efiling_reference", response.data["errors"])

    def test_filed_case_creation_records_filing_date_and_references(self):
        case = self.create_case("TEST CMCC E0001 OF 2026")
        case.refresh_from_db()
        self.assertEqual(case.court_stage, Case.CourtStage.FILED)
        self.assertEqual(case.official_court_case_number, "TEST CMCC E0001 OF 2026")
        self.assertEqual(str(case.filing_date), "2026-07-17")
        self.assertTrue(case.efiling_reference.startswith("EFILE-"))
        self.assertTrue(case.payment_reference.startswith("PAY-"))

    def test_service_completion_requires_service_evidence(self):
        case = self.case_at_filed()
        self.transition(case, CaseLifecycleTransition.Dimension.COURT_STAGE, Case.CourtStage.AWAITING_SERVICE)
        self.transition(case, CaseLifecycleTransition.Dimension.COURT_STAGE, Case.CourtStage.SERVICE_IN_PROGRESS)
        response = self.transition(case, CaseLifecycleTransition.Dimension.COURT_STAGE, Case.CourtStage.AWAITING_RESPONSE)
        self.assertEqual(response.status_code, 400, response.data)

    def test_service_completion_with_evidence_opens_response_period(self):
        case = self.case_at_filed()
        self.transition(case, CaseLifecycleTransition.Dimension.COURT_STAGE, Case.CourtStage.AWAITING_SERVICE)
        self.transition(case, CaseLifecycleTransition.Dimension.COURT_STAGE, Case.CourtStage.SERVICE_IN_PROGRESS)
        response = self.transition(
            case,
            CaseLifecycleTransition.Dimension.COURT_STAGE,
            Case.CourtStage.AWAITING_RESPONSE,
            metadata={"service_successful": True, "party_served": "Highland Distributors Limited"},
        )
        self.assertEqual(response.status_code, 200, response.data)

    def test_mention_event_does_not_equal_pretrial_completion(self):
        case = self.create_case()
        CaseEvent.objects.create(
            case=case,
            event_type=CaseEvent.EventType.MENTION,
            title="Mention",
            starts_at=timezone.now() + timedelta(days=7),
            created_by=self.admin,
        )
        case.refresh_from_db()
        self.assertEqual(case.court_stage, Case.CourtStage.FILED)

    def test_pretrial_completion_may_make_case_ready_for_hearing(self):
        case = self.case_at_stage(Case.CourtStage.PRE_TRIAL)
        response = self.transition(case, CaseLifecycleTransition.Dimension.COURT_STAGE, Case.CourtStage.AWAITING_HEARING)
        self.assertEqual(response.status_code, 200, response.data)

    def test_multiday_hearing_events_are_supported(self):
        case = self.create_case()
        starts = timezone.now() + timedelta(days=30)
        event = CaseEvent.objects.create(
            case=case,
            event_type=CaseEvent.EventType.HEARING,
            title="Hearing Day 1",
            starts_at=starts,
            ends_at=starts + timedelta(days=1),
            hearing_mode=CaseEvent.HearingMode.VIRTUAL,
            created_by=self.admin,
        )
        self.assertGreater(event.ends_at, event.starts_at)

    def test_adjourned_hearing_does_not_become_completed(self):
        case = self.create_case()
        event = CaseEvent.objects.create(
            case=case,
            event_type=CaseEvent.EventType.HEARING,
            status=CaseEvent.EventStatus.ADJOURNED,
            title="Adjourned Hearing",
            starts_at=timezone.now() + timedelta(days=30),
            created_by=self.admin,
        )
        self.assertNotEqual(event.status, CaseEvent.EventStatus.COMPLETED)

    def test_interlocutory_ruling_does_not_mark_final_judgment_delivered(self):
        case = self.create_case()
        CaseEvent.objects.create(
            case=case,
            event_type=CaseEvent.EventType.RULING,
            event_subtype="INTERLOCUTORY",
            status=CaseEvent.EventStatus.COMPLETED,
            title="Application ruling",
            starts_at=timezone.now(),
            created_by=self.admin,
        )
        case.refresh_from_db()
        self.assertNotEqual(case.court_stage, Case.CourtStage.JUDGMENT_DELIVERED)

    def test_final_judgment_records_outcome_separately(self):
        case = self.case_at_stage(Case.CourtStage.JUDGMENT_DELIVERED)
        response = self.transition(
            case,
            CaseLifecycleTransition.Dimension.OUTCOME_STATUS,
            Case.OutcomeStatus.WON,
            reason="Test judgment outcome recorded.",
        )
        self.assertEqual(response.status_code, 200, response.data)
        case.refresh_from_db()
        self.assertEqual(case.outcome_status, Case.OutcomeStatus.WON)

    def test_available_transitions_for_new_case_are_context_sensitive(self):
        case = self.create_case()
        transitions = self.api.get(reverse("case-detail", kwargs={"case_id": case.id})).data["data"]["available_transitions"]
        offered = {(item["dimension"], item["to_state"]) for item in transitions}
        self.assertIn((CaseLifecycleTransition.Dimension.MATTER_STATUS, Case.MatterStatus.CONFLICT_CHECK_PENDING), offered)
        self.assertNotIn((CaseLifecycleTransition.Dimension.OUTCOME_STATUS, Case.OutcomeStatus.WON), offered)
        self.assertNotIn((CaseLifecycleTransition.Dimension.ENFORCEMENT_STATUS, Case.EnforcementStatus.DECREE_PENDING), offered)
        self.assertNotIn((CaseLifecycleTransition.Dimension.APPEAL_STATUS, Case.AppealStatus.APPEAL_FILED), offered)
        self.assertNotIn((CaseLifecycleTransition.Dimension.COURT_STAGE, Case.CourtStage.READY_FOR_FILING), offered)

    def test_matter_cannot_clear_while_conflict_check_pending(self):
        case = self.create_case()
        self.transition(case, CaseLifecycleTransition.Dimension.MATTER_STATUS, Case.MatterStatus.CONFLICT_CHECK_PENDING)
        detail = self.api.get(reverse("case-detail", kwargs={"case_id": case.id}))
        offered = {(item["dimension"], item["to_state"]) for item in detail.data["data"]["available_transitions"]}
        self.assertNotIn((CaseLifecycleTransition.Dimension.MATTER_STATUS, Case.MatterStatus.CONFLICT_CLEARED), offered)
        response = self.transition(case, CaseLifecycleTransition.Dimension.MATTER_STATUS, Case.MatterStatus.CONFLICT_CLEARED)
        self.assertEqual(response.status_code, 400, response.data)

    def test_conflict_check_clear_permits_matter_clearance(self):
        case = self.create_case()
        self.transition(case, CaseLifecycleTransition.Dimension.MATTER_STATUS, Case.MatterStatus.CONFLICT_CHECK_PENDING)
        self.conflict_action(
            case,
            "REVIEW",
            reason="Conflict search reviewed.",
            data={"result_summary": "Firm-wide search clear."},
        )
        self.conflict_action(case, "MARK_CLEAR", reason="No conflict found.", data={"result_summary": "Firm-wide search clear."})
        check = CaseConflictCheck.objects.get(case=case)
        self.assertEqual(check.reviewed_by, self.admin)
        self.assertIsNotNone(check.reviewed_at)
        self.assertEqual(check.approved_by, self.admin)
        self.assertIsNotNone(check.approved_at)
        response = self.transition(case, CaseLifecycleTransition.Dimension.MATTER_STATUS, Case.MatterStatus.CONFLICT_CLEARED)
        self.assertEqual(response.status_code, 200, response.data)

    def test_pending_conflict_check_can_be_reviewed_without_clearing_matter(self):
        case = self.create_case()
        self.transition(case, CaseLifecycleTransition.Dimension.MATTER_STATUS, Case.MatterStatus.CONFLICT_CHECK_PENDING)
        response = self.conflict_action(
            case,
            "REVIEW",
            reason="The conflict search results were reviewed.",
            data={
                "result_summary": "The firm-wide search covered the client and opponent.",
                "internal_notes": "Search completeness reviewed before final clearance.",
            },
        )
        self.assertEqual(response.status_code, 200, response.data)
        check = CaseConflictCheck.objects.get(case=case)
        case.refresh_from_db()
        self.assertEqual(check.status, CaseConflictCheck.Status.PENDING)
        self.assertIsNotNone(check.reviewed_at)
        self.assertEqual(check.reviewed_by, self.admin)
        self.assertEqual(case.matter_status, Case.MatterStatus.CONFLICT_CHECK_PENDING)
        self.assertIsNone(check.completed_at)
        self.assertIsNone(check.completed_by)
        self.assertIsNone(check.approved_at)
        self.assertIsNone(check.approved_by)

    def test_review_requires_effective_at_reason_and_result_summary(self):
        case = self.create_case()
        self.transition(case, CaseLifecycleTransition.Dimension.MATTER_STATUS, Case.MatterStatus.CONFLICT_CHECK_PENDING)
        url = reverse("case-conflict-check-action", kwargs={"case_id": case.id})
        missing_effective = self.api.post(
            url,
            {"action": "REVIEW", "reason": "Reviewed.", "data": {"result_summary": "Reviewed search."}},
            format="json",
        )
        self.assertEqual(missing_effective.status_code, 400, missing_effective.data)
        self.assertEqual(
            str(missing_effective.data["errors"]["effective_at"][0]),
            "An effective date and time is required when reviewing a conflict check.",
        )
        missing_reason = self.api.post(
            url,
            {
                "action": "REVIEW",
                "effective_at": timezone.now().isoformat(),
                "data": {"result_summary": "Reviewed search."},
            },
            format="json",
        )
        self.assertEqual(missing_reason.status_code, 400, missing_reason.data)
        self.assertIn("reason", missing_reason.data["errors"])
        missing_summary = self.api.post(
            url,
            {
                "action": "REVIEW",
                "effective_at": timezone.now().isoformat(),
                "reason": "Reviewed.",
                "data": {},
            },
            format="json",
        )
        self.assertEqual(missing_summary.status_code, 400, missing_summary.data)
        self.assertEqual(str(missing_summary.data["errors"]["result_summary"][0]), "A result summary is required for review.")

    def test_mark_clear_fails_before_review(self):
        case = self.create_case()
        self.transition(case, CaseLifecycleTransition.Dimension.MATTER_STATUS, Case.MatterStatus.CONFLICT_CHECK_PENDING)
        response = self.conflict_action(case, "MARK_CLEAR", reason="Clear without review.", data={"result_summary": "No conflict found."})
        self.assertEqual(response.status_code, 400, response.data)
        self.assertEqual(
            response.data["errors"]["action"],
            "The conflict check must be reviewed before it can be marked clear.",
        )
        check = CaseConflictCheck.objects.get(case=case)
        self.assertEqual(check.status, CaseConflictCheck.Status.PENDING)

    def test_mark_clear_preserves_reviewer_and_populates_completion_fields(self):
        case = self.create_case()
        self.transition(case, CaseLifecycleTransition.Dimension.MATTER_STATUS, Case.MatterStatus.CONFLICT_CHECK_PENDING)
        self.conflict_action(case, "REVIEW", reason="Reviewed.", data={"result_summary": "Reviewed search."})
        check = CaseConflictCheck.objects.get(case=case)
        reviewed_at = check.reviewed_at
        reviewed_by = check.reviewed_by
        response = self.conflict_action(case, "MARK_CLEAR", reason="Final clearance.", data={"result_summary": "Reviewed search."})
        self.assertEqual(response.status_code, 200, response.data)
        check.refresh_from_db()
        self.assertEqual(check.status, CaseConflictCheck.Status.CLEAR)
        self.assertEqual(check.reviewed_at, reviewed_at)
        self.assertEqual(check.reviewed_by, reviewed_by)
        self.assertEqual(check.completed_by, self.admin)
        self.assertIsNotNone(check.completed_at)
        self.assertEqual(check.approved_by, self.admin)
        self.assertIsNotNone(check.approved_at)

    def test_potential_conflict_does_not_automatically_clear_matter(self):
        case = self.create_case()
        self.transition(case, CaseLifecycleTransition.Dimension.MATTER_STATUS, Case.MatterStatus.CONFLICT_CHECK_PENDING)
        self.conflict_action(case, "POTENTIAL_CONFLICT", reason="Potential conflict requires review.")
        case.refresh_from_db()
        self.assertEqual(case.matter_status, Case.MatterStatus.CONFLICT_CHECK_PENDING)

    def test_confirmed_conflict_permits_conflict_identified(self):
        case = self.create_case()
        self.transition(case, CaseLifecycleTransition.Dimension.MATTER_STATUS, Case.MatterStatus.CONFLICT_CHECK_PENDING)
        self.conflict_action(case, "CONFIRM_CONFLICT", reason="Confirmed conflict.")
        response = self.transition(case, CaseLifecycleTransition.Dimension.MATTER_STATUS, Case.MatterStatus.CONFLICT_IDENTIFIED)
        self.assertEqual(response.status_code, 200, response.data)

    def test_waiver_pending_blocks_clearance_and_waiver_permits_it(self):
        case = self.create_case()
        self.transition(case, CaseLifecycleTransition.Dimension.MATTER_STATUS, Case.MatterStatus.CONFLICT_CHECK_PENDING)
        self.conflict_action(case, "REQUEST_WAIVER", reason="Waiver requested.", data={"waiver_details": "Informed consent required."})
        blocked = self.transition(case, CaseLifecycleTransition.Dimension.MATTER_STATUS, Case.MatterStatus.CONFLICT_CLEARED)
        self.assertEqual(blocked.status_code, 400, blocked.data)
        self.conflict_action(case, "RECORD_WAIVER", reason="Waiver approved.", data={"waiver_details": "Consent recorded."})
        cleared = self.transition(case, CaseLifecycleTransition.Dimension.MATTER_STATUS, Case.MatterStatus.CONFLICT_CLEARED)
        self.assertEqual(cleared.status_code, 200, cleared.data)

    def test_secretary_cannot_give_final_conflict_approval(self):
        case = self.create_case()
        self.transition(case, CaseLifecycleTransition.Dimension.MATTER_STATUS, Case.MatterStatus.CONFLICT_CHECK_PENDING)
        self.api.force_authenticate(user=self.secretary_user)
        review_response = self.conflict_action(case, "REVIEW", reason="Secretary review attempt.", data={"result_summary": "Attempted review."})
        self.assertEqual(review_response.status_code, 403, review_response.data)
        response = self.conflict_action(case, "MARK_CLEAR", reason="Secretary approval attempt.")
        self.assertEqual(response.status_code, 403, response.data)
        self.api.force_authenticate(user=self.admin)

    def test_client_cannot_read_internal_conflict_notes_or_change_status(self):
        case = self.create_case()
        self.transition(case, CaseLifecycleTransition.Dimension.MATTER_STATUS, Case.MatterStatus.CONFLICT_CHECK_PENDING)
        self.conflict_action(case, "POTENTIAL_CONFLICT", reason="Internal review.", data={"internal_notes": "Privileged internal analysis."})
        self.api.force_authenticate(user=self.client_user)
        detail = self.api.get(reverse("case-detail", kwargs={"case_id": case.id}))
        self.assertEqual(detail.status_code, 200, detail.data)
        self.assertNotIn("internal_notes", detail.data["data"]["conflict_check"])
        self.assertNotIn("reviewed_by_name", detail.data["data"]["conflict_check"])
        response = self.conflict_action(case, "MARK_CLEAR", reason="Client attempt.")
        self.assertEqual(response.status_code, 403, response.data)
        self.api.force_authenticate(user=self.admin)

    def test_conflict_initiation_is_idempotent_for_record_and_task(self):
        case = self.create_case()
        first = self.transition(case, CaseLifecycleTransition.Dimension.MATTER_STATUS, Case.MatterStatus.CONFLICT_CHECK_PENDING)
        self.assertEqual(first.status_code, 200, first.data)
        self.conflict_action(case, "INITIATE", reason="Retry initiate.")
        self.assertEqual(CaseConflictCheck.objects.filter(case=case).count(), 1)
        self.assertEqual(CaseTask.objects.filter(case=case, title="Complete conflict-of-interest check").count(), 1)

    def test_conflict_reference_is_unique_within_firm(self):
        first = self.create_case("CASE-CONFLICT-REF-1")
        second = self.create_case("CASE-CONFLICT-REF-2")
        self.transition(first, CaseLifecycleTransition.Dimension.MATTER_STATUS, Case.MatterStatus.CONFLICT_CHECK_PENDING)
        self.transition(second, CaseLifecycleTransition.Dimension.MATTER_STATUS, Case.MatterStatus.CONFLICT_CHECK_PENDING)
        refs = list(CaseConflictCheck.objects.filter(case__in=[first, second]).values_list("reference_number", flat=True))
        self.assertEqual(len(refs), len(set(refs)))

    def test_conflict_actions_create_distinct_timeline_and_activity(self):
        case = self.create_case()
        self.transition(case, CaseLifecycleTransition.Dimension.MATTER_STATUS, Case.MatterStatus.CONFLICT_CHECK_PENDING)
        self.conflict_action(case, "REVIEW", reason="Review after search.", data={"result_summary": "No conflict found."})
        self.conflict_action(case, "MARK_CLEAR", reason="Clear after search.", data={"result_summary": "No conflict found."})
        self.assertTrue(CaseTimeline.objects.filter(case=case, action="Conflict Check Reviewed").exists())
        self.assertTrue(CaseTimeline.objects.filter(case=case, action="Conflict Cleared").exists())
        self.assertTrue(CaseActivity.objects.filter(case=case, action="CONFLICT_CHECK_REVIEWED").exists())
        self.assertTrue(CaseActivity.objects.filter(case=case, action="CONFLICT_CHECK_CLEARED").exists())

    def test_repeated_review_and_clear_are_idempotent_without_duplicate_logs(self):
        case = self.create_case()
        self.transition(case, CaseLifecycleTransition.Dimension.MATTER_STATUS, Case.MatterStatus.CONFLICT_CHECK_PENDING)
        review_payload = {"result_summary": "Search reviewed.", "internal_notes": "Internal review note."}
        effective_at = timezone.now().isoformat()
        first_review = self.conflict_action(case, "REVIEW", reason="Reviewed.", data=review_payload, effective_at=effective_at)
        second_review = self.conflict_action(case, "REVIEW", reason="Reviewed.", data=review_payload, effective_at=effective_at)
        self.assertEqual(first_review.status_code, 200, first_review.data)
        self.assertEqual(second_review.status_code, 200, second_review.data)
        self.assertEqual(CaseTimeline.objects.filter(case=case, action="Conflict Check Reviewed").count(), 1)
        self.assertEqual(CaseActivity.objects.filter(case=case, action="CONFLICT_CHECK_REVIEWED").count(), 1)
        clear_at = timezone.now().isoformat()
        first_clear = self.conflict_action(case, "MARK_CLEAR", reason="Clear.", data={"result_summary": "Search reviewed."}, effective_at=clear_at)
        second_clear = self.conflict_action(case, "MARK_CLEAR", reason="Clear duplicate.", data={"result_summary": "Search reviewed."}, effective_at=clear_at)
        self.assertEqual(first_clear.status_code, 200, first_clear.data)
        self.assertEqual(second_clear.status_code, 200, second_clear.data)
        self.assertEqual(CaseTimeline.objects.filter(case=case, action="Conflict Cleared").count(), 1)
        self.assertEqual(CaseActivity.objects.filter(case=case, action="CONFLICT_CHECK_CLEARED").count(), 1)

    def test_review_correction_cannot_silently_overwrite_original_audit(self):
        case = self.create_case()
        self.transition(case, CaseLifecycleTransition.Dimension.MATTER_STATUS, Case.MatterStatus.CONFLICT_CHECK_PENDING)
        self.conflict_action(case, "REVIEW", reason="Reviewed.", data={"result_summary": "Original summary."})
        response = self.conflict_action(case, "REVIEW", reason="Overwrite attempt.", data={"result_summary": "Changed summary."})
        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("already been reviewed", str(response.data["errors"]["action"]))

    def test_different_actor_cannot_be_treated_as_same_duplicate_review(self):
        case = self.create_case()
        other_user = User.objects.create_user(
            email="review-lawyer@example.test",
            password="strong-pass123",
            first_name="Review",
            last_name="Lawyer",
            phone_number="+254722300099",
            national_id_number="LCREVIEW001",
            role=UserRole.STAFF,
        )
        other_lawyer = Lawyer.objects.create(
            user=other_user,
            law_firm=self.firm,
            staff_number="LAW-REVIEW-001",
            admission_number="ADV-REVIEW-001",
            date_hired=date(2026, 1, 3),
        )
        case.assigned_lawyer = other_lawyer
        case.save(update_fields=["assigned_lawyer", "updated_at"])
        self.transition(case, CaseLifecycleTransition.Dimension.MATTER_STATUS, Case.MatterStatus.CONFLICT_CHECK_PENDING)
        effective_at = timezone.now().isoformat()
        self.api.force_authenticate(user=other_user)
        first = self.conflict_action(case, "REVIEW", reason="Reviewed.", data={"result_summary": "Reviewed search."}, effective_at=effective_at)
        self.assertEqual(first.status_code, 200, first.data)
        self.api.force_authenticate(user=self.admin)
        duplicate = self.conflict_action(case, "REVIEW", reason="Reviewed.", data={"result_summary": "Reviewed search."}, effective_at=effective_at)
        self.assertEqual(duplicate.status_code, 400, duplicate.data)
        self.assertIn("already been reviewed", duplicate.data["errors"]["action"])

    def test_admin_serializer_exposes_review_and_completion_audit_fields(self):
        case = self.create_case()
        self.transition(case, CaseLifecycleTransition.Dimension.MATTER_STATUS, Case.MatterStatus.CONFLICT_CHECK_PENDING)
        self.conflict_action(case, "REVIEW", reason="Reviewed.", data={"result_summary": "Reviewed search."})
        self.conflict_action(case, "MARK_CLEAR", reason="Clear.", data={"result_summary": "Reviewed search."})
        response = self.api.get(reverse("case-detail", kwargs={"case_id": case.id}))
        check = response.data["data"]["conflict_check"]
        self.assertIn("reviewed_by", check)
        self.assertIn("reviewed_by_name", check)
        self.assertIn("completed_by", check)
        self.assertIn("completed_by_name", check)
        self.assertIn("approved_by", check)
        self.assertIn("approved_by_name", check)
        self.assertIn("available_actions", check)

    def test_available_actions_follow_review_and_clear_state(self):
        case = self.create_case()
        self.transition(case, CaseLifecycleTransition.Dimension.MATTER_STATUS, Case.MatterStatus.CONFLICT_CHECK_PENDING)
        before = self.api.get(reverse("case-detail", kwargs={"case_id": case.id})).data["data"]["conflict_check"]["available_actions"]
        self.assertIn("REVIEW", before)
        self.assertNotIn("MARK_CLEAR", before)
        self.conflict_action(case, "REVIEW", reason="Reviewed.", data={"result_summary": "Reviewed search."})
        after_review = self.api.get(reverse("case-detail", kwargs={"case_id": case.id})).data["data"]["conflict_check"]["available_actions"]
        self.assertNotIn("REVIEW", after_review)
        self.assertIn("MARK_CLEAR", after_review)
        self.conflict_action(case, "MARK_CLEAR", reason="Clear.", data={"result_summary": "Reviewed search."})
        after_clear = self.api.get(reverse("case-detail", kwargs={"case_id": case.id})).data["data"]["conflict_check"]["available_actions"]
        self.assertEqual(after_clear, [])

    def test_reviewer_and_clearer_may_be_different_authorized_users(self):
        case = self.create_case()
        other_user = User.objects.create_user(
            email="clear-review-lawyer@example.test",
            password="strong-pass123",
            first_name="Clear",
            last_name="Reviewer",
            phone_number="+254722300098",
            national_id_number="LCCLEAR001",
            role=UserRole.STAFF,
        )
        other_lawyer = Lawyer.objects.create(
            user=other_user,
            law_firm=self.firm,
            staff_number="LAW-CLEAR-001",
            admission_number="ADV-CLEAR-001",
            date_hired=date(2026, 1, 4),
        )
        case.assigned_lawyer = other_lawyer
        case.save(update_fields=["assigned_lawyer", "updated_at"])
        self.transition(case, CaseLifecycleTransition.Dimension.MATTER_STATUS, Case.MatterStatus.CONFLICT_CHECK_PENDING)
        self.api.force_authenticate(user=other_user)
        self.conflict_action(case, "REVIEW", reason="Reviewed by assigned lawyer.", data={"result_summary": "Reviewed search."})
        self.api.force_authenticate(user=self.admin)
        response = self.conflict_action(case, "MARK_CLEAR", reason="Cleared by owner.", data={"result_summary": "Reviewed search."})
        self.assertEqual(response.status_code, 200, response.data)
        check = CaseConflictCheck.objects.get(case=case)
        self.assertEqual(check.reviewed_by, other_user)
        self.assertEqual(check.completed_by, self.admin)

    def test_unassigned_lawyer_cannot_review(self):
        case = self.create_case()
        lawyer_user = User.objects.create_user(
            email="unassigned-reviewer@example.test",
            password="strong-pass123",
            first_name="Unassigned",
            last_name="Lawyer",
            phone_number="+254722300097",
            national_id_number="LCUNASSIGNED001",
            role=UserRole.STAFF,
        )
        Lawyer.objects.create(
            user=lawyer_user,
            law_firm=self.firm,
            staff_number="LAW-UNASSIGNED-001",
            admission_number="ADV-UNASSIGNED-001",
            date_hired=date(2026, 1, 5),
        )
        self.transition(case, CaseLifecycleTransition.Dimension.MATTER_STATUS, Case.MatterStatus.CONFLICT_CHECK_PENDING)
        self.api.force_authenticate(user=lawyer_user)
        response = self.conflict_action(case, "REVIEW", reason="Unassigned attempt.", data={"result_summary": "Attempt."})
        self.assertEqual(response.status_code, 404)
        self.api.force_authenticate(user=self.admin)

    def test_existing_historical_clear_records_remain_valid(self):
        case = self.create_case()
        check = CaseConflictCheck.objects.create(
            case=case,
            firm=case.firm,
            reference_number="CONFLICT-HISTORICAL-001",
            status=CaseConflictCheck.Status.CLEAR,
            completed_at=timezone.now(),
            completed_by=self.admin,
        )
        response = self.transition(case, CaseLifecycleTransition.Dimension.MATTER_STATUS, Case.MatterStatus.CONFLICT_CHECK_PENDING)
        self.assertEqual(response.status_code, 200, response.data)
        response = self.transition(case, CaseLifecycleTransition.Dimension.MATTER_STATUS, Case.MatterStatus.CONFLICT_CLEARED)
        self.assertEqual(response.status_code, 200, response.data)
        check.refresh_from_db()
        self.assertEqual(check.status, CaseConflictCheck.Status.CLEAR)

    def test_case_style_claim_amount_removes_missing_claim_warning(self):
        case = self.create_case("CASE-00003")
        response = self.api.get(reverse("case-detail", kwargs={"case_id": case.id}))
        warnings = response.data["data"]["jurisdiction_warnings"]
        self.assertNotIn("Claim amount has not been captured.", warnings)
        self.assertIn("Jurisdiction has not been verified.", warnings)

    def test_judgment_does_not_automatically_complete_execution(self):
        case = self.case_at_stage(Case.CourtStage.JUDGMENT_DELIVERED)
        self.assertEqual(case.enforcement_status, Case.EnforcementStatus.NOT_APPLICABLE)

    def test_appeal_review_preserves_original_history(self):
        case = self.case_at_stage(Case.CourtStage.JUDGMENT_DELIVERED)
        before = case.lifecycle_transitions.count()
        response = self.transition(case, CaseLifecycleTransition.Dimension.COURT_STAGE, Case.CourtStage.APPEAL_OR_REVIEW)
        self.assertEqual(response.status_code, 200, response.data)
        self.assertGreater(case.lifecycle_transitions.count(), before)

    def test_closed_matter_rejects_ordinary_transitions(self):
        case = self.case_at_matter_status(Case.MatterStatus.CLOSED)
        response = self.transition(case, CaseLifecycleTransition.Dimension.COURT_STAGE, Case.CourtStage.READY_FOR_FILING)
        self.assertEqual(response.status_code, 400, response.data)

    def test_authorized_correction_preserves_original_history(self):
        case = self.create_case()
        response = self.transition(case, CaseLifecycleTransition.Dimension.MATTER_STATUS, Case.MatterStatus.CONFLICT_CHECK_PENDING)
        transition_id = response.data["transition"]["id"]
        correction = self.api.post(
            reverse("case-lifecycle-transition", kwargs={"case_id": case.id}),
            {
                "dimension": CaseLifecycleTransition.Dimension.MATTER_STATUS,
                "to_state": Case.MatterStatus.CONFLICT_CLEARED,
                "reason": "Corrected test transition.",
                "correction_of_id": transition_id,
            },
            format="json",
        )
        self.assertEqual(correction.status_code, 200, correction.data)
        self.assertEqual(case.lifecycle_transitions.count(), 4)

    @override_settings(DEFAULT_COURT_HEARING_MODE="VIRTUAL")
    def test_virtual_event_defaults_correctly(self):
        case = self.create_case()
        response = self.api.post(
            reverse("case-event-list-create", kwargs={"case_id": case.id}),
            {
                "event_type": CaseEvent.EventType.HEARING,
                "title": "Virtual hearing",
                "starts_at": (timezone.now() + timedelta(days=10)).isoformat(),
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["event"]["hearing_mode"], CaseEvent.HearingMode.VIRTUAL)

    def test_physical_and_hybrid_modes_remain_valid(self):
        case = self.create_case()
        physical = CaseEvent.objects.create(
            case=case,
            event_type=CaseEvent.EventType.HEARING,
            title="Physical hearing",
            starts_at=timezone.now(),
            hearing_mode=CaseEvent.HearingMode.PHYSICAL,
        )
        hybrid = CaseEvent.objects.create(
            case=case,
            event_type=CaseEvent.EventType.HEARING,
            title="Hybrid hearing",
            starts_at=timezone.now(),
            hearing_mode=CaseEvent.HearingMode.HYBRID,
        )
        self.assertEqual(physical.hearing_mode, CaseEvent.HearingMode.PHYSICAL)
        self.assertEqual(hybrid.hearing_mode, CaseEvent.HearingMode.HYBRID)

    def test_client_sees_permitted_lifecycle_information(self):
        case = self.create_case()
        self.api.force_authenticate(user=self.client_user)
        response = self.api.get(reverse("case-detail", kwargs={"case_id": case.id}))
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["data"]["court_stage"], Case.CourtStage.FILED)
        self.assertEqual(response.data["data"]["available_transitions"], [])

    def test_client_cannot_modify_lifecycle(self):
        case = self.create_case()
        self.api.force_authenticate(user=self.client_user)
        response = self.transition(case, CaseLifecycleTransition.Dimension.MATTER_STATUS, Case.MatterStatus.CONFLICT_CHECK_PENDING)
        self.assertEqual(response.status_code, 403)

    def test_client_cannot_access_another_clients_matter(self):
        other_user = User.objects.create_user(
            email="another-portal@example.test",
            password="strong-pass123",
            first_name="Another",
            last_name="Portal",
            phone_number="+254722300005",
            national_id_number="LCOTHER002",
            role=UserRole.PROSPECT,
        )
        other_client = Client.objects.create(
            firm=self.firm,
            user=other_user,
            full_name="Another Client",
            email=other_user.email,
            phone_number=other_user.phone_number,
            client_type=Client.ClientType.INDIVIDUAL,
            lifecycle_status=Client.LifecycleStatus.OFFICIAL_CLIENT,
        )
        case = self.create_case()
        self.assertNotEqual(other_client.id, case.client_id)
        self.api.force_authenticate(user=other_user)
        response = self.api.get(reverse("case-detail", kwargs={"case_id": case.id}))
        self.assertEqual(response.status_code, 404)

    def test_timeline_and_activity_records_have_distinct_purposes(self):
        case = self.create_case()
        self.assertTrue(CaseTimeline.objects.filter(case=case, action="Filed Case Registered").exists())
        self.assertTrue(CaseActivity.objects.filter(case=case, action="FILED_CASE_REGISTERED").exists())

    def test_existing_case_detail_api_remains_functional(self):
        case = self.create_case()
        response = self.api.get(reverse("case-detail", kwargs={"case_id": case.id}))
        self.assertEqual(response.status_code, 200, response.data)
        self.assertIn("data", response.data)
        self.assertTrue(response.data["data"]["internal_case_number"].startswith("MAT-"))
        self.assertEqual(response.data["data"]["official_court_case_number"], case.official_court_case_number)

    def test_existing_assignments_and_parties_remain_intact(self):
        case = self.create_case()
        self.assertEqual(case.assigned_lawyer, self.lawyer)
        self.assertEqual(case.assigned_secretary, self.secretary)
        self.assertTrue(CaseParty.objects.filter(case=case, is_our_client=True).exists())

    def test_no_duplicate_api_payload_remains(self):
        response = self.api.post(reverse("case-create"), self.payload("CASE-00003"), format="json")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertIn("data", response.data)
        self.assertNotIn("case", response.data)

    def case_at_filed(self):
        case = self.case_at_matter_status(Case.MatterStatus.MATTER_OPEN)
        case.refresh_from_db()
        return case

    def case_at_stage(self, stage):
        order = [
            Case.CourtStage.AWAITING_SERVICE,
            Case.CourtStage.SERVICE_IN_PROGRESS,
            Case.CourtStage.AWAITING_RESPONSE,
            Case.CourtStage.PLEADINGS_OPEN,
            Case.CourtStage.PLEADINGS_CLOSED,
            Case.CourtStage.CASE_MANAGEMENT,
            Case.CourtStage.PRE_TRIAL,
            Case.CourtStage.AWAITING_HEARING,
            Case.CourtStage.HEARING_IN_PROGRESS,
            Case.CourtStage.SUBMISSIONS,
            Case.CourtStage.JUDGMENT_RESERVED,
            Case.CourtStage.JUDGMENT_DELIVERED,
        ]
        case = self.case_at_matter_status(Case.MatterStatus.MATTER_OPEN)
        if stage == Case.CourtStage.FILED:
            return case
        for item in order:
            metadata = {}
            if item == Case.CourtStage.AWAITING_RESPONSE:
                metadata = {"service_successful": True}
            self.transition(case, CaseLifecycleTransition.Dimension.COURT_STAGE, item, metadata=metadata)
            case.refresh_from_db()
            if item == stage:
                return case
        return case

    def case_at_matter_status(self, status):
        case = self.create_case(f"CASE-MATTER-{Case.objects.count() + 1}")
        path = [
            Case.MatterStatus.CONFLICT_CHECK_PENDING,
            Case.MatterStatus.CONFLICT_CLEARED,
            Case.MatterStatus.ENGAGEMENT_PENDING,
            Case.MatterStatus.ENGAGEMENT_CONFIRMED,
            Case.MatterStatus.MATTER_OPEN,
            Case.MatterStatus.CLOSURE_PENDING,
            Case.MatterStatus.CLOSED,
        ]
        for item in path:
            if item == Case.MatterStatus.CONFLICT_CLEARED:
                self.conflict_action(
                    case,
                    "REVIEW",
                    reason="Conflict search reviewed for lifecycle helper.",
                    data={"result_summary": "No conflict found in test setup."},
                )
                self.conflict_action(
                    case,
                    "MARK_CLEAR",
                    reason="Conflict search completed for lifecycle helper.",
                    data={"result_summary": "No conflict found in test setup."},
                )
            self.transition(case, CaseLifecycleTransition.Dimension.MATTER_STATUS, item)
            case.refresh_from_db()
            if item == status:
                return case
        return case

    def conflict_action(self, case, action, reason="Conflict action test.", data=None, effective_at=None):
        return self.api.post(
            reverse("case-conflict-check-action", kwargs={"case_id": case.id}),
            {
                "action": action,
                "effective_at": effective_at or timezone.now().isoformat(),
                "reason": reason,
                "data": data or {},
            },
            format="json",
        )
