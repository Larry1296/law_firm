from datetime import date

from django.test import TestCase

from apps.ai.models import (
    KnowledgeBaseArticle, KnowledgeBaseCategory, KnowledgeIndexEntry,
    PublicFirmKnowledgePolicy,
)
from apps.common.choices import UserRole
from apps.firm.models import FirmSetting, LawFirm, PracticeArea
from apps.users.models import User


class KnowledgeIndexTests(TestCase):
    def setUp(self):
        self.category = KnowledgeBaseCategory.objects.create(name="Index test", slug="index-test")

    def test_only_published_content_is_active_and_updates_are_versioned(self):
        article = KnowledgeBaseArticle.objects.create(
            title="Reviewed source", slug="reviewed-source", category=self.category,
            body="Version one", source_name="Official", last_verified_at=date(2026, 8, 2),
            is_published=False,
        )
        index = KnowledgeIndexEntry.objects.get(source_id=article.id)
        self.assertEqual(index.status, KnowledgeIndexEntry.Status.WITHDRAWN)
        article.is_published = True
        article.save()
        index.refresh_from_db()
        self.assertEqual(index.status, KnowledgeIndexEntry.Status.INDEXED)
        article.body = "Version two"
        article.save()
        index.refresh_from_db()
        self.assertEqual(index.source_version, 2)
        article.is_published = False
        article.save()
        index.refresh_from_db()
        self.assertEqual(index.status, KnowledgeIndexEntry.Status.WITHDRAWN)

    def test_public_question_logs_never_enter_the_index(self):
        source_kinds = set(KnowledgeIndexEntry.objects.values_list("source_kind", flat=True))
        self.assertNotIn("public_conversation", source_kinds)


class PublicFirmKnowledgeTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            email="public-firm-admin@example.com", password="pass", first_name="Firm", last_name="Admin",
            phone_number="+254700100200", national_id_number="99001002", role=UserRole.ADMIN,
        )
        self.firm = LawFirm.objects.create(
            name="Verified Firm", registration_number="PRIVATE-REG", kra_pin="PRIVATE-KRA",
            email="public@example.com", phone_number="+254700000001", website="https://firm.example",
            physical_address="Nairobi, Kenya", postal_address="Private postal detail",
            description="Approved firm description", owner=self.admin,
        )
        FirmSetting.objects.create(firm=self.firm, opening_time="08:00", closing_time="17:00")

    def test_admin_approved_public_fields_sync_without_private_identifiers(self):
        policy = self.firm.public_knowledge_policy
        PracticeArea.objects.create(firm=self.firm, name="Employment Law")
        article = KnowledgeBaseArticle.objects.get(slug=f"verified-public-firm-profile-{self.firm.id}")
        self.assertTrue(article.is_published)
        self.assertIn("Employment Law", article.body)
        self.assertIn("public@example.com", article.body)
        self.assertIn("08:00", article.body)
        self.assertNotIn("PRIVATE-REG", article.body)
        self.assertNotIn("PRIVATE-KRA", article.body)
        self.assertNotIn(self.admin.email, article.body)
        self.firm.description = "Updated approved description"
        self.firm.save()
        article.refresh_from_db()
        self.assertIn("Updated approved description", article.body)
        policy.is_published = False
        policy.save()
        article.refresh_from_db()
        self.assertFalse(article.is_published)

    def test_unapproved_policy_does_not_publish_firm_data(self):
        policy = self.firm.public_knowledge_policy
        policy.approved_by = None
        policy.save()
        self.assertFalse(KnowledgeBaseArticle.objects.filter(
            slug=f"verified-public-firm-profile-{self.firm.id}", is_published=True,
        ).exists())
