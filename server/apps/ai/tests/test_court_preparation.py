from datetime import date, timedelta
from unittest.mock import patch

from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.ai.models import CourtPreparationBrief
from apps.ai.services.court_preparation_llm import CourtPreparationLLM, PreparationProviderUnavailable
from apps.ai.services.court_preparation_service import CourtPreparationService
from apps.ai.services.public_firm_answer_service import PublicFirmAnswerService
from apps.cases.models import Case, CaseEvent, CaseFiling, CaseParty
from apps.clients.models import Client
from apps.common.choices import UserRole
from apps.firm.models import LawFirm
from apps.notifications.models import Notification
from apps.staff.models import Lawyer, LawyerPermission, LawyerPermissionGrant, Secretary
from apps.users.models import User


def person(email, role, phone):
    return User.objects.create_user(
        email=email, password="Strong-pass-123", first_name="Test", last_name="Person",
        phone_number=phone, national_id_number=phone[-9:], role=role,
    )


class CourtPreparationTests(TestCase):
    def setUp(self):
        self.owner = person("owner@prep.test", UserRole.ADMIN, "+254744100001")
        self.firm = LawFirm.objects.create(name="Prep Firm", registration_number="PREP-1", owner=self.owner)
        self.advocate_user = person("advocate@prep.test", UserRole.STAFF, "+254744100002")
        self.advocate = Lawyer.objects.create(
            user=self.advocate_user, law_firm=self.firm, staff_number="P-1", admission_number="P.105/9/20", date_hired=date(2020, 1, 1),
        )
        LawyerPermissionGrant.objects.create(lawyer=self.advocate, code=LawyerPermission.USE_AI_TOOLS, granted_by=self.owner)
        self.other_user = person("other@prep.test", UserRole.STAFF, "+254744100003")
        Lawyer.objects.create(user=self.other_user, law_firm=self.firm, staff_number="P-2", admission_number="P.105/8/20", date_hired=date(2020, 1, 1))
        self.secretary_user = person("secretary@prep.test", UserRole.STAFF, "+254744100004")
        self.secretary = Secretary.objects.create(user=self.secretary_user, law_firm=self.firm, staff_number="P-3", date_hired=date(2021, 1, 1))
        self.client_user = person("client@prep.test", UserRole.OFFICIAL_CLIENT, "+254744100005")
        self.client_record = Client.objects.create(
            firm=self.firm, user=self.client_user, created_by=self.owner, full_name="Wanjiru Traders Ltd",
            client_type=Client.ClientType.COMPANY, lifecycle_status=Client.LifecycleStatus.OFFICIAL_CLIENT,
        )
        self.case = Case.objects.create(
            firm=self.firm, client=self.client_record, created_by=self.owner, case_number="MAT-PREP-001",
            title="Wanjiru Traders Ltd v Debtor Ltd", case_type=Case.CaseType.DEBT_RECOVERY,
            court_type=Case.CourtType.MAGISTRATE, court_stage=Case.CourtStage.AWAITING_HEARING,
            official_court_case_number="MCCOMMSU/E77/2026", matter_status=Case.MatterStatus.MATTER_OPEN,
            assigned_lawyer=self.advocate, assigned_secretary=self.secretary,
        )
        CaseParty.objects.create(case=self.case, name="Wanjiru Traders Ltd", party_role="PLAINTIFF", is_our_client=True)
        self.hearing = CaseEvent.objects.create(
            case=self.case, event_type=CaseEvent.EventType.HEARING, title="Hearing",
            starts_at=timezone.now() + timedelta(days=3), court_station="Milimani Commercial Courts",
            hearing_mode=CaseEvent.HearingMode.PHYSICAL, is_client_visible=True, created_by=self.owner,
        )
        self.api = APIClient()

    def get(self, user, url):
        self.api.force_authenticate(user)
        return self.api.get(url)

    def test_advocate_sees_readiness_checklist_and_likely_questions_for_their_sittings(self):
        response = self.get(self.advocate_user, "/api/staff/lawyer/ai/court-preparation/")
        self.assertEqual(response.status_code, 200, response.data)
        [sitting] = response.data["sittings"]
        brief = sitting["brief"]
        checks = {item["key"]: item["passed"] for item in brief["checks"]}
        self.assertFalse(checks["witness_statements"])
        self.assertTrue(checks["client_informed"])
        self.assertLess(brief["readiness"], 100)
        self.assertTrue(brief["guidance"]["anticipated_questions"])
        self.assertIn("Your Honour", brief["guidance"]["form_of_address"])
        self.assertIn("not legal advice", brief["guidance"]["disclaimer"])

    def test_readiness_rises_and_a_new_version_is_kept_when_the_record_changes(self):
        first = CourtPreparationService.current(self.hearing, CourtPreparationBrief.Audience.ADVOCATE)
        for filing_type in (CaseFiling.FilingType.WITNESS_STATEMENT, CaseFiling.FilingType.LIST_OF_DOCUMENTS):
            CaseFiling.objects.create(case=self.case, filing_type=filing_type, status=CaseFiling.FilingStatus.FILED, title=filing_type)
        second = CourtPreparationService.current(self.hearing, CourtPreparationBrief.Audience.ADVOCATE)
        self.assertEqual(second.version, first.version + 1)
        self.assertGreater(second.readiness, first.readiness)
        first.refresh_from_db()
        self.assertFalse(first.is_current)

    def test_secretaries_unassigned_advocates_and_advocates_without_ai_permission_get_nothing(self):
        self.assertEqual(self.get(self.secretary_user, "/api/staff/lawyer/ai/court-preparation/").status_code, 403)
        LawyerPermissionGrant.objects.create(lawyer=self.other_user.lawyer_profile, code=LawyerPermission.USE_AI_TOOLS, granted_by=self.owner)
        self.assertEqual(self.get(self.other_user, "/api/staff/lawyer/ai/court-preparation/").data["sittings"], [])
        LawyerPermissionGrant.objects.filter(lawyer=self.advocate).update(is_active=False)
        self.assertEqual(self.get(self.advocate_user, "/api/staff/lawyer/ai/court-preparation/").status_code, 403)

    def test_client_gets_plain_guidance_without_the_advocates_strategy(self):
        response = self.get(self.client_user, "/api/client/court-preparation/")
        self.assertEqual(response.status_code, 200, response.data)
        [sitting] = response.data["sittings"]
        guidance = sitting["brief"]["guidance"]
        self.assertIn("Tell the truth", " ".join(guidance["if_you_give_evidence"]))
        self.assertNotIn("anticipated_questions", guidance)
        self.assertNotIn("checklist", guidance)
        self.assertEqual(sitting["brief"]["tailored"], {})
        self.assertEqual(self.get(self.secretary_user, "/api/client/court-preparation/").status_code, 403)

    def test_hidden_sittings_are_not_shown_to_the_client(self):
        self.hearing.is_client_visible = False
        self.hearing.save(update_fields=["is_client_visible", "updated_at"])
        self.assertEqual(self.get(self.client_user, "/api/client/court-preparation/").data["sittings"], [])

    def test_daily_run_notifies_advocate_and_client_but_not_the_secretary_once(self):
        self.assertEqual(CourtPreparationService.process_due(), 2)
        self.assertEqual(CourtPreparationService.process_due(), 0)
        recipients = set(Notification.objects.filter(notification_type="COURT_PREPARATION").values_list("recipient__email", flat=True))
        self.assertEqual(recipients, {"advocate@prep.test", "client@prep.test"})
        advocate_note = Notification.objects.get(recipient=self.advocate_user, notification_type="COURT_PREPARATION")
        self.assertIn("in 3 days", advocate_note.title)
        self.assertIn("readiness", advocate_note.message)

    def test_tailoring_sends_no_names_and_only_validated_fields_are_kept(self):
        checks = CourtPreparationService.advocate_checks(self.hearing)
        context = CourtPreparationService.minimised_context(self.hearing, checks)
        self.assertNotIn("Wanjiru", str(context))
        self.assertNotIn("MCCOMMSU", str(context))
        self.assertEqual(context["our_client_is"], "PLAINTIFF")

        cleaned = CourtPreparationLLM.validate({
            "focus": "Prove delivery.",
            "anticipated_questions": [{"from": "Judge", "question": "Who signed the delivery notes?", "prepare": "Name from the record."}] * 9 + ["junk"],
            "risks": ["Unsigned note."],
            "ignore": "extra",
        })
        self.assertEqual(len(cleaned["anticipated_questions"]), 6)
        self.assertEqual(cleaned["anticipated_questions"][0]["from"], "Court")
        self.assertNotIn("ignore", cleaned)

    @override_settings(AI_PREPARATION_LLM_ENABLED=True, AI_PROVIDER="openai", OPENAI_API_KEY="test", OPENAI_MODEL="test-model")
    def test_enabled_tailoring_is_stored_and_a_provider_failure_falls_back_to_structured_guidance(self):
        tailored = {"focus": "Prove delivery.", "anticipated_questions": [], "risks": [], "label": "AI draft"}
        with patch.object(CourtPreparationLLM, "tailor", return_value=tailored):
            brief = CourtPreparationService.generate(self.hearing, CourtPreparationBrief.Audience.ADVOCATE)
        self.assertEqual(brief.tailored["focus"], "Prove delivery.")
        self.assertEqual(brief.provider, "openai")
        with patch.object(CourtPreparationLLM, "tailor", side_effect=PreparationProviderUnavailable("network")):
            brief = CourtPreparationService.generate(self.hearing, CourtPreparationBrief.Audience.ADVOCATE)
        self.assertEqual(brief.tailored, {})
        self.assertEqual(brief.provider, "structured")


