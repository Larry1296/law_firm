from datetime import timedelta

from django.urls import reverse
from django.utils import timezone

from apps.cases.models import CaseActivity, CaseEvent, CaseTask, JudiciaryCTSSnapshot
from apps.common.choices import JurisdictionStatus
from apps.cases.tests.test_virtual_courtroom import VirtualCourtroomTests
from apps.common.choices import CourtEventOutcome, CourtEventType, InternalCaseLifecycleStage


class ProceedingsWorkflowTests(VirtualCourtroomTests):
    def setUp(self):
        super().setUp()
        self.case.official_court_case_number = "HC-CIV-E001-2026"
        self.case.court_stage = self.case.CourtStage.AWAITING_HEARING
        self.case.lifecycle_stage = InternalCaseLifecycleStage.AWAITING_MENTION
        self.case.save()
        self.event = CaseEvent.objects.create(
            case=self.case,
            event_type=CourtEventType.MENTION,
            title="Mention",
            starts_at=timezone.now(),
            created_by=self.admin,
        )
        self.api.force_authenticate(user=self.admin)

    # The parent class is reused for its realistic firm/user fixture. Its
    # ordering assertion assumes no pre-existing event, which this workflow
    # fixture intentionally creates.
    def test_admin_creates_virtual_courtroom_event_visible_to_assigned_users(self):
        pass

    def test_allowed_next_events_are_backend_controlled_and_branch(self):
        response = self.api.get(
            reverse("allowed-next-events", kwargs={"case_id": self.case.id}),
            {"event_id": self.event.id},
        )
        self.assertEqual(response.status_code, 200)
        values = [item["value"] for item in response.data["allowed_next_events"]]
        self.assertEqual(values[0], CourtEventType.FURTHER_MENTION)
        self.assertIn(CourtEventType.FURTHER_MENTION, values)
        self.assertIn(CourtEventType.APPLICATION_HEARING, values)
        self.assertIn(CourtEventType.OTHER_COURT_DIRECTED, values)

    def test_record_outcome_creates_next_event_calendar_task_and_lifecycle(self):
        next_date = timezone.now() + timedelta(days=14)
        response = self.api.post(
            reverse(
                "record-proceeding-outcome",
                kwargs={"case_id": self.case.id, "event_id": self.event.id},
            ),
            {
                "proceeded": True,
                "outcome_code": CourtEventOutcome.DIRECTIONS_ISSUED,
                "outcome": "Mention completed; hearing date issued.",
                "orders_directions": "Witness statements within seven days.",
                "next_event_type": CourtEventType.HEARING,
                "next_date": next_date.isoformat(),
                "deadlines": [{
                    "title": "File witness statements",
                    "due_at": (timezone.now() + timedelta(days=7)).isoformat(),
                    "task_type": CaseTask.TaskType.FILING_DEADLINE,
                }],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.case.refresh_from_db()
        self.event.refresh_from_db()
        self.assertEqual(self.event.status, CaseEvent.EventStatus.COMPLETED)
        self.assertEqual(self.case.lifecycle_stage, InternalCaseLifecycleStage.AWAITING_HEARING)
        self.assertTrue(self.case.events.filter(event_type=CourtEventType.HEARING).exists())
        self.assertTrue(self.case.tasks.filter(title="File witness statements").exists())
        self.assertTrue(CaseActivity.objects.filter(case=self.case, action="PROCEEDING_OUTCOME_RECORDED").exists())

    def test_repeated_mentions_are_separate_occurrences(self):
        response = self.api.post(
            reverse(
                "record-proceeding-outcome",
                kwargs={"case_id": self.case.id, "event_id": self.event.id},
            ),
            {
                "proceeded": True,
                "outcome_code": CourtEventOutcome.DATE_ISSUED,
                "outcome": "Further mention directed.",
                "next_event_type": CourtEventType.FURTHER_MENTION,
                "next_date": (timezone.now() + timedelta(days=7)).isoformat(),
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(self.case.events.count(), 2)
        self.assertNotEqual(response.data["event"]["sequence_number"], response.data["next_event"]["sequence_number"])

    def test_unscheduled_repeated_mention_recommends_further_mention_and_audits(self):
        self.event.status = CaseEvent.EventStatus.COMPLETED
        self.event.actual_end = timezone.now()
        self.event.outcome_code = CourtEventOutcome.DATE_ISSUED
        self.event.outcome = "A further mention will be required."
        self.event.save()

        from apps.cases.services.proceedings_workflow_service import ProceedingsWorkflowService

        ProceedingsWorkflowService._resync_next_action(self.case, actor=self.admin)
        self.case.refresh_from_db()
        self.assertEqual(self.case.next_action, "Further mention")
        self.assertIsNone(self.case.next_court_date)
        self.assertTrue(
            CaseActivity.objects.filter(
                case=self.case,
                action="NEXT_ACTION_WORKFLOW_SYNC",
                metadata__source="workflow_sync",
            ).exists()
        )

    def test_nearest_pending_wins_regardless_of_creation_order_and_tie_prefers_main(self):
        now = timezone.now()
        hearing = CaseEvent.objects.create(
            case=self.case,
            event_type=CourtEventType.HEARING,
            title="Main hearing",
            starts_at=now + timedelta(days=30),
            created_by=self.admin,
        )
        CaseEvent.objects.create(
            case=self.case,
            event_type=CourtEventType.RULING,
            title="Application ruling",
            starts_at=now + timedelta(days=2),
            previous_event=CaseEvent.objects.create(
                case=self.case,
                event_type=CourtEventType.APPLICATION_HEARING,
                title="Application",
                starts_at=now - timedelta(days=1),
                status=CaseEvent.EventStatus.COMPLETED,
                created_by=self.admin,
            ),
            created_by=self.admin,
        )

        from apps.cases.services.proceedings_workflow_service import ProceedingsWorkflowService

        ProceedingsWorkflowService._resync_next_action(self.case, actor=self.admin)
        self.case.refresh_from_db()
        self.assertEqual(self.case.next_action, "Application ruling")

        application_ruling = self.case.events.get(title="Application ruling")
        application_ruling.status = CaseEvent.EventStatus.COMPLETED
        application_ruling.actual_end = timezone.now()
        application_ruling.save()
        ProceedingsWorkflowService._resync_next_action(self.case, actor=self.admin)
        self.case.refresh_from_db()
        self.assertEqual(self.case.next_action, hearing.title)
        self.assertEqual(self.case.next_court_date, hearing.starts_at)

        interlocutory = CaseEvent.objects.create(
            case=self.case,
            event_type=CourtEventType.APPLICATION_HEARING,
            title="Tied application",
            starts_at=hearing.starts_at,
            created_by=self.admin,
        )
        ProceedingsWorkflowService._resync_next_action(self.case, actor=self.admin)
        self.case.refresh_from_db()
        self.assertEqual(self.case.next_action, hearing.title)
        self.assertNotEqual(self.case.next_action, interlocutory.title)

    def test_adjourned_and_part_heard_recommendations_are_outcome_aware(self):
        from apps.cases.services.proceedings_workflow_service import ProceedingsWorkflowService

        self.event.event_type = CourtEventType.HEARING
        self.event.status = CaseEvent.EventStatus.ADJOURNED
        self.event.outcome_code = CourtEventOutcome.ADJOURNED
        self.event.outcome = "Witness unavailable."
        self.event.adjournment_reason = self.event.outcome
        self.event.actual_end = timezone.now()
        self.event.save()
        recommendation = ProceedingsWorkflowService.recommended_next_action(self.case)
        self.assertEqual(recommendation["event_type"], CourtEventType.HEARING)
        self.assertEqual(recommendation["label"], "Hearing")

        self.event.status = CaseEvent.EventStatus.PART_HEARD
        self.event.outcome_code = CourtEventOutcome.PART_HEARD
        self.event.outcome = "Claimant's first witness heard."
        self.event.save()
        recommendation = ProceedingsWorkflowService.recommended_next_action(self.case)
        self.assertEqual(recommendation["event_type"], CourtEventType.FURTHER_HEARING)
        self.assertEqual(recommendation["label"], "Further hearing (part heard)")

    def test_appeal_judgment_can_return_to_execution_or_trial(self):
        from apps.cases.services.proceedings_workflow_service import ProceedingsWorkflowService

        self.event.event_type = CourtEventType.JUDGMENT
        self.event.track = CaseEvent.Track.APPEAL
        self.event.status = CaseEvent.EventStatus.COMPLETED
        self.event.outcome_code = CourtEventOutcome.JUDGMENT_DELIVERED
        self.event.outcome = "Appeal dismissed."
        self.event.actual_end = timezone.now()
        self.event.save()
        recommendation = ProceedingsWorkflowService.recommended_next_action(self.case)
        self.assertEqual(recommendation["event_type"], CourtEventType.EXECUTION)
        self.assertEqual(recommendation["track"], CaseEvent.Track.EXECUTION)

        self.event.outcome = "Matter remitted for retrial."
        self.event.save()
        recommendation = ProceedingsWorkflowService.recommended_next_action(self.case)
        self.assertEqual(recommendation["event_type"], CourtEventType.HEARING)
        self.assertEqual(recommendation["track"], CaseEvent.Track.TRIAL)

    def test_exceptional_event_requires_court_direction(self):
        response = self.api.post(
            reverse(
                "record-proceeding-outcome",
                kwargs={"case_id": self.case.id, "event_id": self.event.id},
            ),
            {
                "proceeded": True,
                "outcome_code": CourtEventOutcome.OTHER,
                "outcome": "Court gave a special direction.",
                "next_event_type": CourtEventType.OTHER_COURT_DIRECTED,
                "next_date": (timezone.now() + timedelta(days=7)).isoformat(),
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_substantive_event_requires_registered_case(self):
        self.case.official_court_case_number = ""
        self.case.court_stage = self.case.CourtStage.NOT_FILED
        self.case.save()
        response = self.api.post(
            reverse(
                "record-proceeding-outcome",
                kwargs={"case_id": self.case.id, "event_id": self.event.id},
            ),
            {
                "proceeded": True,
                "outcome_code": CourtEventOutcome.PROCEEDED,
                "outcome": "Purported proceeding.",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_existing_filed_case_jurisdiction_is_carried_over(self):
        self.case.entry_route = self.case.EntryRoute.EXISTING_FILED_COURT_CASE
        self.case.save()
        response = self.api.post(
            reverse("case-jurisdiction-action", kwargs={"case_id": self.case.id}),
            {
                "action": "VERIFY",
                "claim_amount": "500000.00",
                "court_level": "High Court",
                "court_type": self.case.CourtType.HIGH_COURT,
                "court_station": "Milimani",
                "subject_matter_basis": "Civil and commercial jurisdiction.",
                "pecuniary_basis": "Value is within the recorded court jurisdiction.",
                "territorial_basis": "Cause of action arose in Nairobi.",
                "legal_basis": "Existing filed court record and pleadings.",
                "jurisdiction_notes": "Imported details reviewed against the sealed plaint.",
                "verification_source": "Sealed plaint",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        history = self.case.jurisdiction_history.get()
        self.assertEqual(history.status, JurisdictionStatus.CARRIED_OVER_FROM_EXISTING_CASE)

    def test_judiciary_checks_append_snapshots(self):
        payload = {
            "action": "VERIFY_CTS",
            "cts_reference": "CTS-001",
            "official_case_number": self.case.official_court_case_number,
            "verification_source": "Kenya Judiciary case record",
            "reason": "Routine status check",
            "judiciary_status": "Pending hearing",
        }
        url = reverse("case-jurisdiction-action", kwargs={"case_id": self.case.id})
        first = self.api.post(url, payload, format="json")
        payload["judiciary_status"] = "Hearing date allocated"
        second = self.api.post(url, payload, format="json")
        self.assertEqual(first.status_code, 200, first.data)
        self.assertEqual(second.status_code, 200, second.data)
        self.assertEqual(JudiciaryCTSSnapshot.objects.filter(case=self.case).count(), 2)
