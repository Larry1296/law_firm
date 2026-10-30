from datetime import date

from django.test import TestCase
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.clients.models import (
    Client, ClientComplianceReview, ClientDocument, ClientDueDiligence, ClientMatterConflictCheck,
)
from apps.clients.services.compliance_review_service import ClientComplianceReviewService
from apps.common.choices import ConflictCheckStatus, UserRole
from apps.firm.models import LawFirm
from apps.staff.models import Lawyer, LawyerPermission, LawyerPermissionGrant
from apps.users.models import User


class ClientComplianceReviewTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            email="compliance-owner@example.com", password="pass", first_name="Compliance",
            last_name="Owner", phone_number="+254700720001", national_id_number="COMPOWNER1",
            role=UserRole.ADMIN,
        )
        self.firm = LawFirm.objects.create(name="Compliance Firm", registration_number="COMP-FIRM", owner=self.owner)
        reviewer_user = User.objects.create_user(
            email="compliance-reviewer@example.com", password="pass", first_name="Compliance",
            last_name="Reviewer", phone_number="+254700720002", national_id_number="COMPREVIEW2",
            role=UserRole.STAFF,
        )
        self.reviewer = Lawyer.objects.create(
            user=reviewer_user, law_firm=self.firm, staff_number="COMP-ADV-1",
            admission_number="COMP-ADV-1", date_hired=date(2026, 1, 1),
        )
        LawyerPermissionGrant.objects.create(
            lawyer=self.reviewer, code=LawyerPermission.REVIEW_CLIENT_COMPLIANCE, granted_by=self.owner,
        )
        self.client = Client.objects.create(
            firm=self.firm, created_by=self.owner, full_name="Compliance Client Limited",
            client_type=Client.ClientType.COMPANY,
        )
        self.check = ClientMatterConflictCheck.objects.create(
            firm=self.firm, client=self.client, reference_number="COMP/2026/0001",
            proposed_matter_title="Advisory instruction", proposed_instructions="Provide a legal opinion.",
            responsible_lawyer=self.reviewer, created_by=self.owner, status=ConflictCheckStatus.CLEARED,
        )

    def test_kyc_review_cannot_be_recorded_before_conflict_clearance(self):
        self.check.status = ConflictCheckStatus.IN_PROGRESS
        self.check.save(update_fields=["status"])
        with self.assertRaises(ValidationError):
            ClientComplianceReviewService.record(
                user=self.reviewer.user, client_id=self.client.id,
                data={"identity_status": "VERIFIED", "reason": "Identity documents reviewed."},
            )

    def test_company_opening_requires_identity_authority_beneficial_ownership_and_dd_clearance(self):
        review = ClientComplianceReviewService.record(
            user=self.reviewer.user, client_id=self.client.id,
            data={
                "identity_status": ClientComplianceReview.VerificationStatus.VERIFIED,
                "authority_status": ClientComplianceReview.VerificationStatus.VERIFIED,
                "beneficial_ownership_status": ClientComplianceReview.VerificationStatus.VERIFIED,
                "due_diligence_status": ClientComplianceReview.DueDiligenceStatus.CLEARED,
                "source_of_funds_required": True,
                "source_of_funds_status": ClientComplianceReview.VerificationStatus.VERIFIED,
                "evidence": {"company_search": "CR12-2026-001", "authority": "board resolution"},
                "reason": "Identity, authority, ownership and screening evidence reviewed.",
            },
        )

        self.assertEqual(ClientComplianceReviewService.opening_errors(self.client, review=review), {})
        self.assertTrue(review.history.filter(action="REVIEW_RECORDED").exists())

    def test_due_diligence_restriction_blocks_opening_and_preserves_reason(self):
        review = ClientComplianceReviewService.record(
            user=self.reviewer.user, client_id=self.client.id,
            data={
                "identity_status": "VERIFIED", "authority_status": "VERIFIED",
                "beneficial_ownership_status": "VERIFIED", "due_diligence_status": "RESTRICTED",
                "restriction_reason": "Confirmed sanctions match pending compliance direction.",
                "reason": "Sanctions screening escalated.",
            },
        )
        errors = ClientComplianceReviewService.opening_errors(self.client, review=review)
        self.assertIn("due_diligence_restriction", errors)
        self.assertIn("sanctions", errors["due_diligence_restriction"].lower())

    def test_verified_identity_and_authority_mark_the_kyc_documents_and_due_diligence(self):
        def kyc_document(reference, subtype):
            return ClientDocument.objects.create(
                client=self.client, firm=self.firm, title=reference, reference=reference,
                classification=ClientDocument.Classification.CLIENT_KYC, subtype=subtype,
            )
        incorporation = kyc_document("KYC-2026-001/D1", ClientDocument.Subtype.INCORPORATION)
        resolution = kyc_document("KYC-2026-001/D2", ClientDocument.Subtype.AUTHORITY_TO_INSTRUCT)
        letter = kyc_document("KYC-2026-001/D3", ClientDocument.Subtype.ENGAGEMENT_LETTER)

        ClientComplianceReviewService.record(
            user=self.reviewer.user, client_id=self.client.id,
            data={"identity_status": "VERIFIED", "authority_status": "VERIFIED", "reason": "Originals seen."},
        )

        for document in (incorporation, resolution):
            document.refresh_from_db()
            self.assertEqual(document.verification_status, ClientDocument.VerificationStatus.VERIFIED)
            self.assertEqual(document.verified_by, self.reviewer.user)
        letter.refresh_from_db()
        self.assertEqual(letter.verification_status, ClientDocument.VerificationStatus.NOT_VERIFIED)
        due_diligence = ClientDueDiligence.objects.get(client=self.client)
        self.assertEqual(due_diligence.identity_verification_status, "VERIFIED")
        self.assertEqual(due_diligence.identity_evidence_reference, "KYC-2026-001/D1")
        self.assertTrue(due_diligence.authority_verified)

    def test_unpermissioned_lawyer_cannot_record_compliance_decision(self):
        other_user = User.objects.create_user(
            email="compliance-other@example.com", password="pass", first_name="Other", last_name="Lawyer",
            phone_number="+254700720003", national_id_number="COMPOTHER3", role=UserRole.STAFF,
        )
        Lawyer.objects.create(
            user=other_user, law_firm=self.firm, staff_number="COMP-ADV-2",
            admission_number="COMP-ADV-2", date_hired=date(2026, 1, 1),
        )
        with self.assertRaises(PermissionDenied):
            ClientComplianceReviewService.record(user=other_user, client_id=self.client.id, data={})
