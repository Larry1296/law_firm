from datetime import date, timedelta
from decimal import Decimal

from django.core.exceptions import ValidationError as DjangoValidationError
from django.test import TestCase
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIClient

from apps.billing.models import MatterClientLedger
from apps.cases.models import Case, CaseTask, DestructionLog, GeneratedClosingDocument, MatterClosure, RetentionReview
from apps.cases.services.matter_governance_service import ArchiveService, MatterClosureService
from apps.cases.services.case_service import CaseService
from apps.clients.models import Client
from apps.common.choices import UserRole
from apps.firm.models import LawFirm
from apps.users.models import User
from apps.cases.serializers.matter_governance_serializer import RetentionReviewSerializer


class MatterGovernanceTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            email="governance-owner@example.com", password="pass", first_name="Gov", last_name="Owner",
            phone_number="+254700830001", national_id_number="GOVOWNER1", role=UserRole.ADMIN,
        )
        self.firm = LawFirm.objects.create(name="Governance Firm", registration_number="GOV-FIRM", owner=self.owner)
        self.client = Client.objects.create(
            firm=self.firm, created_by=self.owner, full_name="Governance Client",
            client_type=Client.ClientType.INDIVIDUAL, national_id="GOVCLIENT1",
        )
        self.matter = Case.objects.create(
            firm=self.firm, client=self.client, created_by=self.owner, case_number="MAT-GOV-001",
            title="Completed advice", case_type=Case.CaseType.COMMERCIAL,
            matter_status=Case.MatterStatus.ACTIVE,
        )
        self.api = APIClient()
        self.api.force_authenticate(self.owner)

    def closure_data(self, **overrides):
        data = {
            "proposed_closure_date": date.today(), "closure_reason": "Instructions completed.",
            "outcome": "Written advice delivered.", "closing_summary": "Advice and final report delivered.",
            "appeal_position": "Not applicable", "enforcement_position": "Not applicable",
            "legal_work_complete": True, "result_document_recorded": True,
            "client_instructions_complete": True, "undertakings_resolved": True,
            "final_invoice_issued": True, "final_client_account_prepared": True,
            "closing_letter_prepared": True, "client_informed": True,
            "original_document_status": "RETURNED", "financial_clearance_status": "PENDING_FINANCE",
        }
        data.update(overrides)
        return data

    def prepared_closure(self):
        closure = MatterClosureService.request(user=self.owner, matter_id=self.matter.id, data=self.closure_data())
        MatterClosureService.approve_advocate(user=self.owner, closure_id=closure.id)
        MatterClosureService.approve_finance(user=self.owner, closure_id=closure.id)
        MatterClosureService.generate_document(
            user=self.owner, closure_id=closure.id,
            document_type=GeneratedClosingDocument.Type.CLOSING_LETTER,
        )
        MatterClosureService.generate_document(
            user=self.owner, closure_id=closure.id,
            document_type=GeneratedClosingDocument.Type.FINAL_CLIENT_STATEMENT,
        )
        return closure

    def test_active_task_blocks_closure_and_complete_checklist_allows_it(self):
        task = CaseTask.objects.create(case=self.matter, title="Final follow-up", created_by=self.owner)
        closure = self.prepared_closure()
        with self.assertRaises(ValidationError) as error:
            MatterClosureService.finalise(user=self.owner, closure_id=closure.id)
        self.assertIn("Active or unresolved tasks remain.", str(error.exception.detail))
        task.status = CaseTask.TaskStatus.DONE
        task.save(update_fields=["status", "updated_at"])
        closure = MatterClosureService.finalise(user=self.owner, closure_id=closure.id)
        self.matter.refresh_from_db()
        self.assertEqual(closure.status, MatterClosure.Status.CLOSED)
        self.assertEqual(self.matter.matter_status, Case.MatterStatus.CLOSED)

    def test_client_money_balance_blocks_finance_approval(self):
        MatterClientLedger.objects.create(
            firm=self.firm, client=self.client, matter=self.matter, cleared_balance=Decimal("1.00")
        )
        closure = MatterClosureService.request(user=self.owner, matter_id=self.matter.id, data=self.closure_data())
        with self.assertRaises(ValidationError):
            MatterClosureService.approve_finance(user=self.owner, closure_id=closure.id)

    def test_legacy_status_command_cannot_bypass_formal_closure(self):
        with self.assertRaises(PermissionError):
            CaseService.change_status(
                case=self.matter, status=Case.Status.CLOSED, actor=self.owner,
                note="Attempted direct closure",
            )
        self.matter.refresh_from_db()
        self.assertEqual(self.matter.matter_status, Case.MatterStatus.ACTIVE)

    def test_reopening_requires_reason_and_preserves_closure_history(self):
        closure = MatterClosureService.finalise(user=self.owner, closure_id=self.prepared_closure().id)
        with self.assertRaises(ValidationError):
            MatterClosureService.reopen(user=self.owner, closure_id=closure.id, reason="")
        MatterClosureService.reopen(user=self.owner, closure_id=closure.id, reason="Client requested enforcement advice.")
        closure.refresh_from_db()
        self.assertEqual(closure.status, MatterClosure.Status.REOPENED)
        self.assertEqual(closure.reopening_reason, "Client requested enforcement advice.")

    def test_closing_documents_are_versioned_and_registered_to_matter(self):
        closure = self.prepared_closure()
        revised = MatterClosureService.generate_document(
            user=self.owner, closure_id=closure.id,
            document_type=GeneratedClosingDocument.Type.CLOSING_LETTER,
        )
        self.assertEqual(revised.version, 2)
        self.assertTrue(self.matter.document_references.filter(document=revised.client_document).exists())
        self.assertEqual(revised.content_snapshot["internal_matter_number"], self.matter.case_number)
        self.assertTrue(revised.client_document.file.name.endswith(".pdf"))
        self.assertEqual(revised.client_document.file.read(5), b"%PDF-")

    def archive(self):
        MatterClosureService.finalise(user=self.owner, closure_id=self.prepared_closure().id)
        return ArchiveService.archive(
            user=self.owner, matter_id=self.matter.id,
            data={
                "archive_reference": "ARC-001", "closure_date": date.today(), "archive_date": date.today(),
                "electronic_location": "vault/MAT-GOV-001", "archive_category": "ADVISORY",
                "matter_type": "COMMERCIAL", "retention_policy": "Seven-year standard policy",
                "retention_start_date": date.today(), "scheduled_review_date": date.today() + timedelta(days=365 * 7),
                "responsible_custodian": self.owner, "archive_checklist": {"closing_letter": True},
            },
        )

    def test_only_closed_matter_archives_and_legal_hold_prevents_destruction(self):
        with self.assertRaises(ValidationError):
            ArchiveService.archive(
                user=self.owner, matter_id=self.matter.id,
                data={"archive_reference": "BAD", "closure_date": date.today(), "archive_date": date.today(),
                      "electronic_location": "x", "archive_category": "X", "matter_type": "X",
                      "retention_policy": "X", "retention_start_date": date.today(),
                      "scheduled_review_date": date.today(), "responsible_custodian": self.owner,
                      "archive_checklist": {}},
            )
        archive = self.archive()
        ArchiveService.retention_review(
            user=self.owner, archive_id=archive.id,
            data={"assessment": {"legal_hold": True}, "outcome": RetentionReview.Outcome.LEGAL_HOLD,
                  "reason": "Pending professional-negligence complaint."},
        )
        with self.assertRaises(ValidationError):
            ArchiveService.destroy(
                user=self.owner, archive_id=archive.id,
                data={"records_approved": ["file"], "records_excluded": ["audit"],
                      "approval_date": date.today(), "destruction_date": date.today(), "method": "Cross-cut shred",
                      "performed_by": "Approved contractor", "verifier": "Records manager",
                      "electronic_deletion_confirmed": True, "backup_handling_decision": "Expire normally"},
            )

    def test_approved_destruction_retains_immutable_metadata(self):
        archive = self.archive()
        document = self.matter.generated_closing_documents.filter(
            document_type=GeneratedClosingDocument.Type.FINAL_CLIENT_STATEMENT
        ).latest("generated_at").client_document
        ArchiveService.retention_review(
            user=self.owner, archive_id=archive.id,
            data={"assessment": {"limitation": "expired", "aml": "satisfied"},
                  "outcome": RetentionReview.Outcome.APPROVE_DESTRUCTION,
                  "reason": "All retention duties expired."},
        )
        record = ArchiveService.destroy(
            user=self.owner, archive_id=archive.id,
            data={"records_approved": [str(document.id)], "records_excluded": [],
                  "approval_date": date.today(), "destruction_date": date.today(), "method": "Certified shred and secure erase",
                  "performed_by": "Records officer", "verifier": "Managing partner",
                  "electronic_deletion_confirmed": True, "backup_handling_decision": "Encrypted backups age out"},
        )
        self.assertEqual(record.matter_reference, "MAT-GOV-001")
        self.assertTrue(Case.objects.filter(id=self.matter.id).exists())
        document.refresh_from_db()
        self.assertFalse(bool(document.file))
        self.assertEqual(document.destruction_log, record)
        self.assertIsNotNone(document.content_destroyed_at)
        with self.assertRaises(DjangoValidationError):
            record.delete()

    def test_archive_api_logs_access_and_exposes_retention_and_document_inventory(self):
        archive = self.archive()
        response = self.api.get(
            f"/api/cases/{self.matter.id}/archive/", {"purpose": "Retention administration"},
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["archive"]["archive_reference"], archive.archive_reference)
        self.assertEqual(len(response.data["archive"]["access_history"]), 1)
        self.assertGreaterEqual(len(response.data["archive"]["document_inventory"]), 2)

    def test_legal_hold_can_only_be_released_through_recorded_authorised_action(self):
        archive = self.archive()
        ArchiveService.legal_hold(
            user=self.owner, archive_id=archive.id, action="PLACE",
            reason="Pending complaint", authority="Managing partner direction",
        )
        archive.refresh_from_db()
        self.assertTrue(archive.legal_hold)
        ArchiveService.legal_hold(
            user=self.owner, archive_id=archive.id, action="RELEASE",
            reason="Complaint finally resolved", authority="Managing partner direction",
        )
        archive.refresh_from_db()
        self.assertFalse(archive.legal_hold)
        self.assertTrue(archive.firm.audit_events.filter(action="LEGAL_HOLD_RELEASED").exists())

    def test_retention_api_requires_every_named_preservation_assessment(self):
        serializer = RetentionReviewSerializer(data={
            "assessment": {"legal_hold": "None"}, "outcome": "DEFER",
            "reason": "Incomplete review", "next_review_date": date.today() + timedelta(days=30),
        })
        self.assertFalse(serializer.is_valid())
        self.assertIn("missing", str(serializer.errors["assessment"]).lower())
