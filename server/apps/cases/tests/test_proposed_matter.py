"""Tests for the ProposedMatter model, service and API."""

from datetime import date

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from apps.cases.models import Case, ProposedMatter
from apps.clients.models import Client
from apps.common.choices import UserRole
from apps.firm.models import LawFirm
from apps.staff.models import Lawyer, Secretary
from apps.users.models import User


class BaseProposedMatterTest(TestCase):
    """Shared setup for proposed-matter tests."""

    def setUp(self):
        self.api = APIClient()
        self.admin = User.objects.create_user(
            email="pm-admin@example.test",
            password="strong-pass123",
            first_name="PM",
            last_name="Admin",
            phone_number="+254711000001",
            national_id_number="PMADMIN001",
            role=UserRole.ADMIN,
        )
        self.firm = LawFirm.objects.create(
            name="PM Test Firm",
            registration_number="PM-FIRM-001",
            owner=self.admin,
        )
        self.lawyer = Lawyer.objects.create(
            user=self.admin,
            law_firm=self.firm,
            staff_number="PM-LAW-001",
            admission_number="ADV-PM-001",
            date_hired=date(2026, 1, 1),
        )

        self.client_obj = Client.objects.create(
            firm=self.firm,
            full_name="Jane Doe",
            email="jane@example.test",
            phone_number="+254722000001",
            national_id="CLIENT001",
            client_type=Client.ClientType.INDIVIDUAL,
        )

        self.api.force_authenticate(user=self.admin)

    # Helpers ──────────────────────────────────────────────────────────

    def _create_payload(self, **overrides):
        payload = {
            "title": "Debt Recovery – Acme Corp",
            "proposed_instructions": "Recover KES 500,000 owed for services rendered.",
            "factual_summary": "Client provided consulting services to Acme Corp.",
            "desired_outcome": "Full payment of outstanding invoice.",
            "urgency_level": "NORMAL",
            "urgency_details": "",
            "known_adverse_party": "Acme Corp",
            "no_adverse_party_known": False,
            "limitation_date": "2032-06-30",
        }
        payload.update(overrides)
        return payload

    def _create_proposed_matter(self, **overrides):
        url = reverse("proposed-matter-list-create")
        return self.api.post(url, self._create_payload(**overrides), format="json")


class ProposedMatterCreateTests(BaseProposedMatterTest):
    """Tests for creating proposed matters."""

    def test_create_proposed_matter_success(self):
        response = self._create_proposed_matter()
        self.assertEqual(response.status_code, 201)
        data = response.json()["data"]
        self.assertEqual(data["title"], "Debt Recovery – Acme Corp")
        self.assertEqual(data["urgency_level"], "NORMAL")
        self.assertEqual(data["status"], "DRAFT")
        self.assertEqual(data["limitation_date"], "2032-06-30")
        self.assertEqual(data["known_adverse_party"], "Acme Corp")
        self.assertFalse(data["no_adverse_party_known"])

    def test_create_proposed_matter_with_responsible_advocate(self):
        response = self._create_proposed_matter(
            responsible_advocate_id=str(self.lawyer.id)
        )
        self.assertEqual(response.status_code, 201)
        data = response.json()["data"]
        self.assertEqual(data["responsible_advocate"]["id"], str(self.lawyer.id))

    def test_create_proposed_matter_defaults_advocate_to_firm_owner(self):
        response = self._create_proposed_matter()
        self.assertEqual(response.status_code, 201)
        data = response.json()["data"]
        self.assertIsNotNone(data["responsible_advocate"])
        self.assertEqual(data["responsible_advocate"]["id"], str(self.lawyer.id))

    def test_create_proposed_matter_no_adverse_party(self):
        response = self._create_proposed_matter(
            known_adverse_party="",
            no_adverse_party_known=True,
        )
        self.assertEqual(response.status_code, 201)
        data = response.json()["data"]
        self.assertTrue(data["no_adverse_party_known"])
        self.assertEqual(data["known_adverse_party"], "")

    def test_create_proposed_matter_auto_sets_no_adverse_flag_when_blank(self):
        response = self._create_proposed_matter(known_adverse_party="")
        self.assertEqual(response.status_code, 201)
        data = response.json()["data"]
        self.assertTrue(data["no_adverse_party_known"])

    def test_create_proposed_matter_requires_proposed_instructions(self):
        response = self._create_proposed_matter(proposed_instructions="")
        self.assertEqual(response.status_code, 400)

    def test_create_proposed_matter_requires_title(self):
        response = self._create_proposed_matter(title="")
        self.assertEqual(response.status_code, 400)

    def test_create_proposed_matter_with_client(self):
        response = self._create_proposed_matter(
            client_id=str(self.client_obj.id)
        )
        self.assertEqual(response.status_code, 201)
        data = response.json()["data"]
        self.assertEqual(data["client"]["id"], str(self.client_obj.id))


