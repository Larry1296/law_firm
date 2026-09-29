from datetime import date, timedelta
from unittest.mock import patch

from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.ai.models import AssistantUsage
from apps.ai.services.llm_provider import AIProviderUnavailable, ProviderChoice, _parse_json, complete_json, configured_provider
from apps.cases.models import Case, CaseEvent, CaseNote, CaseTask
from apps.clients.models import Client
from apps.common.choices import UserRole
from apps.firm.models import LawFirm
from apps.staff.models import Lawyer, LawyerPermission, LawyerPermissionGrant
from apps.users.models import User

NO_PROVIDER = {"AI_PROVIDER": "auto", "ANTHROPIC_API_KEY": "", "OPENAI_API_KEY": ""}
CLAUDE_AND_OPENAI = {
    "AI_PROVIDER": "auto", "AI_FALLBACK_ENABLED": True,
    "ANTHROPIC_API_KEY": "secret-anthropic-key", "ANTHROPIC_MODEL": "claude-sonnet-5-5",
    "OPENAI_API_KEY": "secret-openai-key", "OPENAI_MODEL": "gpt-5.4-mini",
}


def person(email, role, phone):
    return User.objects.create_user(
        email=email, password="Strong-pass-123", first_name=email.split("@")[0].title(), last_name="Test",
        phone_number=phone, national_id_number=phone[-9:], role=role,
    )


class ProviderSelectionTests(TestCase):
    @override_settings(AI_PROVIDER="auto", ANTHROPIC_API_KEY="a", ANTHROPIC_MODEL="claude-sonnet-5-5", OPENAI_API_KEY="o", OPENAI_MODEL="gpt")
    def test_auto_prefers_claude_and_an_explicit_choice_wins(self):
        self.assertEqual(configured_provider(), ProviderChoice("anthropic", "claude-sonnet-5-5"))
        with self.settings(AI_PROVIDER="openai"):
            self.assertEqual(configured_provider(), ProviderChoice("openai", "gpt"))

    @override_settings(AI_PROVIDER="auto", ANTHROPIC_API_KEY="", OPENAI_API_KEY="o", OPENAI_MODEL="gpt")
    def test_auto_falls_back_to_whichever_is_configured(self):
        self.assertEqual(configured_provider().name, "openai")
        with self.settings(OPENAI_API_KEY=""):
            self.assertIsNone(configured_provider())

    @override_settings(**CLAUDE_AND_OPENAI)
    def test_claude_answers_first(self):
        with patch("apps.ai.services.llm_provider._anthropic_text", return_value='{"answer": "From Claude"}') as claude, \
                patch("apps.ai.services.llm_provider._openai_text") as openai:
            payload, choice = complete_json("rules", "question")
        self.assertEqual((payload["answer"], choice.name), ("From Claude", "anthropic"))
        self.assertEqual(claude.call_args.args[3], 800)
        openai.assert_not_called()

    @override_settings(**CLAUDE_AND_OPENAI)
    def test_openai_takes_over_when_claude_fails_and_the_key_is_never_logged(self):
        failures = (RuntimeError("secret-anthropic-key rejected"), TimeoutError(), '{"no answer JSON"')
        for failure in failures:
            claude_result = {"return_value": failure} if isinstance(failure, str) else {"side_effect": failure}
            with self.subTest(failure=type(failure).__name__), \
                    patch("apps.ai.services.llm_provider._anthropic_text", **claude_result), \
                    patch("apps.ai.services.llm_provider._openai_text", return_value='{"answer": "From OpenAI"}'), \
                    self.assertLogs("apps.ai.services.llm_provider", level="WARNING") as logs:
                payload, choice = complete_json("rules", "question")
            self.assertEqual((payload["answer"], choice), ("From OpenAI", ProviderChoice("openai", "gpt-5.4-mini")))
            self.assertNotIn("secret-anthropic-key", " ".join(logs.output))

    @override_settings(**{**CLAUDE_AND_OPENAI, "ANTHROPIC_API_KEY": ""})
    def test_a_missing_claude_key_goes_straight_to_openai(self):
        with patch("apps.ai.services.llm_provider._anthropic_text") as claude, \
                patch("apps.ai.services.llm_provider._openai_text", return_value='{"answer": "From OpenAI"}'):
            self.assertEqual(complete_json("rules", "question")[1].name, "openai")
        claude.assert_not_called()

    @override_settings(**CLAUDE_AND_OPENAI)
    def test_when_both_fail_or_fallback_is_off_the_caller_is_told(self):
        with patch("apps.ai.services.llm_provider._anthropic_text", side_effect=RuntimeError), \
                patch("apps.ai.services.llm_provider._openai_text", side_effect=RuntimeError) as openai:
            with self.assertRaises(AIProviderUnavailable):
                complete_json("rules", "question")
            with self.settings(AI_FALLBACK_ENABLED=False), self.assertRaises(AIProviderUnavailable):
                openai.reset_mock()
                complete_json("rules", "question")
            openai.assert_not_called()

    def test_json_is_read_even_inside_a_code_fence(self):
        self.assertEqual(_parse_json('```json\n{"answer": "Hi"}\n```'), {"answer": "Hi"})
        self.assertEqual(_parse_json('Sure: {"answer": "Hi"}'), {"answer": "Hi"})


