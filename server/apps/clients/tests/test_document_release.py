from datetime import date

from django.test import TestCase
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.audit_logs.models import AuditEvent
from apps.cases.models import Case
from apps.clients.models import Client, ClientDocument, ClientDocumentCustodyMovement
from apps.clients.services.document_release_service import DocumentReleaseService
from apps.common.choices import UserRole
from apps.documents.models import MatterDocumentReference
from apps.firm.models import LawFirm
from apps.staff.models import Lawyer, LawyerPermission, LawyerPermissionGrant
from apps.users.models import User


class DocumentReleaseWorkflowTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            email="custody-owner@example.com", password="pass", first_name="Custody", last_name="Owner",
            phone_number="+254700870001", national_id_number="CUSTODY1", role=UserRole.ADMIN,
        )
        self.firm = LawFirm.objects.create(name="Custody Firm", registration_number="CUST-FIRM", owner=self.owner)
        checker_user = User.objects.create_user(
            email="custody-checker@example.com", password="pass", first_name="Custody", last_name="Checker",
            phone_number="+254700870002", national_id_number="CUSTODY2", role=UserRole.STAFF,
        )
        checker = Lawyer.objects.create(
            user=checker_user, law_firm=self.firm, staff_number="CUST-ADV-1",
            admission_number="CUST-ADV-1", date_hired=date(2026, 1, 1),
        )
        LawyerPermissionGrant.objects.create(
            lawyer=checker, code=LawyerPermission.APPROVE_DOCUMENTS, granted_by=self.owner,
        )
        self.checker_user = checker_user
        self.client = Client.objects.create(
            firm=self.firm, created_by=self.owner, full_name="Custody Client",
            client_type=Client.ClientType.INDIVIDUAL, national_id="CUST-CLIENT",
        )
        self.matter = Case.objects.create(
            firm=self.firm, client=self.client, created_by=self.owner, case_number="MAT-CUST-001",
            title="Title custody", case_type=Case.CaseType.COMMERCIAL, matter_status=Case.MatterStatus.ACTIVE,
        )
        self.document = ClientDocument.objects.create(
            firm=self.firm, client=self.client, document_type="LEGAL", title="Original title deed",
            source_copy_type=ClientDocument.SourceCopyType.ORIGINAL, physical_copy_retained=True,
            physical_storage_location="Strong room A / shelf 2", received_by=self.owner,
        )
        MatterDocumentReference.objects.create(
            case=self.matter, document=self.document, referenced_by=self.owner,
        )

    def test_original_release_requires_independent_approval_and_preserves_custody_history(self):
        request = DocumentReleaseService.request(
            user=self.owner, client_id=self.client.id, document_id=self.document.id,
            matter_id=self.matter.id, purpose="Return original after completion",
            proposed_recipient="Client in person",
        )
        with self.assertRaises(PermissionDenied):
            DocumentReleaseService.decide(
                user=self.owner, release_id=request.id, approve=True, reason="Identity checked",
            )
        with self.assertRaises(ValidationError):
            DocumentReleaseService.release(
                user=self.owner, release_id=request.id, released_to="Client",
                recipient_identification="National ID 123", recipient_acknowledgement="Signed",
            )

        DocumentReleaseService.decide(
            user=self.checker_user, release_id=request.id, approve=True,
            reason="Matter complete and recipient authority verified.",
        )
        released = DocumentReleaseService.release(
            user=self.owner, release_id=request.id, released_to="Client in person",
            recipient_identification="National ID verified against client record",
            recipient_acknowledgement="Client signed the release register.",
        )
        self.document.refresh_from_db()
        self.assertEqual(released.status, released.Status.RELEASED)
        self.assertFalse(self.document.physical_copy_retained)
        self.assertTrue(ClientDocumentCustodyMovement.objects.filter(
            document=self.document, movement_type=ClientDocumentCustodyMovement.MovementType.RELEASE,
        ).exists())
        self.assertTrue(AuditEvent.objects.filter(
            firm=self.firm, action="ORIGINAL_DOCUMENT_RELEASED", object_identifier=str(released.id),
        ).exists())