class ProposedMatterListTests(BaseProposedMatterTest):
    """Tests for listing proposed matters."""

    def test_list_proposed_matters_empty(self):
        url = reverse("proposed-matter-list-create")
        response = self.api.get(url)
        self.assertEqual(response.status_code, 200)
        data = response.json()["data"]
        self.assertEqual(data["summary"]["total_proposed"], 0)
        self.assertEqual(len(data["proposed_matters"]), 0)

    def test_list_proposed_matters_after_create(self):
        self._create_proposed_matter()
        url = reverse("proposed-matter-list-create")
        response = self.api.get(url)
        self.assertEqual(response.status_code, 200)
        data = response.json()["data"]
        self.assertEqual(data["summary"]["total_proposed"], 1)
        self.assertEqual(data["summary"]["drafts"], 1)

    def test_list_filter_by_status(self):
        self._create_proposed_matter(title="Draft One")
        url = reverse("proposed-matter-list-create")
        response = self.api.get(url, {"status": "DRAFT"})
        self.assertEqual(response.status_code, 200)
        data = response.json()["data"]
        self.assertEqual(len(data["proposed_matters"]), 1)

    def test_list_filter_by_urgency(self):
        self._create_proposed_matter(title="Urgent Matter", urgency_level="URGENT")
        url = reverse("proposed-matter-list-create")
        response = self.api.get(url, {"urgency_level": "URGENT"})
        self.assertEqual(response.status_code, 200)
        data = response.json()["data"]
        self.assertEqual(len(data["proposed_matters"]), 1)


class ProposedMatterDetailTests(BaseProposedMatterTest):
    """Tests for retrieving and updating a proposed matter."""

    def test_get_proposed_matter_detail(self):
        create_response = self._create_proposed_matter()
        pm_id = create_response.json()["data"]["id"]

        url = reverse("proposed-matter-detail", kwargs={"proposed_matter_id": pm_id})
        response = self.api.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["data"]["title"], "Debt Recovery – Acme Corp")

    def test_update_draft_proposed_matter(self):
        create_response = self._create_proposed_matter()
        pm_id = create_response.json()["data"]["id"]

        url = reverse("proposed-matter-detail", kwargs={"proposed_matter_id": pm_id})
        response = self.api.patch(url, {"title": "Updated Title"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["data"]["title"], "Updated Title")

    def test_cannot_update_submitted_proposed_matter(self):
        create_response = self._create_proposed_matter()
        pm_id = create_response.json()["data"]["id"]

        # Submit it first
        submit_url = reverse("proposed-matter-submit", kwargs={"proposed_matter_id": pm_id})
        self.api.post(submit_url)

        url = reverse("proposed-matter-detail", kwargs={"proposed_matter_id": pm_id})
        response = self.api.patch(url, {"title": "Should Fail"}, format="json")
        self.assertEqual(response.status_code, 400)


class ProposedMatterSubmitTests(BaseProposedMatterTest):
    """Tests for submitting a proposed matter."""

    def test_submit_draft_proposed_matter(self):
        create_response = self._create_proposed_matter()
        pm_id = create_response.json()["data"]["id"]

        url = reverse("proposed-matter-submit", kwargs={"proposed_matter_id": pm_id})
        response = self.api.post(url)
        self.assertEqual(response.status_code, 200)
        data = response.json()["data"]
        self.assertEqual(data["status"], "SUBMITTED")
        self.assertIsNotNone(data["submitted_at"])

    def test_cannot_submit_already_submitted_matter(self):
        create_response = self._create_proposed_matter()
        pm_id = create_response.json()["data"]["id"]

        url = reverse("proposed-matter-submit", kwargs={"proposed_matter_id": pm_id})
        self.api.post(url)
        response = self.api.post(url)
        self.assertEqual(response.status_code, 400)


class ProposedMatterWithdrawTests(BaseProposedMatterTest):
    """Tests for withdrawing a proposed matter."""

    def test_withdraw_draft_proposed_matter(self):
        create_response = self._create_proposed_matter()
        pm_id = create_response.json()["data"]["id"]

        url = reverse("proposed-matter-withdraw", kwargs={"proposed_matter_id": pm_id})
        response = self.api.post(url, {"reason": "Client decided not to proceed."}, format="json")
        self.assertEqual(response.status_code, 200)
        data = response.json()["data"]
        self.assertEqual(data["status"], "WITHDRAWN")
        self.assertEqual(data["withdrawal_reason"], "Client decided not to proceed.")
        self.assertIsNotNone(data["withdrawn_at"])

    def test_cannot_withdraw_converted_matter(self):
        create_response = self._create_proposed_matter()
        pm_id = create_response.json()["data"]["id"]
        pm = ProposedMatter.objects.get(id=pm_id)

        # Manually mark as converted to test the guard.
        pm.status = ProposedMatter.Status.CONVERTED_TO_MATTER
        pm.save()

        url = reverse("proposed-matter-withdraw", kwargs={"proposed_matter_id": pm_id})
        response = self.api.post(url, format="json")
        self.assertEqual(response.status_code, 400)


class ProposedMatterServiceTests(BaseProposedMatterTest):
    """Tests for the ProposedMatterService directly."""

    def test_summary_counts(self):
        from apps.cases.services import ProposedMatterService

        self._create_proposed_matter(title="Draft 1")
        self._create_proposed_matter(title="Draft 2")

        qs = ProposedMatterService.base_queryset(self.admin)
        summary = ProposedMatterService.summary(qs)
        self.assertEqual(summary["total_proposed"], 2)
        self.assertEqual(summary["drafts"], 2)
        self.assertEqual(summary["submitted"], 0)

    def test_list_proposed_matters_search(self):
        from apps.cases.services import ProposedMatterService

        self._create_proposed_matter(title="Debt Recovery Alpha")
        self._create_proposed_matter(title="Land Dispute Beta")

        qs = ProposedMatterService.list_proposed_matters(self.admin, search="Debt")
        self.assertEqual(qs.count(), 1)
        self.assertEqual(qs.first().title, "Debt Recovery Alpha")
