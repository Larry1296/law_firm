from datetime import date, timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.audit_logs.models import AuditEvent
from apps.cases.models import Case, DeadlineStatusHistory, MatterWorkstreamStage
from apps.cases.services.matter_operations_service import MatterOperationsService
from apps.clients.models import Client
from apps.common.choices import UserRole
from apps.firm.models import LawFirm
from apps.staff.models import Lawyer
from apps.users.models import User


class MatterOperationsTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            email="operations-owner@example.com", password="pass", first_name="Operations", last_name="Owner",
            phone_number="+254700880001", national_id_number="OPERATIONS1", role=UserRole.ADMIN,
        )
        self.firm = LawFirm.objects.create(name="Operations Firm", registration_number="OPS-FIRM", owner=self.owner)
        self.lawyer = Lawyer.objects.create(
            user=self.owner, law_firm=self.firm, staff_number="OPS-ADV-1",
            admission_number="OPS-ADV-1", date_hired=date(2026, 1, 1),
        )
        self.client_record = Client.objects.create(
            firm=self.firm, created_by=self.owner, full_name="Operations Client",
            client_type=Client.ClientType.INDIVIDUAL, national_id="OPS-CLIENT",
        )
        self.matter = Case.objects.create(
            firm=self.firm, client=self.client_record, created_by=self.owner, case_number="MAT-OPS-001",
            title="Commercial advisory", case_type=Case.CaseType.COMMERCIAL,
            matter_status=Case.MatterStatus.ACTIVE, assigned_lawyer=self.lawyer,
        )
        self.api = APIClient()
        self.api.force_authenticate(self.owner)

    def test_workstream_requires_completion_before_exact_next_stage_and_get_exposes_history(self):
        record = MatterOperationsService.set_workstream(
            user=self.owner, matter_id=self.matter.id, workstream_type="ADVISORY",
            stage="INSTRUCTIONS", stage_data={"instructions": "Recorded"},
        )
        response = self.api.get(f"/api/cases/{self.matter.id}/workstream/")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["workstream"]["current_stage"], "INSTRUCTIONS")

        MatterOperationsService.complete_workstream_stage(
            user=self.owner, matter_id=self.matter.id,
            checklist={"instructions_confirmed": True, "scope_checked": True},
            reason="Instructions and scope confirmed.", supporting_document_ids=[],
        )
        advanced = MatterOperationsService.set_workstream(
            user=self.owner, matter_id=self.matter.id, workstream_type="ADVISORY",
            stage="RESEARCH", stage_data={},
        )
        self.assertEqual(advanced.current_stage, "RESEARCH")
        self.assertEqual(MatterWorkstreamStage.objects.filter(workstream=record).count(), 2)
        self.assertTrue(AuditEvent.objects.filter(action="MATTER_WORKSTREAM_STAGE_COMPLETED").exists())

    def test_critical_deadline_change_and_resolution_preserve_both_histories(self):
        original = timezone.now() + timedelta(days=7)
        deadline = MatterOperationsService.create_deadline(
            user=self.owner, matter_id=self.matter.id,
            data={"deadline_type": "LIMITATION", "due_at": original, "timezone": "Africa/Nairobi",
                  "responsible_staff": self.owner, "priority": "CRITICAL", "source": "Limitation statute",
                  "description": "File before statutory deadline", "reminder_schedule": [30, 14, 7, 1]},
        )
        changed = original + timedelta(days=1)
        MatterOperationsService.change_deadline(
            user=self.owner, deadline_id=deadline.id, new_due_at=changed,
            reason="Court order extended time by one day.",
        )
        MatterOperationsService.resolve_deadline(
            user=self.owner, deadline_id=deadline.id, action="COMPLETE",
            reason="Filing accepted and registry receipt saved.",
        )
        deadline.refresh_from_db()
        self.assertEqual(deadline.status, deadline.Status.COMPLETED)
        self.assertEqual(deadline.change_history.get().previous_due_at, original)
        self.assertEqual(DeadlineStatusHistory.objects.get(deadline=deadline).new_status, deadline.Status.COMPLETED)
        response = self.api.get(f"/api/cases/{self.matter.id}/deadlines/")
        self.assertEqual(len(response.data["deadlines"][0]["change_history"]), 2)