class PublicGettingStartedTests(TestCase):
    def test_getting_started_questions_explain_the_intake_process(self):
        for question in ("How do I become a client?", "What should I bring to open a case?", "How do I hire a lawyer from your firm?"):
            with self.subTest(question=question):
                self.assertEqual(PublicFirmAnswerService.classify(question), "getting_started")
        answer = PublicFirmAnswerService.compose("Mwangi & Co. Advocates", "getting_started", [])
        self.assertIn("Conflict check", answer)
        self.assertIn("CR12", answer)
        self.assertIn("advocate-client relationship", answer)

    def test_portal_questions_explain_invitation_access(self):
        self.assertEqual(PublicFirmAnswerService.classify("How do I log in to the client portal?"), "portal")
        self.assertIn("by invitation", PublicFirmAnswerService.compose("Mwangi & Co. Advocates", "portal", []))

    def test_efiling_portal_and_password_questions_are_not_misrouted(self):
        self.assertNotEqual(PublicFirmAnswerService.classify("How does the Judiciary e-filing portal work?"), "portal")
        self.assertEqual(PublicFirmAnswerService.classify("What is my password?"), "sensitive")


class ConstitutionRetrievalTests(TestCase):
    """The public assistant must find the Article that answers the question, not the longest passage."""

    def setUp(self):
        from apps.ai.models import LegalProvision, LegalSourceDocument

        document = LegalSourceDocument.objects.create(
            title="Constitution of Kenya, 2010", slug="constitution-retrieval-test",
            source_type=LegalSourceDocument.SourceType.CONSTITUTION,
            official_url="https://new.kenyalaw.org/akn/ke/act/2010/constitution",
            source_checksum="retrieval-test", is_published=True,
        )
        provisions = [
            ("preamble", "", "Preamble", "We, the people of Kenya, acknowledging the supremacy of the Almighty God, proud of our diversity, committed to nurturing and protecting the well-being of the individual, the family, communities and the nation, recognising the aspirations of all Kenyans for a government based on the essential values of human rights, equality, freedom, democracy, social justice and the rule of law, exercising our sovereign right, adopt this Constitution for ourselves and our future generations. Every person, the President and the courts."),
            ("article-31", "31", "Privacy", "Every person has the right to privacy, which includes the right not to have information relating to their family or private affairs unnecessarily required or revealed."),
            ("article-49", "49", "Rights of arrested persons", "An arrested person has the right to be informed promptly of the reason for the arrest, to remain silent, to be brought before a court within twenty-four hours, and to be released on bond or bail on reasonable conditions."),
            ("article-138", "138", "Procedure at presidential election", "A candidate is elected President if the candidate receives more than half of all the votes cast in the election."),
        ]
        for order, (key, number, heading, text) in enumerate(provisions):
            LegalProvision.objects.create(
                document=document, stable_key=key, article_number=number, heading=heading, text=text,
                checksum=key, display_order=order, is_published=True,
            )

    def top(self, question):
        from apps.ai.services.knowledge_retrieval_service import ProvisionIndex

        results = ProvisionIndex.current().rank(question)
        return results[0][0].article_number if results else None

    def test_plain_questions_find_the_answering_article(self):
        self.assertEqual(self.top("What rights does an arrested person have?"), "49")
        self.assertEqual(self.top("Can I be denied bail?"), "49")
        self.assertEqual(self.top("How is the President elected?"), "138")
        self.assertEqual(self.top("What principles apply to personal data in Kenya?"), "31")

    def test_scores_stay_between_zero_and_one(self):
        from apps.ai.services.knowledge_retrieval_service import ProvisionIndex

        scores = [score for _, score in ProvisionIndex.current().rank("arrested person bail court")]
        self.assertTrue(scores and all(0 < score <= 1 for score in scores))


