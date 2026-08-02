from datetime import date, timedelta
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from django.core.management import call_command
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.ai.models import AIAssessmentAudit, AICaseAssessment, AIFindingFeedback, LegalProvision, LegalSourceDocument
from apps.ai.services.approved_legal_source_service import ApprovedLegalSourceService
from apps.cases.models import Case, CaseAttachment, CaseEvent, CaseTask
from apps.clients.models import Client
from apps.common.choices import UserRole
from apps.firm.models import LawFirm
from apps.staff.models import Lawyer, LawyerPermission, LawyerPermissionGrant
from apps.users.models import User


def extracted_constitution():
    chunks = ["PREAMBLE", "We the people of Kenya " + ("constitutional text " * 5000), "CHAPTER ONE — SOVEREIGNTY OF THE PEOPLE"]
    for number in range(1, 265):
        chunks.extend([f"{number}. Article heading {number}", f"(1) Verified provision text for Article {number}. " + ("rights duties state person " * 20)])
    chunks.extend(["FIRST SCHEDULE", "Counties and constitutional schedule text."])
    return "\n".join(chunks)


class ConstitutionImportTests(TestCase):
    def test_import_is_idempotent_and_preserves_article_citations(self):
        with TemporaryDirectory() as directory:
            path = Path(directory) / "constitution.pdf"
            path.write_bytes(b"%PDF-test")
            with patch("apps.ai.management.commands.import_kenyan_constitution.extract_pdf_text", return_value=extracted_constitution()):
                call_command("import_kenyan_constitution", source=str(path), verbosity=0)
                count = LegalProvision.objects.count()
                call_command("import_kenyan_constitution", source=str(path), verbosity=0)
        self.assertGreaterEqual(count, 264)
        self.assertEqual(LegalProvision.objects.count(), count)
        article_48 = LegalProvision.objects.get(stable_key="article-48")
        self.assertEqual(article_48.article_number, "48")
        self.assertEqual(article_48.document.official_url, "https://new.kenyalaw.org/akn/ke/act/2010/constitution")
        self.assertTrue(article_48.document.is_official_primary_source)

    def test_refuses_zone_identifier(self):
        with self.assertRaises(Exception):
            call_command("import_kenyan_constitution", source="bad.pdf:Zone.Identifier")


