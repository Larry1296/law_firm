from datetime import date

from django.test import TestCase
from rest_framework.exceptions import PermissionDenied

from apps.clients.models import Client, ClientMatterConflictCheck, EngagementRecord
from apps.clients.services.engagement_service import EngagementService
from apps.common.choices import UserRole
from apps.firm.models import FirmSetting, LawFirm
from apps.staff.models import Lawyer, LawyerPermission, LawyerPermissionGrant
from apps.users.models import User


class EngagementWorkflowTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            email="engagement-owner@example.com", password="pass", first_name="Engagement",
            last_name="Owner", phone_number="+254700710001", national_id_number="ENGOWNER1",
            role=UserRole.ADMIN,
        )
        self.firm = LawFirm.objects.create(name="Engagement Test Firm", registration_number="ENG-FIRM", owner=self.owner)
        FirmSetting.objects.create(firm=self.firm)
        self.owner_lawyer = Lawyer.objects.create(
            user=self.owner, law_firm=self.firm, staff_number="ENG-ADV-1",
            admission_number="ENG-ADV-1", date_hired=date(2026, 1, 1),
        )
        checker_user = User.objects.create_user(
            email="engagement-checker@example.com", password="pass", first_name="Engagement",
            last_name="Checker", phone_number="+254700710002", national_id_number="ENGCHECK2",
            role=UserRole.STAFF,
        )
        self.checker = Lawyer.objects.create(
            user=checker_user, law_firm=self.firm, staff_number="ENG-ADV-2",
            admission_number="ENG-ADV-2", date_hired=date(2026, 1, 1),
        )
        LawyerPermissionGrant.objects.create(
            lawyer=self.checker, code=LawyerPermission.WAIVE_ENGAGEMENT, granted_by=self.owner,
        )
        LawyerPermissionGrant.objects.create(
            lawyer=self.checker, code=LawyerPermission.APPROVE_ENGAGEMENT, granted_by=self.owner,
        )
        self.client = Client.objects.create(
            firm=self.firm, created_by=self.owner, full_name="Engagement Client",
            client_type=Client.ClientType.INDIVIDUAL, national_id="ENG-CLIENT-1",
        )
        self.proposal = ClientMatterConflictCheck.objects.create(
            firm=self.firm, client=self.client, reference_number="ENG/2026/0001",
            proposed_matter_title="Advisory instruction", proposed_instructions="Provide a legal opinion.",
            responsible_lawyer=self.owner_lawyer, created_by=self.owner,
        )

    def create_draft(self):
        return EngagementService.create(
            user=self.owner, proposed_matter=self.proposal,
            data={
                "responsible_advocate": self.owner_lawyer,
                "scope_of_work": "Review documents and provide a written legal opinion.",
                "excluded_work": "Litigation and appeals.",
                "fee_arrangement_type": EngagementRecord.FeeArrangement.FIXED,
                "fee_arrangement_description": "KES 50,000 plus approved disbursements.",
            },
        )

    def test_exception_requires_independent_authorised_checker_and_audit_history(self):
        record = self.create_draft()
        with self.assertRaises(PermissionDenied):
            EngagementService.approve_exception(
                user=self.owner, engagement_id=record.id, proposed_matter_id=self.proposal.id,
                status=EngagementRecord.Status.WAIVED, reason="Urgent protective filing.",
                policy_basis="Firm urgent-instructions policy section 4.",
            )

        record = EngagementService.approve_exception(
            user=self.checker.user, engagement_id=record.id, proposed_matter_id=self.proposal.id,
            status=EngagementRecord.Status.WAIVED, reason="Urgent protective filing.",
            policy_basis="Firm urgent-instructions policy section 4.",
        )

        self.assertTrue(record.permits_opening)
        self.assertEqual(record.exception_approved_by, self.checker.user)
        self.assertTrue(record.history.filter(action="EXCEPTION_APPROVED").exists())

    def test_supersession_preserves_old_version_and_allows_new_version(self):
        first = self.create_draft()
        EngagementService.supersede(
            user=self.checker.user, engagement_id=first.id, proposed_matter_id=self.proposal.id,
            reason="Client requested a revised scope and fee structure.",
        )
        second = self.create_draft()

        first.refresh_from_db()
        self.assertEqual(first.status, EngagementRecord.Status.SUPERSEDED)
        self.assertEqual(second.version, 2)
        self.assertTrue(first.history.filter(action="SUPERSEDED").exists())
