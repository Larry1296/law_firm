"""A firm registered through onboarding can take its first client.

A new firm starts with no privacy notice, so nobody can create a client until
the owner approves one. The owner is offered a prefilled standard notice to
read and approve. A sole practitioner then approves their own engagement
exceptions because there is no second advocate; a firm with partners still
needs an independent approval.
"""

from django.urls import reverse
from django.utils import timezone

from apps.cases.tests.test_end_to_end_litigation import EndToEndLitigationTests, make_user
from apps.clients.models import Client, ClientMatterConflictCheck, EngagementRecord, IntakePrivacyConfig
from apps.common.choices import ConflictCheckStatus, UserRole
from apps.firm.models import LawFirm
from apps.platform_admin.services.firm_onboarding_service import FirmOnboardingService
from apps.staff.models import Lawyer, LawyerPermission, LawyerPermissionGrant


class NewSoloFirmStartTests(EndToEndLitigationTests):
    def test_walk_in_to_archive(self):
        """The full walkthrough runs in its own module; this class reuses its setup only."""

    def onboard(self, structure, suffix):
        return FirmOnboardingService.create_firm(
            firm={"name": f"{suffix.title()} Advocates", "business_structure": structure,
                  "email": f"office@{suffix}.test", "phone_number": "+254733000100"},
            owner={"first_name": "Mutiso", "last_name": suffix.title(), "email": f"owner@{suffix}.test",
                   "phone_number": "+254733000101", "national_id_number": "33000101",
                   "admission_number": f"P.105/{suffix}"},
            password="Strong-pass-123",
        )

    def approve_standard_notice(self, firm):
        api = self.as_user(firm.owner)
        listing = self.ok(api.get(reverse("intake-privacy-list")))
        self.assertFalse(any(config["status"] == "ACTIVE" for config in listing["results"]))
        notice = listing["standard_notice"]
        self.assertIn(firm.name, notice["notice_text"])
        self.assertIn("Data Protection Act, 2019", notice["notice_text"])
        draft = self.ok(api.post(reverse("intake-privacy-list"), notice, format="json"), 201)
        self.ok(api.post(reverse("intake-privacy-action", args=[draft["id"], "activate"]), {}, format="json"))
        return notice

    def create_prospect(self, firm):
        return self.as_user(firm.owner).post(reverse("admin-prospective-create"), {
            "full_name": "Grace Mwende", "client_type": "INDIVIDUAL", "access_type": "ASSISTED",
            "phone_number": "+254722555001", "legal_profile": {},
            "privacy": {"privacy_notice_delivered": True, "delivery_method": "PAPER"},
        }, format="json")

    def cleared_proposal_with_engagement(self, firm, responsible=None):
        owner_lawyer = responsible or Lawyer.objects.get(user=firm.owner)
        client = Client.objects.get(pk=self.ok(self.create_prospect(firm), 201)["client"]["id"])
        proposal = ClientMatterConflictCheck.objects.create(
            firm=firm, client=client, reference_number=f"CC/{firm.pk.hex[:6]}/0001",
            proposed_matter_title="Land boundary dispute", proposed_instructions="Advise on a boundary dispute.",
            responsible_lawyer=owner_lawyer, created_by=firm.owner, status=ConflictCheckStatus.CLEARED,
        )
        base = f"/api/admin/clients/{client.id}/conflict-checks/{proposal.id}/engagements"
        engagement = self.ok(self.as_user(firm.owner).post(f"{base}/", {
            "responsible_advocate": str(owner_lawyer.id),
            "scope_of_work": "Advise on the boundary dispute and write to the neighbour.",
            "fee_arrangement_type": "FIXED", "fee_arrangement_description": "KES 30,000.",
        }, format="json"), 201)["engagement"]
        return f"{base}/{engagement['id']}/exception/"

    def waive(self, user, url):
        return self.as_user(user).post(url, {
            "status": EngagementRecord.Status.WAIVED, "reason": "Urgent protective filing before the letter is signed.",
            "policy_basis": "Firm urgent-instructions policy.",
        }, format="json")

    def test_new_firm_takes_no_client_until_the_owner_approves_the_standard_notice(self):
        firm = self.onboard(LawFirm.BusinessStructure.SOLE_PRACTITIONER, "mutiso")
        dashboard = reverse("admin-client-dashboard")
        self.assertFalse(self.ok(self.as_user(firm.owner).get(dashboard))["dashboard"]["privacy_notice_active"])
        refused = self.create_prospect(firm)
        self.assertEqual(refused.status_code, 400, refused.data)
        self.assertIn("privacy", refused.data["errors"])

        notice = self.approve_standard_notice(firm)

        self.assertTrue(self.ok(self.as_user(firm.owner).get(dashboard))["dashboard"]["privacy_notice_active"])

        active = IntakePrivacyConfig.active_for(firm)
        self.assertEqual(active.policy_version, notice["policy_version"])
        self.assertEqual(active.approved_by, firm.owner)
        client = Client.objects.get(pk=self.ok(self.create_prospect(firm), 201)["client"]["id"])
        self.assertEqual(client.privacy.privacy_notice_version, notice["policy_version"])
        # The next standard notice offered takes a version that is not yet used.
        listing = self.ok(self.as_user(firm.owner).get(reverse("intake-privacy-list")))
        self.assertNotEqual(listing["standard_notice"]["policy_version"], notice["policy_version"])

    def test_new_sole_practitioner_approves_their_own_engagement_waiver(self):
        firm = self.onboard(LawFirm.BusinessStructure.SOLE_PRACTITIONER, "solo")
        self.approve_standard_notice(firm)
        url = self.cleared_proposal_with_engagement(firm)

        data = self.ok(self.waive(firm.owner, url))

        self.assertEqual(data["engagement"]["status"], EngagementRecord.Status.WAIVED)
        self.assertTrue(EngagementRecord.objects.get(pk=data["engagement"]["id"]).permits_opening)

    def test_firm_with_partners_still_needs_an_independent_waiver_approval(self):
        firm = self.onboard(LawFirm.BusinessStructure.PARTNERSHIP, "partners")
        self.approve_standard_notice(firm)
        partner_user = make_user("second@partners.test", UserRole.STAFF, "Second", "Partner", "+254733000299")
        partner = Lawyer.objects.create(
            user=partner_user, law_firm=firm, staff_number="ADV-0002",
            admission_number="P.105/second", date_hired=timezone.localdate(),
        )
        for code in [*self.ADVOCATE_GRANTS, LawyerPermission.WAIVE_ENGAGEMENT]:
            LawyerPermissionGrant.objects.create(lawyer=partner, code=code, granted_by=firm.owner)
        # The owner prepares the engagement on the partner's proposal; the partner is the independent checker.
        url = self.cleared_proposal_with_engagement(firm, responsible=partner)

        refused = self.waive(firm.owner, url)
        self.assertEqual(refused.status_code, 403, refused.data)
        self.assertIn("cannot approve their own exception", refused.data["detail"])
        self.ok(self.waive(partner_user, url))

    def test_sole_practitioner_who_hires_an_advocate_needs_an_independent_approval_again(self):
        firm = self.onboard(LawFirm.BusinessStructure.SOLE_PRACTITIONER, "grown")
        self.approve_standard_notice(firm)
        hired = make_user("hired@grown.test", UserRole.STAFF, "Hired", "Advocate", "+254733000399")
        Lawyer.objects.create(user=hired, law_firm=firm, staff_number="ADV-0002",
                              admission_number="P.105/hired", date_hired=timezone.localdate())
        url = self.cleared_proposal_with_engagement(firm)

        refused = self.waive(firm.owner, url)
        self.assertEqual(refused.status_code, 403, refused.data)
        self.assertIn("cannot approve their own exception", refused.data["detail"])