class LawyerCaseAssessmentTests(TestCase):
    def setUp(self):
        self.api = APIClient()
        self.owner = User.objects.create_user(email="ai-owner@example.com", password="pass", first_name="AI", last_name="Owner", phone_number="+254711111001", national_id_number="711111001", role=UserRole.ADMIN)
        self.firm = LawFirm.objects.create(name="AI Test Firm", registration_number="AI-TEST-1", owner=self.owner)
        self.user = User.objects.create_user(email="ai-lawyer@example.com", password="pass", first_name="Amina", last_name="Lawyer", phone_number="+254711111002", national_id_number="711111002", role=UserRole.STAFF)
        self.lawyer = Lawyer.objects.create(user=self.user, law_firm=self.firm, staff_number="AI-LAW-1", admission_number="AI-ADV-1", date_hired=date(2025, 1, 1))
        LawyerPermissionGrant.objects.create(lawyer=self.lawyer, code=LawyerPermission.USE_AI_TOOLS, granted_by=self.owner)
        self.client = Client.objects.create(firm=self.firm, created_by=self.owner, full_name="Private Client", client_type=Client.ClientType.INDIVIDUAL, lifecycle_status=Client.LifecycleStatus.OFFICIAL)
        self.case = Case.objects.create(firm=self.firm, client=self.client, created_by=self.owner, case_number="MAT-AI-001", title="Assigned criminal matter", description="Recorded facts", case_type=Case.CaseType.CRIMINAL, practice_area=Case.PracticeArea.CRIMINAL_LITIGATION, assigned_lawyer=self.lawyer)
        self.api.force_authenticate(self.user)

    def test_authentication_permission_and_tenant_isolation(self):
        anonymous = APIClient().get("/api/staff/lawyer/ai/cases/")
        self.assertEqual(anonymous.status_code, 401)
        other_owner = User.objects.create_user(email="other-owner@example.com", password="pass", first_name="Other", last_name="Owner", phone_number="+254711111003", national_id_number="711111003", role=UserRole.ADMIN)
        other_firm = LawFirm.objects.create(name="Other AI Firm", registration_number="AI-OTHER", owner=other_owner)
        other_client = Client.objects.create(firm=other_firm, created_by=other_owner, full_name="Other Confidential Client", client_type=Client.ClientType.INDIVIDUAL, lifecycle_status=Client.LifecycleStatus.OFFICIAL)
        Case.objects.create(firm=other_firm, client=other_client, case_number="OTHER-SECRET", title="Other firm secret", case_type=Case.CaseType.CIVIL)
        response = self.api.get("/api/staff/lawyer/ai/cases/")
        rendered = str(response.data)
        self.assertEqual(response.status_code, 200)
        self.assertIn("MAT-AI-001", rendered)
        self.assertNotIn("OTHER-SECRET", rendered)
        self.assertNotIn("Other Confidential Client", rendered)

    def test_priority_deadline_judgment_and_explanation(self):
        CaseEvent.objects.create(case=self.case, event_type=CaseEvent.EventType.JUDGMENT, title="Judgment", starts_at=timezone.now() + timedelta(days=2), status=CaseEvent.EventStatus.CONFIRMED)
        response = self.api.get("/api/staff/lawyer/ai/cases/")
        item = response.data["matters"][0]
        self.assertGreaterEqual(item["scores"]["time_urgency"], 80)
        self.assertIn(item["priority"], {"CRITICAL", "HIGH"})
        self.assertTrue(any("time urgency only" in reason for reason in item["priority_reasons"]))
        self.assertNotIn("adverse", " ".join(item["priority_reasons"]).lower())

    def test_generate_selected_documents_structured_history_staleness_and_audit(self):
        document = CaseAttachment.objects.create(case=self.case, attachment_type=CaseAttachment.AttachmentType.EVIDENCE, title="Selected evidence", file=SimpleUploadedFile("evidence.txt", b"facts"), uploaded_by=self.user)
        response = self.api.post(f"/api/staff/lawyer/ai/cases/{self.case.id}/", {"document_ids": [str(document.id)]}, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        assessment = response.data["assessment"]
        self.assertIn("overall_preparedness", assessment["component_scores"])
        self.assertEqual(assessment["model_version"], "structured-v1")
        self.assertEqual(assessment["retrieval_version"], "knowledge-retrieval-v1")
        self.assertEqual(assessment["scoring_version"], "preparedness-v1")
        self.assertEqual(assessment["priority_version"], "priority-v1")
        self.assertTrue(AIAssessmentAudit.objects.filter(case=self.case, actor=self.user).exists())
        CaseTask.objects.create(case=self.case, title="New filing deadline", task_type=CaseTask.TaskType.FILING_DEADLINE, due_at=timezone.now() + timedelta(days=1))
        stored = AICaseAssessment.objects.get(case=self.case)
        stored.refresh_from_db()
        self.assertTrue(stored.is_stale)
        second = self.api.post(f"/api/staff/lawyer/ai/cases/{self.case.id}/", {"document_ids": []}, format="json")
        self.assertEqual(second.data["assessment"]["version"], 2)
        detail = self.api.get(f"/api/staff/lawyer/ai/cases/{self.case.id}/")
        self.assertEqual(len(detail.data["history"]), 2)
        self.assertEqual(detail.data["assessment"]["matter"]["case_number"], "MAT-AI-001")

    def test_feedback_starts_pending_and_does_not_modify_trusted_knowledge(self):
        created = self.api.post(f"/api/staff/lawyer/ai/cases/{self.case.id}/", {"document_ids": []}, format="json")
        assessment_id = created.data["assessment"]["id"]
        before = LegalProvision.objects.count()
        response = self.api.post(
            f"/api/staff/lawyer/ai/cases/{self.case.id}/assessments/{assessment_id}/feedback/",
            {"finding_key": "recommendations.0", "rating": "INCORRECT", "correction": "Reviewer correction"},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        feedback = AIFindingFeedback.objects.get(id=response.data["id"])
        self.assertEqual(feedback.review_status, AIFindingFeedback.ReviewStatus.PENDING)
        self.assertEqual(LegalProvision.objects.count(), before)
        self.assertTrue(AICaseAssessment.objects.get(id=assessment_id).is_stale)

    def test_document_authorization_rejects_another_matter_document(self):
        second = Case.objects.create(firm=self.firm, client=self.client, case_number="MAT-AI-002", title="Other assigned matter", case_type=Case.CaseType.CIVIL, assigned_lawyer=self.lawyer)
        document = CaseAttachment.objects.create(case=second, title="Other matter private document", file=SimpleUploadedFile("other.txt", b"private"))
        response = self.api.post(f"/api/staff/lawyer/ai/cases/{self.case.id}/", {"document_ids": [str(document.id)]}, format="json")
        self.assertEqual(response.status_code, 403)

    def test_priority_sorting_and_filtering(self):
        CaseTask.objects.create(case=self.case, title="Overdue", due_at=timezone.now() - timedelta(days=1), status=CaseTask.TaskStatus.OVERDUE)
        low = Case.objects.create(firm=self.firm, client=self.client, case_number="MAT-AI-LOW", title="Low matter", case_type=Case.CaseType.CIVIL, assigned_lawyer=self.lawyer)
        response = self.api.get("/api/staff/lawyer/ai/cases/?sort=priority")
        self.assertEqual(response.data["matters"][0]["id"], str(self.case.id))
        filtered = self.api.get("/api/staff/lawyer/ai/cases/?immediate=true")
        self.assertNotIn(str(low.id), {item["id"] for item in filtered.data["matters"]})

    def test_comparable_output_is_anonymized_and_warns_for_small_sample(self):
        response = self.api.post(f"/api/staff/lawyer/ai/cases/{self.case.id}/", {"document_ids": []}, format="json")
        comparable = response.data["assessment"]["comparable_matters"]
        self.assertTrue(comparable["anonymized"])
        self.assertIn("too small", " ".join(comparable["limitations"]).lower())
        self.assertNotIn("Private Client", str(comparable))

    def test_approved_domain_and_local_citation_verification(self):
        with self.assertRaises(ValueError):
            ApprovedLegalSourceService.validate_url("https://example.com/fake-case")
        source = LegalSourceDocument.objects.create(title="Verified decision", slug="verified-decision", source_type=LegalSourceDocument.SourceType.DECISION, official_url="https://new.kenyalaw.org/example", source_checksum="x", is_published=True)
        self.assertTrue(ApprovedLegalSourceService.citation_exists_locally(title=source.title, url=source.official_url))