class StatuteImportTests(TestCase):
    SAMPLE = (
        '<section class="akn-part" id="part_IV"><h2>Part IV – PRINCIPLES</h2>'
        '<section class="akn-section" id="part_IV__sec_25" data-eid="part_IV__sec_25"><h3>25. Principles of data protection</h3>'
        '<span class="akn-intro"><span class="akn-p">Every data controller shall ensure that personal data is—</span></span>'
        '<section class="akn-paragraph"><span class="akn-num">(a)</span><span class="akn-content"><span class="akn-p">processed lawfully;</span></span></section>'
        '<h3 class="akn-crossHeading">Rights of data subjects</h3></section>'
        '<section class="akn-section" id="part_IV__sec_26" data-eid="part_IV__sec_26"><h3>26. <span class="akn-remark">[Repealed]</span></h3></section>'
        '</section>'
    )

    def test_sections_keep_number_heading_part_and_list_layout_and_skip_repealed(self):
        from apps.ai.services.statute_import_service import parse_statute

        [section] = parse_statute(self.SAMPLE)
        self.assertEqual((section.number, section.heading), ("25", "Principles of data protection"))
        self.assertEqual(section.part, "Part IV – PRINCIPLES")
        self.assertEqual(section.text, "Every data controller shall ensure that personal data is—\n(a) processed lawfully;")

    def test_statute_sections_are_cited_as_sections_and_never_answer_article_questions(self):
        from apps.ai.models import LegalProvision, LegalSourceDocument
        from apps.ai.services.knowledge_retrieval_service import KnowledgeRetrievalService

        owner = person("owner@statute.test", UserRole.ADMIN, "+254744200001")
        firm = LawFirm.objects.create(name="Statute Firm", registration_number="STAT-1", owner=owner)
        act = LegalSourceDocument.objects.create(
            title="Data Protection Act, 2019", slug="dpa-test", source_type=LegalSourceDocument.SourceType.STATUTE,
            official_url="https://new.kenyalaw.org/akn/ke/act/2019/24/eng@2022-12-31", source_checksum="dpa", is_published=True,
        )
        section = LegalProvision.objects.create(
            document=act, stable_key="sec_48", unit_type=LegalProvision.UnitType.SECTION, article_number="48",
            heading="Conditions for transfer out of Kenya", text="A data controller may transfer personal data to another country only on proof of adequate safeguards.",
            checksum="s48", is_published=True,
        )
        self.assertEqual(section.citation, "Section 48 — Conditions for transfer out of Kenya")
        results = KnowledgeRetrievalService.retrieve("What does Article 48 say?", firm=firm)
        self.assertFalse(any(getattr(item, "provision", None) == section and item.score == 1.0 for item in results))