class DashboardAssistantTests(TestCase):
    def setUp(self):
        self.owner = person("owner@assist.test", UserRole.ADMIN, "+254755100001")
        self.firm = LawFirm.objects.create(name="Assist Firm Advocates", registration_number="AS-1", owner=self.owner)
        self.advocate_user = person("advocate@assist.test", UserRole.STAFF, "+254755100002")
        self.advocate = Lawyer.objects.create(
            user=self.advocate_user, law_firm=self.firm, staff_number="A-1", admission_number="P.105/1/20", date_hired=date(2020, 1, 1),
        )
        LawyerPermissionGrant.objects.create(lawyer=self.advocate, code=LawyerPermission.USE_AI_TOOLS, granted_by=self.owner)
        self.colleague_user = person("colleague@assist.test", UserRole.STAFF, "+254755100003")
        self.colleague = Lawyer.objects.create(
            user=self.colleague_user, law_firm=self.firm, staff_number="A-2", admission_number="P.105/2/20", date_hired=date(2020, 1, 1),
        )
        self.client_user = person("client@assist.test", UserRole.OFFICIAL_CLIENT, "+254755100004")
        self.client_record = self.make_client(self.client_user, "Wanjiru Traders Ltd")
        self.case = self.make_case(self.client_record, "MAT-AS-001", "Wanjiru Traders Ltd v Debtor Ltd", self.advocate)
        self.hearing = CaseEvent.objects.create(
            case=self.case, event_type=CaseEvent.EventType.HEARING, title="Hearing",
            starts_at=timezone.now() + timedelta(days=3), court_station="Milimani Commercial Courts",
            hearing_mode=CaseEvent.HearingMode.PHYSICAL, is_client_visible=True, created_by=self.owner,
        )
        CaseEvent.objects.create(
            case=self.case, event_type=CaseEvent.EventType.HEARING, title="Internal strategy meeting",
            starts_at=timezone.now() + timedelta(days=2), hearing_mode=CaseEvent.HearingMode.PHYSICAL,
            is_client_visible=False, created_by=self.owner,
        )
        CaseNote.objects.create(case=self.case, title="Update", body="Your hearing is on track.", is_client_visible=True, created_by=self.owner)
        CaseNote.objects.create(case=self.case, title="Strategy", body="INTERNAL: settle below 2M if pressed.", is_client_visible=False, created_by=self.owner)
        CaseTask.objects.create(case=self.case, title="Send the signed supply contract", is_client_visible=True, created_by=self.owner)

        other_client_user = person("other-client@assist.test", UserRole.OFFICIAL_CLIENT, "+254755100005")
        self.other_client = self.make_client(other_client_user, "Kamau Holdings")
        self.other_case = self.make_case(self.other_client, "MAT-AS-002", "Kamau Holdings v Bank", self.colleague)

        self.platform_user = User.objects.create_platform_admin(
            email="ops@assist.test", password="Strong-pass-123", first_name="Ops", last_name="Admin",
            phone_number="PA-ASSIST1", national_id_number="PA-ASSIST1",
        )
        self.api = APIClient()

    def make_client(self, user, name):
        return Client.objects.create(
            firm=self.firm, user=user, created_by=self.owner, full_name=name,
            client_type=Client.ClientType.COMPANY, lifecycle_status=Client.LifecycleStatus.OFFICIAL_CLIENT,
        )

    def make_case(self, client, number, title, lawyer):
        return Case.objects.create(
            firm=self.firm, client=client, created_by=self.owner, case_number=number, title=title,
            case_type=Case.CaseType.DEBT_RECOVERY, court_type=Case.CourtType.MAGISTRATE,
            court_stage=Case.CourtStage.AWAITING_HEARING, matter_status=Case.MatterStatus.MATTER_OPEN,
            assigned_lawyer=lawyer,
        )

    def ask(self, user, kind, question="What is coming up?"):
        """Ask with a stand-in model and return (response, the prompt the model was sent)."""
        sent = {}

        def fake_model(instructions, prompt, max_tokens):
            sent["instructions"], sent["prompt"] = instructions, prompt
            return {"answer": "A helpful answer."}, ProviderChoice("anthropic", "claude-sonnet-5-5")

        self.api.force_authenticate(user)
        with patch("apps.ai.assistants.base.complete_json", side_effect=fake_model):
            response = self.api.post(f"/api/assistant/{kind}/", {"question": question}, format="json")
        return response, sent.get("prompt", "")

    # ------------------------------------------------------------------ client
    def test_client_assistant_sees_only_what_the_firm_shares_with_that_client(self):
        response, prompt = self.ask(self.client_user, "client")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["answer"], "A helpful answer.")
        self.assertIn("Wanjiru Traders Ltd v Debtor Ltd", prompt)
        self.assertIn("Milimani Commercial Courts", prompt)
        self.assertIn("Your hearing is on track.", prompt)
        self.assertIn("Send the signed supply contract", prompt)
        self.assertIn("how_to_prepare", prompt)
        for private in ("Kamau Holdings", "MAT-AS-002", "Internal strategy meeting", "settle below 2M", "Colleague"):
            self.assertNotIn(private, prompt)

    def test_only_clients_with_portal_access_can_use_the_client_assistant(self):
        self.api.force_authenticate(self.advocate_user)
        self.assertFalse(self.api.get("/api/assistant/client/").data["available"])
        self.assertEqual(self.api.post("/api/assistant/client/", {"question": "hi"}, format="json").status_code, 403)

    # ------------------------------------------------------------------ advocate
    def test_advocate_assistant_covers_only_their_assigned_matters(self):
        response, prompt = self.ask(self.advocate_user, "advocate")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertIn("MAT-AS-001", prompt)
        self.assertIn("readiness_percent", prompt)
        self.assertIn("Internal strategy meeting", prompt)
        self.assertNotIn("MAT-AS-002", prompt)
        self.assertNotIn("Kamau Holdings", prompt)
        self.assertIn('"view_billing": false', prompt)
        self.assertNotIn("unpaid_fee_notes", prompt)

    def test_advocate_assistant_needs_the_ai_tools_permission(self):
        self.api.force_authenticate(self.colleague_user)
        described = self.api.get("/api/assistant/advocate/").data
        self.assertFalse(described["available"])
        self.assertIn("Use AI Tools", described["reason"])
        self.assertEqual(self.api.post("/api/assistant/advocate/", {"question": "hi"}, format="json").status_code, 403)

    def test_legal_sources_only_with_the_research_permission(self):
        with patch("apps.ai.assistants.staff.KnowledgeRetrievalService.retrieve_law", return_value=[]) as retrieve:
            self.ask(self.advocate_user, "advocate", "What does the law say about debt recovery?")
            retrieve.assert_not_called()
            LawyerPermissionGrant.objects.create(lawyer=self.advocate, code=LawyerPermission.USE_LEGAL_RESEARCH, granted_by=self.owner)
            self.ask(self.advocate_user, "advocate", "What does the law say about debt recovery?")
            retrieve.assert_called_once()

    # ------------------------------------------------------------------ firm owner
    def test_firm_assistant_sees_every_matter_but_only_for_the_owner(self):
        response, prompt = self.ask(self.owner, "firm")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertIn("MAT-AS-001", prompt)
        self.assertIn("MAT-AS-002", prompt)
        self.assertIn("workload_by_advocate", prompt)
        self.api.force_authenticate(self.advocate_user)
        self.assertFalse(self.api.get("/api/assistant/firm/").data["available"])

    # ------------------------------------------------------------------ platform
    def test_platform_assistant_is_never_given_a_particular_firm(self):
        response, prompt = self.ask(self.platform_user, "platform", "How is Assist Firm Advocates doing?")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertIn("platform_totals", prompt)
        self.assertIn("CONSOLE_GUIDE", prompt)
        for private in ("owner@assist.test", "Wanjiru", "MAT-AS-001", "Owner Test"):
            self.assertNotIn(private, prompt)
        # The firm's name appears only because the administrator typed it in the question.
        self.assertEqual(prompt.count("Assist Firm Advocates"), 1)
        self.api.force_authenticate(self.owner)
        self.assertFalse(self.api.get("/api/assistant/platform/").data["available"])

    # ------------------------------------------------------------------ no AI service
    @override_settings(**NO_PROVIDER)
    def test_without_an_ai_service_each_assistant_answers_from_the_records(self):
        self.api.force_authenticate(self.client_user)
        response = self.api.post("/api/assistant/client/", {"question": "When is my next court date?"}, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertTrue(response.data["records_only"])
        self.assertIn("Milimani Commercial Courts", response.data["answer"])
        self.assertIn("Send the signed supply contract", response.data["answer"])

        usage = AssistantUsage.objects.get()
        self.assertEqual(usage.outcome, AssistantUsage.Outcome.RECORDS_ONLY)
        self.assertEqual(usage.firm, self.firm)
        stored = " ".join(str(getattr(usage, field.name)) for field in AssistantUsage._meta.concrete_fields)
        self.assertNotIn("court date", stored)

        self.api.force_authenticate(self.advocate_user)
        answer = self.api.post("/api/assistant/advocate/", {"question": "Anything due?"}, format="json").data["answer"]
        self.assertIn("MAT-AS-001", answer)
        self.assertIn("readiness", answer)

    @override_settings(**CLAUDE_AND_OPENAI)
    def test_the_endpoint_answers_through_openai_when_claude_is_down(self):
        self.api.force_authenticate(self.client_user)
        with patch("apps.ai.services.llm_provider._anthropic_text", side_effect=TimeoutError), \
                patch("apps.ai.services.llm_provider._openai_text", return_value='{"answer": "Your hearing is on Friday."}'):
            response = self.api.post("/api/assistant/client/", {"question": "When is my hearing?"}, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual((response.data["answer"], response.data["provider"]), ("Your hearing is on Friday.", "openai"))
        self.assertFalse(response.data["records_only"])
        self.assertEqual(AssistantUsage.objects.get().provider, "openai")

    def test_unknown_assistant_is_not_found(self):
        self.api.force_authenticate(self.owner)
        self.assertEqual(self.api.get("/api/assistant/everything/").status_code, 404)
