from io import StringIO
from unittest import mock
from urllib.parse import parse_qs, urlparse

from django.core import mail
from django.core.management import call_command
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.common.choices import FirmRole, UserRole
from apps.firm.models import Branch, LawFirm, PracticeArea
from apps.platform_admin.models import FirmOnboardingRequest, PlatformActivity
from apps.staff.models import Lawyer
from apps.subscriptions.models import FirmSubscription, Plan, SubscriptionInvoice
from apps.users.models import User

PASSWORD = "Kenya-Law-2026!"


def register_payload(**overrides):
    payload = {
        "firm": {
            "name": "Achieng & Mwangi Advocates",
            "business_structure": "PARTNERSHIP",
            "registration_number": "BN-2026-7781",
            "kra_pin": "P051234567X",
            "email": "info@achiengmwangi.test",
            "phone_number": "+254720000001",
            "website": "https://achiengmwangi.test",
            "physical_address": "5th Floor, Mama Ngina Street, Nairobi",
            "postal_address": "P.O. Box 1234-00100 Nairobi",
            "county": "Nairobi",
            "town": "Nairobi",
            "description": "Commercial and land law practice.",
        },
        "owner": {
            "first_name": "Grace",
            "last_name": "Achieng",
            "email": "grace@achiengmwangi.test",
            "phone_number": "+254720000002",
            "national_id_number": "27000002",
            "admission_number": "P.105/4521/12",
        },
        "office": {"name": "Nairobi Head Office"},
        "practice_areas": ["Conveyancing and real estate", "Land and environment", "land and environment"],
        "settings": {"opening_time": "08:00", "closing_time": "17:30", "work_on_saturday": True},
        "subscription": {"plan_code": "BASIC", "billing_cycle": "MONTHLY", "start": "TRIAL"},
    }
    for key, value in overrides.items():
        payload[key] = {**payload[key], **value} if isinstance(value, dict) else value
    return payload


class PlatformTestCase(TestCase):
    def setUp(self):
        self.platform_admin = User.objects.create_platform_admin(
            email="ops@sheriamaster.test", password=PASSWORD, first_name="Platform",
            last_name="Operator", phone_number="PLATFORM-1", national_id_number="PLATFORM-1",
        )
        self.api = APIClient()
        self.api.force_authenticate(self.platform_admin)

    def register(self, **overrides):
        response = self.api.post("/api/platform/firms/", register_payload(**overrides), format="json")
        self.assertEqual(response.status_code, 201, response.data)
        return response.data


class PlatformAccessTests(PlatformTestCase):
    def test_firm_administrators_and_visitors_cannot_use_the_platform_console(self):
        firm_admin = User.objects.create_user(
            email="owner@firm.test", password=PASSWORD, first_name="Firm", last_name="Owner",
            phone_number="+254700000009", national_id_number="700000009", role=UserRole.ADMIN,
        )
        LawFirm.objects.create(name="Other Firm", registration_number="BN-OTHER", owner=firm_admin)
        other = APIClient()
        other.force_authenticate(firm_admin)
        self.assertEqual(other.get("/api/platform/overview/").status_code, 403)
        self.assertEqual(other.post("/api/platform/firms/", register_payload(), format="json").status_code, 403)
        self.assertEqual(APIClient().get("/api/platform/firms/").status_code, 401)

    def test_platform_admin_signs_in_to_the_console_without_a_firm(self):
        response = APIClient().post(
            "/api/auth/login/", {"email": "ops@sheriamaster.test", "password": PASSWORD}, format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["user"]["role"], UserRole.PLATFORM_ADMIN)
        self.assertTrue(response.data["user"]["is_platform_admin"])
        self.assertIsNone(response.data["firm"]["id"])

    def test_management_command_creates_a_platform_admin(self):
        call_command(
            "create_platform_admin", "--email", "second@sheriamaster.test", "--password", PASSWORD,
            stdout=StringIO(),
        )
        self.assertEqual(User.objects.get(email="second@sheriamaster.test").role, UserRole.PLATFORM_ADMIN)