class CourtProcessGuideTests(TestCase):
    def setUp(self):
        from django.core.cache import cache

        cache.clear()
        self.owner = person("owner@guide.test", UserRole.ADMIN, "+254744300001")
        self.firm = LawFirm.objects.create(name="Guide Firm", registration_number="GUIDE-1", owner=self.owner)

    def ask(self, question, history=None):
        from apps.ai.services.court_process_guide_service import CourtProcessGuideService

        return CourtProcessGuideService.answer(question, history or [], self.firm)

    def test_overview_lists_every_step_and_invites_a_follow_up(self):
        from apps.ai.services.court_process_guide import STEPS

        for question in ("What are the steps in a court case?", "How do I sue someone?", "How does a court case work in Kenya?"):
            with self.subTest(question=question):
                answer, step = self.ask(question)
                self.assertEqual(step, 0)
                self.assertEqual(answer.count("\n- **"), len(STEPS))
                self.assertIn("Tell me more about step 5", answer)

    def test_a_single_step_is_explained_in_full(self):
        for question, number in (
            ("Tell me more about step 5", 5), ("Explain the fifth step", 5), ("What happens at the hearing?", 10),
            ("How does service of summons work?", 5), ("What is a default judgment?", 7), ("How do I appeal?", 15),
            ("How is a judgment enforced if they are not paying?", 14),
        ):
            with self.subTest(question=question):
                answer, step = self.ask(question)
                self.assertEqual(step, number)
                self.assertTrue(answer.startswith(f"**Step {number} of 15:"))
                self.assertGreaterEqual(answer.count("\n- "), 3)

    def test_follow_ups_use_the_conversation(self):
        overview, _ = self.ask("What are the steps in a court case?")
        history = [{"role": "user", "content": "What are the steps in a court case?"}, {"role": "assistant", "content": overview[:1500]}]
        answer, step = self.ask("7", history)
        self.assertEqual(step, 7)
        history += [{"role": "user", "content": "7"}, {"role": "assistant", "content": answer[:1500]}]
        self.assertEqual(self.ask("next step", history)[1], 8)
        self.assertEqual(self.ask("go back", history)[1], 6)

    def test_questions_citing_a_law_or_unrelated_questions_are_left_to_the_law_search(self):
        self.assertIsNone(self.ask("What does Article 50 say about a fair hearing?"))
        self.assertIsNone(self.ask("What are your office hours?"))
        self.assertIsNone(self.ask("7"))

    def test_the_firms_published_wording_replaces_the_built_in_text(self):
        from apps.ai.models import KnowledgeBaseArticle, KnowledgeBaseCategory
        from apps.ai.services.court_process_guide import STEPS
        from apps.ai.services.court_process_guide_service import CourtProcessGuideService

        category = KnowledgeBaseCategory.objects.create(name="Court process test", slug="court-process-test")
        KnowledgeBaseArticle.objects.create(
            firm=self.firm, category=category, slug=CourtProcessGuideService.article_slug(self.firm, STEPS[9]),
            title="Step 10", body="Our advocates prepare every witness in person the week before trial.",
            source_name="Guide Firm", is_published=True, approval_status=KnowledgeBaseArticle.ApprovalStatus.PUBLISHED,
            approved_by=self.owner, approved_at=timezone.now(), published_at=timezone.now() - timedelta(minutes=1),
        )
        answer, _ = self.ask("What happens at the hearing?")
        self.assertIn("prepare every witness in person", answer)

    @override_settings(PUBLIC_FIRM_ID="")
    def test_public_chat_round_trip_with_history_from_the_page(self):
        with self.settings(PUBLIC_FIRM_ID=str(self.firm.id)):
            api = APIClient()
            first = api.post("/api/knowledge-base/ask/", {"question": "What are the steps in a court case?"}, format="json")
            self.assertEqual(first.status_code, 200, first.data)
            self.assertEqual(first.data["intent"], "court_process")
            history = [
                {"role": "user", "content": "What are the steps in a court case?"},
                {"role": "assistant", "content": first.data["answer"][:1500]},
            ]
            second = api.post("/api/knowledge-base/ask/", {"question": "tell me more about step 10", "history": history}, format="json")
            self.assertEqual(second.status_code, 200, second.data)
            self.assertEqual(second.data["step"], 10)
            self.assertIn("cross-examination", second.data["answer"])
