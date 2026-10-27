import json
from datetime import date
from unittest.mock import patch

from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from apps.cases.models import Case
from apps.clients.models import (
    Client, ClientComplianceReview, ClientMatterConflictCheck, ConflictCheckHistory,
    ConflictCheckParty, EngagementRecord, ProposedMatterJurisdiction,
)
from apps.clients.serializers.admin.client_matter_conflict_check_serializer import ClientMatterConflictCheckListSerializer
from apps.ai.services.llm_provider import AIProviderUnavailable, ProviderChoice
from apps.clients.services.compliance_review_service import ClientComplianceReviewService
from apps.clients.services.conflict import conflict_search
from apps.clients.services.engagement_service import EngagementService
from apps.clients.services.conflict.client_matter_conflict_service import ClientMatterConflictService
from apps.common.choices import ConflictCheckSourceCategory, ConflictCheckStatus, UserRole
from apps.firm.models import FirmSetting, LawFirm
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

    def test_detailed_pre_clearance_intake_requires_urgent_exception(self):
        payload = self.proposed_payload()
        payload["factual_summary"] = "Chronology: " + ("A privileged witness and transaction narrative. " * 40)
        response = self.client.post(
            reverse("admin-client-conflict-checks", kwargs={"client_id": self.client_record.id}), payload, format="json"
        )
        self.assertEqual(response.status_code, 400, response.data)
        payload["urgent_exception_reason"] = "Police-station attendance required before the conflict search could be completed."
        response = self.client.post(
            reverse("admin-client-conflict-checks", kwargs={"client_id": self.client_record.id}), payload, format="json"
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertTrue(response.data["conflict_check"]["pre_clearance_restricted"])

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

    def accept_check(self, check):
        response = self.client.post(
            reverse("admin-client-conflict-check-acceptance", kwargs={"client_id": self.client_record.id, "check_id": check.id}),
            {
                "decision": ClientMatterConflictCheck.AcceptanceDecision.ACCEPTED,
                "scope_confirmation": "Debt recovery instructions accepted.",
                "engagement_status": ClientMatterConflictCheck.EngagementStatus.SIGNED,
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
            "payment_date": "2026-07-17",
            "registry": "Milimani Law Courts Registry",
            "title": "Conflict Client Ltd v Proposed Adverse Ltd",
            "description": "Debt recovery.",
            "case_type": Case.CaseType.DEBT_RECOVERY,
            "procedure_track": Case.ProcedureTrack.CIVIL_SUIT,
            "court_type": Case.CourtType.MAGISTRATE,
            "court_station": "Milimani",
            "defendant": "Proposed Adverse Ltd",
        }

    def make_opening_ready(self, check, *, create_jurisdiction=True):
        ClientComplianceReviewService.record(
            user=self.admin, client_id=self.client_record.id,
            data={
                "identity_status": ClientComplianceReview.VerificationStatus.VERIFIED,
                "authority_status": ClientComplianceReview.VerificationStatus.VERIFIED,
                "beneficial_ownership_status": ClientComplianceReview.VerificationStatus.VERIFIED,
                "due_diligence_status": ClientComplianceReview.DueDiligenceStatus.CLEARED,
                "source_of_funds_status": ClientComplianceReview.VerificationStatus.NOT_APPLICABLE,
                "reason": "Test fixture records completed compliance review.",
            },
        )
        engagement = EngagementService.create(
            user=self.admin, proposed_matter=check,
            data={
                "responsible_advocate": self.lawyer,
                "scope_of_work": "Debt recovery instruction.",
                "fee_arrangement_type": EngagementRecord.FeeArrangement.FIXED,
                "fee_arrangement_description": "Agreed fixed fee.",
            },
        )
        EngagementService.approve_exception(
            user=self.admin, engagement_id=engagement.id, proposed_matter_id=check.id,
            status=EngagementRecord.Status.WAIVED, reason="Test fixture exception.",
            policy_basis="Test firm policy.",
        )
        if create_jurisdiction and not hasattr(check, "jurisdiction"):
            ProposedMatterJurisdiction.objects.create(
                proposed_matter=check, status=ProposedMatterJurisdiction.Status.FINAL_CONFIRMED,
                final_forum=Case.Forum.COURT, final_court_type=Case.CourtType.MAGISTRATE,
                final_court_level="CHIEF_MAGISTRATE", subject_matter_basis="Civil debt claim.",
                territorial_basis="Cause arose in Nairobi.", legal_basis="Magistrates' Courts Act.",
                advocate_findings="Jurisdiction confirmed for test fixture.", confirmed_by=self.lawyer,
                confirmed_at=timezone.now(),
            )

    def test_client_creation_state_is_prospect_and_has_no_case_or_check(self):
        self.assertIn(self.client_record.lifecycle_status, {Client.LifecycleStatus.PROSPECT, Client.LifecycleStatus.PROSPECTIVE})
        self.assertFalse(self.client_record.is_verified)
        self.assertFalse(self.client_record.cases.exists())
        self.assertFalse(self.client_record.matter_conflict_checks.exists())

    def test_conflict_check_exists_without_case_and_records_history(self):
        check = self.create_check()
        self.assertEqual(check.status, ConflictCheckStatus.NOT_STARTED)
        self.assertIsNone(check.created_case_id)
        self.assertEqual(check.parties.count(), 2)
        self.assertTrue(ConflictCheckHistory.objects.filter(conflict_check=check, action="PROPOSED_MATTER_CREATED").exists())

    def test_jurisdiction_review_is_outstanding_until_forum_is_known(self):
        check = self.create_check()
        readiness = ClientMatterConflictCheckListSerializer().get_opening_readiness(check)
        jurisdiction = next(item for item in readiness["checks"] if item["code"] == "JURISDICTION_REVIEW")
        self.assertFalse(jurisdiction["complete"])

        check.jurisdiction_facts = {"forum": "NO_FORMAL_FORUM"}
        readiness = ClientMatterConflictCheckListSerializer().get_opening_readiness(check)
        jurisdiction = next(item for item in readiness["checks"] if item["code"] == "JURISDICTION_REVIEW")
        self.assertTrue(jurisdiction["complete"])


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
        self.assertEqual(response.status_code, 400, response.data)
        check = self.accept_check(check)
        self.make_opening_ready(check)
        response = self.client.post(reverse("case-create"), self.case_payload(check), format="json")
        self.assertEqual(response.status_code, 201, response.data)
        check.refresh_from_db()
        self.client_record.refresh_from_db()
        self.portal_user.refresh_from_db()
        self.assertIsNotNone(check.created_case_id)
        self.assertIsNotNone(check.consumed_at)
        self.assertEqual(self.client_record.lifecycle_status, Client.LifecycleStatus.OFFICIAL)
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
        self.assertIn(self.client_record.lifecycle_status, {Client.LifecycleStatus.PROSPECT, Client.LifecycleStatus.PROSPECTIVE})

    def test_cleared_but_not_accepted_cannot_open_matter(self):
        check = self.clear_check(self.create_check())
        response = self.client.post(reverse("case-create"), self.case_payload(check), format="json")
        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("acceptance_decision", response.data)

    def test_direct_api_cannot_open_matter_before_engagement(self):
        check = self.clear_check(self.create_check())
        check.acceptance_decision = ClientMatterConflictCheck.AcceptanceDecision.ACCEPTED
        check.accepted_by = self.lawyer
        check.accepted_at = timezone.now()
        check.acceptance_decided_by = self.lawyer
        check.acceptance_decided_at = timezone.now()
        check.engagement_status = ClientMatterConflictCheck.EngagementStatus.DRAFTING
        check.save()

        response = self.client.post(
            reverse("case-create"), self.case_payload(check), format="json"
        )

        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("engagement_status", response.data)
        self.assertFalse(Case.objects.filter(originating_conflict_check=check).exists())

    def test_rejected_matter_list_includes_conflict_confirmed_without_rejecting_client(self):
        check = self.create_check()
        self.client.post(
            reverse("admin-client-conflict-check-start", kwargs={"client_id": self.client_record.id, "check_id": check.id}),
            {},
            format="json",
        )
        self.client.post(
            reverse("admin-client-conflict-check-decide", kwargs={"client_id": self.client_record.id, "check_id": check.id}),
            {
                "decision": ConflictCheckStatus.CONFLICT_CONFIRMED,
                "internal_reason": "Firm acts for the proposed adverse party.",
                "decision_confirmation": True,
            },
            format="json",
        )
        response = self.client.get(reverse("admin-rejected-matters"))
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["metadata"]["conflict_confirmed"], 1)
        self.client_record.refresh_from_db()
        self.assertFalse(self.client_record.cases.exists())

    def start(self, check):
        response = self.client.post(
            reverse("admin-client-conflict-check-start", kwargs={"client_id": self.client_record.id, "check_id": check.id}),
            {}, format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        return response.data["conflict_check"]

    def decide_cleared(self, check):
        return self.client.post(
            reverse("admin-client-conflict-check-decide", kwargs={"client_id": self.client_record.id, "check_id": check.id}),
            {"decision": ConflictCheckStatus.CLEARED, "decision_confirmation": True}, format="json",
        )

    def review(self, check, source, outcome="NO_MATCH", **finding):
        return self.client.post(
            reverse("admin-client-conflict-check-review-source", kwargs={"client_id": self.client_record.id, "check_id": check.id}),
            {"source": source, "outcome": outcome, **finding}, format="json",
        )

    def use_outside_records(self):
        FirmSetting.objects.update_or_create(firm=self.firm, defaults={"conflict_records_scope": "INCLUDES_OUTSIDE_RECORDS"})

    def test_automatic_search_blocks_direct_clearance_when_a_name_matches(self):
        Client.objects.create(
            firm=self.firm, full_name="Proposed Adverse Limited", email="existing-adverse@example.com",
            phone_number="+254711100010", client_type=Client.ClientType.COMPANY,
            lifecycle_status=Client.LifecycleStatus.OFFICIAL, is_active=True,
        )
        check = self.create_check()
        started = self.start(check)
        match = started["system_search"]["matches"][0]
        self.assertEqual(match["matched_name"], "Proposed Adverse Limited")
        self.assertTrue(match["conflict_risk"])

        response = self.decide_cleared(check)

        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("conflict_search", response.data["errors"])
        check.refresh_from_db()
        self.assertEqual(check.status, ConflictCheckStatus.IN_PROGRESS)
        self.assertFalse(check.decision_confirmation)

    def test_new_firm_search_runs_at_once_and_clears_with_one_confirmation(self):
        check = self.create_check()
        started = self.start(check)
        self.assertEqual(started["system_search"]["mode"], "AUTOMATIC")
        self.assertEqual(started["system_search"]["matches"], [])

        response = self.decide_cleared(check)

        self.assertEqual(response.status_code, 200, response.data)
        check.refresh_from_db()
        self.assertEqual(check.status, ConflictCheckStatus.CLEARED)
        self.assertIn("Proposed Adverse Ltd", check.names_checked)
        self.assertIn(ConflictCheckSourceCategory.FIRM_ADVOCATES_AND_STAFF, check.source_categories_checked)
        self.assertIn("No conflict found", check.result_summary)

    def test_acting_again_against_the_same_opponent_is_not_a_conflict(self):
        self.clear_check(self.create_check())
        check = self.create_check()
        match = self.start(check)["system_search"]["matches"][0]
        self.assertEqual(match["record_type"], "conflict_party")
        self.assertFalse(match["conflict_risk"])
        self.assertEqual(self.decide_cleared(check).status_code, 200)

    def test_guided_firm_confirms_every_source_before_clearing(self):
        self.use_outside_records()
        check = self.create_check()
        self.assertEqual(self.start(check)["system_search"]["mode"], "GUIDED")
        refused = self.decide_cleared(check)
        self.assertEqual(refused.status_code, 400, refused.data)
        self.assertIn("source_reviews", refused.data["errors"])

        for source in conflict_search.GUIDED_SOURCE_VALUES:
            self.assertEqual(self.review(check, source).status_code, 200)
        response = self.decide_cleared(check)

        self.assertEqual(response.status_code, 200, response.data)
        check.refresh_from_db()
        self.assertEqual(set(check.source_categories_checked), set(conflict_search.GUIDED_SOURCE_VALUES))
        self.assertTrue(ConflictCheckHistory.objects.filter(conflict_check=check, action="SOURCE_REVIEWED").count() == 7)

    def test_outside_record_match_blocks_clearance_and_is_found_by_later_searches(self):
        self.use_outside_records()
        check = self.create_check()
        self.start(check)
        response = self.review(
            check, ConflictCheckSourceCategory.FORMER_CLIENTS, "MATCH_FOUND",
            matched_name="Proposed Adverse Ltd", relationship_to_firm="Former client (2019 paper register)",
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertTrue(check.source_reviews.get().missed_by_system)
        for source in conflict_search.GUIDED_SOURCE_VALUES:
            if source != ConflictCheckSourceCategory.FORMER_CLIENTS:
                self.review(check, source)
        refused = self.decide_cleared(check)
        self.assertEqual(refused.status_code, 400, refused.data)
        self.assertIn("source_reviews", refused.data["errors"])

        later = self.create_check()
        match = next(item for item in self.start(later)["system_search"]["matches"] if item["record_type"] == "outside_record")
        self.assertEqual(match["relationship"], "Former client (2019 paper register) (found in records outside the system during "
                         f"{check.reference_number})")
        self.assertTrue(match["conflict_risk"])

    def test_guided_firm_becomes_automatic_after_enough_clean_checks(self):
        self.use_outside_records()
        with patch.object(conflict_search, "GUIDED_CHECKS_TO_AUTOMATIC", 2):
            for _ in range(2):
                self.assertEqual(conflict_search.search_mode(self.firm)["mode"], "GUIDED")
                check = self.create_check()
                self.start(check)
                for source in conflict_search.GUIDED_SOURCE_VALUES:
                    self.review(check, source)
                self.assertEqual(self.decide_cleared(check).status_code, 200)
            mode = conflict_search.search_mode(self.firm)
        self.assertEqual(mode["mode"], "AUTOMATIC")
        self.assertEqual(mode["reason"], "LEARNED_FROM_GUIDED_CHECKS")

    def test_names_are_compared_the_way_kenyan_names_vary(self):
        same = [
            ("Baraka Hardware Ltd", "Baraka Hardware (K) Limited"),
            ("Otieno James", "James Otieno"),
            ("J. Otieno", "James Otieno"),
            ("Baraka Hardwere Ltd", "Baraka Hardware Limited"),
            ("James Otieno", "James Otieno Ochieng"),
        ]
        for first, second in same:
            self.assertIsNotNone(conflict_search.compare_names(first, second), (first, second))
        for first, second in [("James Otieno", "James Kamau"), ("Otieno", "James Otieno"), ("Baraka Ltd", "Bahati Ltd")]:
            self.assertIsNone(conflict_search.compare_names(first, second), (first, second))

    def test_ai_adds_near_matches_and_unlisted_parties_only_when_the_firm_allows_it(self):
        Client.objects.create(firm=self.firm, full_name="Propozed Adversary Company", client_type=Client.ClientType.COMPANY)
        check = self.create_check()
        provider = ProviderChoice("anthropic", "test-model")
        reply = {"matches": [{"searched_name": "Proposed Adverse Ltd", "candidate_id": None, "reason": "Same company, misspelt"}],
                 "unlisted_parties": [{"name": "Mary Achieng", "mentioned_as": "guarantor"}]}

        def answer(instructions, prompt, **kwargs):
            candidate = next(item for item in json.loads(prompt)["candidates"] if item["name"] == "Propozed Adversary Company")
            return {**reply, "matches": [{**reply["matches"][0], "candidate_id": candidate["id"]}]}, provider

        with patch("apps.ai.services.llm_provider.configured_provider", return_value=provider), \
                patch("apps.ai.services.llm_provider.complete_json", side_effect=answer) as ai:
            search = conflict_search.run(check)
            self.assertFalse(ai.called)
            self.assertFalse(search["ai"]["enabled"])

            FirmSetting.objects.update_or_create(firm=self.firm, defaults={"conflict_ai_matching_enabled": True})
            search = conflict_search.run(check)

        self.assertTrue(search["ai"]["used"])
        ai_match = next(match for match in search["matches"] if match["found_by"] == "AI")
        self.assertEqual(ai_match["matched_name"], "Propozed Adversary Company")
        self.assertTrue(ai_match["conflict_risk"])
        self.assertEqual(search["unlisted_parties"], [{"name": "Mary Achieng", "mentioned_as": "guarantor"}])

    def test_search_still_runs_when_the_ai_service_fails(self):
        FirmSetting.objects.update_or_create(firm=self.firm, defaults={"conflict_ai_matching_enabled": True})
        check = self.create_check()
        with patch("apps.ai.services.llm_provider.configured_provider", return_value=ProviderChoice("anthropic", "test-model")), \
                patch("apps.ai.services.llm_provider.complete_json", side_effect=AIProviderUnavailable("down")):
            search = conflict_search.run(check)
        self.assertTrue(search["ai"]["enabled"])
        self.assertFalse(search["ai"]["used"])
        self.assertEqual(search["matches"], [])

    def test_information_potential_escalation_and_close_branches_are_controlled(self):
        check = self.create_check()
        self.client.post(
            reverse("admin-client-conflict-check-start", kwargs={"client_id": self.client_record.id, "check_id": check.id}),
            {},
            format="json",
        )
        requested = self.client.post(
            reverse("admin-client-conflict-check-request-information", kwargs={"client_id": self.client_record.id, "check_id": check.id}),
            {"information_missing": "Confirm the directors and beneficial owners."},
            format="json",
        )
        self.assertEqual(requested.status_code, 200, requested.data)
        resumed = self.client.post(
            reverse("admin-client-conflict-check-resume", kwargs={"client_id": self.client_record.id, "check_id": check.id}),
            {"summary": "Ownership information received."},
            format="json",
        )
        self.assertEqual(resumed.status_code, 200, resumed.data)
        potential = self.client.post(
            reverse("admin-client-conflict-check-potential", kwargs={"client_id": self.client_record.id, "check_id": check.id}),
            {"first_reviewer_findings": "A director appears in an existing client record."},
            format="json",
        )
        self.assertEqual(potential.status_code, 200, potential.data)
        escalated = self.client.post(
            reverse("admin-client-conflict-check-escalate", kwargs={"client_id": self.client_record.id, "check_id": check.id}),
            {
                "review_assigned_to_id": str(self.lawyer.id),
                "summary": "Escalated for an independent advocate review.",
            },
            format="json",
        )
        self.assertEqual(escalated.status_code, 200, escalated.data)
        closed = self.client.post(
            reverse("admin-client-conflict-check-close", kwargs={"client_id": self.client_record.id, "check_id": check.id}),
            {"closure_reason": "Client withdrew before the review concluded."},
            format="json",
        )
        self.assertEqual(closed.status_code, 200, closed.data)
        check.refresh_from_db()
        self.assertEqual(check.status, ConflictCheckStatus.CLOSED_WITHOUT_DECISION)
        self.assertEqual(
            list(check.history.order_by("created_at").values_list("action", flat=True))[-6:],
            [
                "CHECK_STARTED",
                "INFORMATION_REQUESTED",
                "CHECK_RESUMED",
                "POTENTIAL_CONFLICT_RECORDED",
                "ESCALATED_FOR_REVIEW",
                "CLOSED_WITHOUT_DECISION",
            ],
        )
        self.assertTrue(check.history.filter(action="CLOSED_WITHOUT_DECISION").exists())

    def make_lawyer(self, suffix, permissions):
        user = User.objects.create_user(
            email=f"conflict-{suffix}@example.com", password="pass", first_name="Advocate", last_name=suffix.title(),
            phone_number=f"+2547112{len(suffix):02d}{suffix[:3].encode().hex()[:4]}", national_id_number=f"CONF{suffix.upper()}",
            role=UserRole.STAFF,
        )
        lawyer = Lawyer.objects.create(
            user=user, law_firm=self.firm, staff_number=f"ADV-{suffix}", admission_number=f"ADV-{suffix}",
            date_hired=date(2026, 1, 1),
        )
        for code in permissions:
            LawyerPermissionGrant.objects.create(lawyer=lawyer, code=code, granted_by=self.admin)
        return lawyer

    def test_escalated_reviewer_is_notified_and_can_decide(self):
        from apps.notifications.models import Notification

        associate = self.make_lawyer("associate", [LawyerPermission.CREATE_PROPOSED_MATTER, LawyerPermission.PERFORM_CONFLICT_CHECK])
        partner = self.make_lawyer("partner", [LawyerPermission.APPROVE_CONFLICT_RESULT])
        outsider = self.make_lawyer("outsider", [LawyerPermission.PERFORM_CONFLICT_CHECK, LawyerPermission.APPROVE_CONFLICT_RESULT])
        payload = self.proposed_payload()
        payload["responsible_lawyer_id"] = str(associate.id)
        created = self.client.post(
            reverse("admin-client-conflict-checks", kwargs={"client_id": self.client_record.id}), payload, format="json",
        )
        self.assertEqual(created.status_code, 201, created.data)
        kwargs = {"client_id": self.client_record.id, "check_id": created.data["conflict_check"]["id"]}

        self.client.force_authenticate(associate.user)
        for name, body in (
            ("admin-client-conflict-check-start", {}),
            ("admin-client-conflict-check-potential", {"first_reviewer_findings": "Adverse party is an existing client."}),
            ("admin-client-conflict-check-escalate", {"review_assigned_to_id": str(partner.id), "summary": "Partner decision needed."}),
        ):
            response = self.client.post(reverse(name, kwargs=kwargs), body, format="json")
            self.assertEqual(response.status_code, 200, response.data)

        notification = Notification.objects.get(recipient=partner.user)
        self.assertIn("Conflict review requested", notification.title)
        self.assertEqual(
            notification.action_url,
            f"/lawyer/clients/{self.client_record.id}/conflict-checks/{kwargs['check_id']}",
        )

        self.client.force_authenticate(outsider.user)
        hidden = self.client.get(reverse("admin-client-conflict-check-detail", kwargs=kwargs))
        self.assertEqual(hidden.status_code, 400, hidden.data)

        self.client.force_authenticate(partner.user)
        visible = self.client.get(reverse("admin-client-conflict-check-detail", kwargs=kwargs))
        self.assertEqual(visible.status_code, 200, visible.data)
        decided = self.client.post(
            reverse("admin-client-conflict-check-decide", kwargs=kwargs),
            {"decision": ConflictCheckStatus.CONFLICT_CONFIRMED, "decision_confirmation": True,
             "internal_reason": "The firm acts for the proposed adverse party."},
            format="json",
        )
        self.assertEqual(decided.status_code, 200, decided.data)
        self.assertEqual(decided.data["conflict_check"]["status"], ConflictCheckStatus.CONFLICT_CONFIRMED)
        self.assertEqual(decided.data["conflict_check"]["decided_by"], partner.id)

    def test_illegal_state_transition_is_rejected_without_mutating_history(self):
        check = self.create_check()
        history_count = check.history.count()
        response = self.client.post(
            reverse("admin-client-conflict-check-resume", kwargs={"client_id": self.client_record.id, "check_id": check.id}),
            {"summary": "Invalid resume."},
            format="json",
        )
        self.assertEqual(response.status_code, 400, response.data)
        check.refresh_from_db()
        self.assertEqual(check.status, ConflictCheckStatus.NOT_STARTED)
        self.assertEqual(check.history.count(), history_count)

    def test_all_client_types_map_to_the_correct_screened_party_type(self):
        for client_type in Client.ClientType.values:
            with self.subTest(client_type=client_type):
                self.client_record.client_type = client_type
                expected = (
                    ConflictCheckParty.PartyType.PERSON
                    if client_type == Client.ClientType.INDIVIDUAL
                    else ConflictCheckParty.PartyType.ORGANISATION
                )
                self.assertEqual(
                    ClientMatterConflictService._client_party_type(self.client_record),
                    expected,
                )

    def jurisdiction_url(self, check, suffix=""):
        name = {
            "": "admin-client-jurisdiction",
            "decision": "admin-client-jurisdiction-decision",
            "confirm": "admin-client-jurisdiction-confirm",
            "reopen": "admin-client-jurisdiction-reopen",
        }[suffix]
        return reverse(name, kwargs={"client_id": self.client_record.id, "check_id": check.id})

    def test_jurisdiction_suggestion_requires_conflict_clearance(self):
        check = self.create_check()
        response = self.client.post(
            self.jurisdiction_url(check),
            {"dispute_category": "DEBT_RECOVERY", "claim_value": "500000.00"},
            format="json",
        )
        self.assertEqual(response.status_code, 400, response.data)
        self.assertFalse(hasattr(check, "jurisdiction"))

    def test_small_claim_suggestion_is_non_final_and_records_rule_version(self):
        check = self.clear_check(self.create_check())
        response = self.client.post(
            self.jurisdiction_url(check),
            {
                "dispute_category": "DEBT_RECOVERY",
                "practice_area": "DEBT_RECOVERY",
                "claim_value": "750000.00",
                "cause_of_action_location": "Nairobi",
                "relief_sought": "Payment of an unpaid contractual debt.",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        result = response.data["jurisdiction"]
        self.assertEqual(result["suggestion"]["court_type"], "SMALL_CLAIMS")
        self.assertFalse(result["is_final"])
        self.assertEqual(result["status"], "ADVOCATE_REVIEW_REQUIRED")
        self.assertTrue(result["rule_version"].startswith("KE-JURISDICTION-"))
        self.assertIn("responsible advocate", result["disclaimer"])

    def test_missing_territorial_information_is_disclosed(self):
        check = self.clear_check(self.create_check())
        response = self.client.post(
            self.jurisdiction_url(check),
            {"dispute_category": "EMPLOYMENT", "practice_area": "EMPLOYMENT_LABOUR"},
            format="json",
        )
        result = response.data["jurisdiction"]
        self.assertEqual(result["suggestion"]["court_type"], "EMPLOYMENT_LABOUR")
        self.assertIn("territorial_connection", result["missing_information"])
        self.assertTrue(any("Territorial jurisdiction" in item for item in result["warnings"]))

    def test_advocate_can_accept_and_confirm_without_overwriting_suggestion(self):
        check = self.clear_check(self.create_check())
        self.client.post(
            self.jurisdiction_url(check),
            {
                "dispute_category": "LAND",
                "practice_area": "LAND_ENVIRONMENT",
                "property_location": "Nakuru",
            },
            format="json",
        )
        decision = self.client.post(
            self.jurisdiction_url(check, "decision"),
            {
                "action": "ACCEPT",
                "subject_matter_basis": "The dispute concerns title and occupation of land.",
                "pecuniary_basis": "Pecuniary value reviewed; subject-matter jurisdiction is controlling.",
                "territorial_basis": "The property is situated in Nakuru.",
                "legal_basis": "Article 162(2)(b) and section 13 of the ELC Act.",
                "advocate_findings": "I independently confirm the Environment and Land Court.",
            },
            format="json",
        )
        self.assertEqual(decision.status_code, 200, decision.data)
        confirmed = self.client.post(self.jurisdiction_url(check, "confirm"), {}, format="json")
        self.assertEqual(confirmed.status_code, 200, confirmed.data)
        result = confirmed.data["jurisdiction"]
        self.assertTrue(result["is_final"])
        self.assertEqual(result["suggestion"]["court_type"], "ENVIRONMENT_LAND")
        self.assertEqual(result["final_court_type"], "ENVIRONMENT_LAND")
        self.assertEqual(len(result["history"]), 3)

    def test_modify_or_reject_requires_override_reason_and_preserves_history(self):
        check = self.clear_check(self.create_check())
        self.client.post(
            self.jurisdiction_url(check),
            {
                "dispute_category": "DEBT_RECOVERY",
                "practice_area": "DEBT_RECOVERY",
                "claim_value": "500000.00",
                "defendant_location": "Mombasa",
            },
            format="json",
        )
        denied = self.client.post(
            self.jurisdiction_url(check, "decision"),
            {"action": "MODIFY", "final_forum": "COURT", "final_court_type": "MAGISTRATE", "final_court_level": "CHIEF_MAGISTRATE"},
            format="json",
        )
        self.assertEqual(denied.status_code, 400, denied.data)
        accepted = self.client.post(
            self.jurisdiction_url(check, "decision"),
            {
                "action": "MODIFY",
                "override_reason": "The pleaded remedies fall outside the intended Small Claims Court procedure.",
                "final_forum": "COURT",
                "final_court_type": "MAGISTRATE",
                "final_court_level": "CHIEF_MAGISTRATE",
                "final_station": "Mombasa",
                "subject_matter_basis": "Civil contractual claim.",
                "pecuniary_basis": "Within the Chief Magistrate limit.",
                "territorial_basis": "Defendant carries on business in Mombasa.",
                "legal_basis": "Magistrates’ Courts Act, section 7.",
                "advocate_findings": "Chief Magistrate’s Court is appropriate.",
            },
            format="json",
        )
        self.assertEqual(accepted.status_code, 200, accepted.data)
        self.assertEqual(accepted.data["jurisdiction"]["final_court_type"], "MAGISTRATE")
        self.assertEqual(accepted.data["jurisdiction"]["suggestion"]["court_type"], "SMALL_CLAIMS")

    def test_confirmed_decision_populates_new_matter_without_overwriting_suggestion(self):
        check = self.accept_check(self.clear_check(self.create_check()))
        self.client.post(
            self.jurisdiction_url(check),
            {
                "dispute_category": "DEBT_RECOVERY",
                "practice_area": "DEBT_RECOVERY",
                "claim_value": "750000.00",
                "cause_of_action_location": "Nairobi",
            },
            format="json",
        )
        self.client.post(
            self.jurisdiction_url(check, "decision"),
            {
                "action": "ACCEPT",
                "subject_matter_basis": "Eligible contractual debt claim.",
                "pecuniary_basis": "Recorded value is within the configured limit.",
                "territorial_basis": "Cause of action arose in Nairobi.",
                "legal_basis": "Small Claims Court Act, sections 11–13.",
                "advocate_findings": "I independently confirm the suggested court.",
            },
            format="json",
        )
        self.client.post(self.jurisdiction_url(check, "confirm"), {}, format="json")
        self.make_opening_ready(check, create_jurisdiction=False)
        payload = self.case_payload(check)
        payload["entry_route"] = Case.EntryRoute.NEW_INSTRUCTION
        for field in [
            "official_court_case_number", "filing_date", "efiling_reference",
            "payment_reference", "payment_date", "registry",
        ]:
            payload.pop(field, None)
        response = self.client.post(reverse("case-create"), payload, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        case = Case.objects.get(pk=response.data["data"]["id"])
        self.assertTrue(case.jurisdiction_verified)
        self.assertEqual(case.court_type, "SMALL_CLAIMS")
        self.assertEqual(case.jurisdiction_history.count(), 1)
        check.jurisdiction.refresh_from_db()
        self.assertEqual(check.jurisdiction.suggestion["court_type"], "SMALL_CLAIMS")