class FirmRegistrationTests(PlatformTestCase):
    def test_registering_a_firm_sets_up_the_tenant_and_invites_the_owner(self):
        data = self.register()
        firm = LawFirm.objects.get(name="Achieng & Mwangi Advocates")

        self.assertEqual(firm.county, "Nairobi")
        self.assertEqual(firm.kra_pin, "P051234567X")
        owner = firm.owner
        self.assertEqual(owner.role, UserRole.ADMIN)
        self.assertFalse(owner.has_usable_password())
        self.assertEqual(Lawyer.objects.get(user=owner).admission_number, "P.105/4521/12")
        self.assertTrue(firm.members.filter(user=owner, role=FirmRole.LAWYER, is_active=True).exists())
        self.assertEqual(Branch.objects.get(firm=firm, is_head_office=True).name, "Nairobi Head Office")
        self.assertEqual(PracticeArea.objects.filter(firm=firm).count(), 2)
        self.assertTrue(firm.settings.work_on_saturday)

        subscription = firm.subscription
        self.assertEqual(subscription.plan.code, "BASIC")
        self.assertEqual(subscription.status, FirmSubscription.Status.TRIALING)
        self.assertTrue(PlatformActivity.objects.filter(firm=firm, action="FIRM_REGISTERED").exists())

        self.assertEqual(len(mail.outbox), 1)
        self.assertIn(data["owner_invitation_url"], mail.outbox[0].body)
        self.assertEqual(mail.outbox[0].to, ["grace@achiengmwangi.test"])

    def test_owner_sets_a_password_from_the_invitation_and_lands_in_their_firm(self):
        link = self.register()["owner_invitation_url"]
        query = parse_qs(urlparse(link).query)
        reset = APIClient().post(
            "/api/auth/reset-password/",
            {"uid": query["uid"][0], "token": query["token"][0], "new_password": PASSWORD, "confirm_password": PASSWORD},
            format="json",
        )
        self.assertEqual(reset.status_code, 200, reset.data)

        login = APIClient().post(
            "/api/auth/login/", {"email": "grace@achiengmwangi.test", "password": PASSWORD}, format="json",
        )
        self.assertEqual(login.status_code, 200, login.data)
        self.assertEqual(login.data["user"]["role"], UserRole.ADMIN)
        self.assertTrue(login.data["is_firm_owner"])
        self.assertEqual(login.data["user"]["firm"]["name"], "Achieng & Mwangi Advocates")

    def test_paid_registration_records_the_mpesa_payment_and_activates_the_plan(self):
        self.register(subscription={"plan_code": "PRO", "start": "PAID", "mpesa_receipt": "sib7xk2lq9"})
        firm = LawFirm.objects.get(name="Achieng & Mwangi Advocates")
        self.assertEqual(firm.subscription.status, FirmSubscription.Status.ACTIVE)
        self.assertEqual(firm.subscription.plan.code, "PRO")
        invoice = SubscriptionInvoice.objects.get(firm=firm)
        self.assertEqual(invoice.status, SubscriptionInvoice.Status.PAID)
        self.assertEqual(invoice.mpesa_receipt, "SIB7XK2LQ9")

    def test_registration_requires_every_firm_detail(self):
        payload = register_payload()
        payload["firm"].pop("kra_pin")
        payload["firm"]["county"] = "Atlantis"
        payload["practice_areas"] = []
        response = self.api.post("/api/platform/firms/", payload, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertFalse(LawFirm.objects.filter(name="Achieng & Mwangi Advocates").exists())

    def test_paid_registration_requires_a_valid_mpesa_code(self):
        payload = register_payload(subscription={"start": "PAID", "mpesa_receipt": "123"})
        self.assertEqual(self.api.post("/api/platform/firms/", payload, format="json").status_code, 400)

    def test_registering_from_an_onboarding_request_marks_it_registered(self):
        request = FirmOnboardingRequest.objects.create(
            firm_name="Achieng & Mwangi Advocates", contact_name="Grace Achieng",
            email="grace@achiengmwangi.test", phone_number="+254720000002",
        )
        self.register(onboarding_request_id=str(request.id))
        request.refresh_from_db()
        self.assertEqual(request.status, FirmOnboardingRequest.Status.REGISTERED)
        self.assertEqual(request.registered_firm.name, "Achieng & Mwangi Advocates")


class FirmManagementTests(PlatformTestCase):
    def setUp(self):
        super().setUp()
        self.firm_id = self.register()["firm"]["id"]
        self.owner = LawFirm.objects.get(id=self.firm_id).owner
        self.owner.set_password(PASSWORD)
        self.owner.save()

    def test_suspending_a_firm_blocks_its_members_until_reactivated(self):
        token = RefreshToken.for_user(self.owner).access_token
        member = APIClient()
        member.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        self.assertEqual(member.get("/api/admin/firm/branches/").status_code, 200)

        response = self.api.post(f"/api/platform/firms/{self.firm_id}/status/", {"is_active": False, "reason": "Unpaid"}, format="json")
        self.assertEqual(response.status_code, 200, response.data)

        blocked = member.get("/api/admin/firm/branches/")
        self.assertEqual(blocked.status_code, 403)
        self.assertEqual(blocked.data["code"], "firm_suspended")
        login = APIClient().post("/api/auth/login/", {"email": self.owner.email, "password": PASSWORD}, format="json")
        self.assertEqual(login.status_code, 401)
        self.assertIn("suspended", login.data["message"])

        self.api.post(f"/api/platform/firms/{self.firm_id}/status/", {"is_active": True}, format="json")
        self.assertEqual(member.get("/api/admin/firm/branches/").status_code, 200)

    def test_firm_admin_cannot_lift_its_own_suspension(self):
        LawFirm.objects.filter(id=self.firm_id).update(is_active=False)
        client = APIClient()
        client.force_authenticate(User.objects.get(id=self.owner.id))
        client.patch("/api/admin/firm/", {"is_active": True}, format="json")
        self.assertFalse(LawFirm.objects.get(id=self.firm_id).is_active)

    def test_changing_plan_and_extending_the_subscription(self):
        response = self.api.post(
            f"/api/platform/firms/{self.firm_id}/subscription/",
            {"plan_code": "PRO", "status": "ACTIVE", "current_period_end": "2027-12-31T00:00:00Z"},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        subscription = FirmSubscription.objects.get(firm_id=self.firm_id)
        self.assertEqual(subscription.plan.code, "PRO")
        self.assertEqual(subscription.status, FirmSubscription.Status.ACTIVE)
        self.assertEqual(response.data["subscription"]["effective_status"], "ACTIVE")

    def test_firm_detail_list_and_overview(self):
        detail = self.api.get(f"/api/platform/firms/{self.firm_id}/")
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.data["owner"]["admission_number"], "P.105/4521/12")
        self.assertEqual(detail.data["counts"]["members"], 1)

        listing = self.api.get("/api/platform/firms/", {"search": "achieng"})
        self.assertEqual(listing.data["count"], 1)
        self.assertEqual(listing.data["results"][0]["plan_code"], "BASIC")
        self.assertEqual(self.api.get("/api/platform/firms/", {"plan": "PRO"}).data["count"], 0)

        overview = self.api.get("/api/platform/overview/")
        self.assertEqual(overview.status_code, 200)
        self.assertEqual(overview.data["firms"]["total"], 1)
        self.assertEqual(len(overview.data["new_firms_by_month"]), 12)
        self.assertTrue(overview.data["recent_activity"])

    def test_resending_the_owner_invitation(self):
        response = self.api.post(f"/api/platform/firms/{self.firm_id}/owner-invitation/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("/reset-password?uid=", response.data["owner_invitation_url"])

    def test_deactivating_a_user_and_not_oneself(self):
        response = self.api.patch(f"/api/platform/users/{self.owner.id}/", {"is_active": False}, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertFalse(User.objects.get(id=self.owner.id).is_active)
        own = self.api.patch(f"/api/platform/users/{self.platform_admin.id}/", {"is_active": False}, format="json")
        self.assertEqual(own.status_code, 400)

        users = self.api.get("/api/platform/users/", {"firm": self.firm_id})
        self.assertEqual(users.data["count"], 1)
        self.assertEqual(users.data["results"][0]["firm"]["name"], "Achieng & Mwangi Advocates")


class PlanManagementTests(PlatformTestCase):
    def test_editing_a_plan_changes_what_firms_on_it_get(self):
        plan = Plan.objects.get(code="BASIC")
        response = self.api.patch(
            f"/api/platform/plans/{plan.id}/",
            {"monthly_price": "3000.00", "features": ["CLIENT_PORTAL", "AI_CASE_ANALYSIS"]},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        plan.refresh_from_db()
        self.assertEqual(str(plan.monthly_price), "3000.00")
        self.assertEqual(plan.features, ["CLIENT_PORTAL", "AI_CASE_ANALYSIS"])

    def test_creating_and_deleting_an_unused_plan(self):
        response = self.api.post("/api/platform/plans/", {
            "code": "chambers plus", "name": "Chambers Plus", "monthly_price": "4000.00",
            "annual_price": "40000.00", "features": ["CLIENT_PORTAL"],
        }, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["code"], "CHAMBERS_PLUS")
        self.assertEqual(self.api.delete(f"/api/platform/plans/{response.data['id']}/").status_code, 204)

    def test_a_plan_in_use_cannot_be_deleted_or_given_unknown_features(self):
        self.register()
        basic = Plan.objects.get(code="BASIC")
        self.assertEqual(self.api.delete(f"/api/platform/plans/{basic.id}/").status_code, 400)
        bad = self.api.patch(f"/api/platform/plans/{basic.id}/", {"features": ["TELEPORT"]}, format="json")
        self.assertEqual(bad.status_code, 400)


class OnboardingRequestTests(PlatformTestCase):
    def test_public_request_is_listed_for_the_platform_admin(self):
        response = APIClient().post("/api/platform/onboarding-requests/submit/", {
            "firm_name": "Kilonzo Advocates", "contact_name": "Peter Kilonzo", "email": "peter@kilonzo.test",
            "phone_number": "+254733111222", "county": "Machakos", "advocates_count": 2, "preferred_plan": "BASIC",
        }, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        listing = self.api.get("/api/platform/onboarding-requests/", {"status": "NEW"})
        self.assertEqual(listing.data["count"], 1)
        request_id = listing.data["results"][0]["id"]
        updated = self.api.patch(f"/api/platform/onboarding-requests/{request_id}/", {"status": "CONTACTED"}, format="json")
        self.assertEqual(updated.data["status"], "CONTACTED")


class PlatformLegalAssistantTests(TestCase):
    def ask(self, question):
        return APIClient().post("/api/legal-assistant/", {"question": question}, format="json")

    def test_questions_about_a_firm_are_out_of_scope(self):
        response = self.ask("What are your opening hours?")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["intent"], "out_of_scope")
        self.assertIn("law of Kenya", response.data["answer"])

    def test_sign_in_questions_point_to_login(self):
        response = self.ask("How do I log in?")
        self.assertIn("Login", response.data["answer"])

    def test_court_process_questions_are_answered_without_a_firm(self):
        response = self.ask("What are the steps in a court case?")
        self.assertEqual(response.data["intent"], "court_process")

    def test_legal_questions_use_the_law_only_instructions(self):
        from apps.ai.services.knowledge_llm_service import PLATFORM_INSTRUCTION
        from apps.ai.services.knowledge_retrieval_service import KnowledgeRetrievalService, RetrievedProvision

        retrieved = [RetrievedProvision(provision=mock.MagicMock(), score=0.9, passage="Every person has the right to privacy.")]
        with mock.patch.object(KnowledgeRetrievalService, "retrieve_law", return_value=retrieved), \
                mock.patch("apps.ai.views.knowledge_base_view._source", return_value={}), \
                mock.patch("apps.ai.views.knowledge_base_view.OpenAIKnowledgeProvider") as provider:
            provider.return_value.generate.return_value = ("Article 31 protects privacy [Source 1].", False)
            response = self.ask("Is privacy protected in Kenya?")
        self.assertEqual(response.data["intent"], "legal")
        self.assertEqual(provider.return_value.generate.call_args.kwargs["instructions"], PLATFORM_INSTRUCTION)
