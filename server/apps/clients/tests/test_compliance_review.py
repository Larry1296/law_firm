from datetime import date

from django.test import TestCase
from rest_framework.exceptions import PermissionDenied

from apps.clients.models import Client, ClientComplianceReview
from apps.clients.services.compliance_review_service import ClientComplianceReviewService
from apps.common.choices import UserRole
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
