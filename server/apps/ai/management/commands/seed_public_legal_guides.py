"""Copy the built-in "Steps in a civil case" guide into a firm's knowledge base as drafts.

    venv/bin/python manage.py seed_public_legal_guides --firm-id <LawFirm id>

Each step becomes a draft article the firm can edit, approve and publish through the
normal public-knowledge workflow. Once a step is published, the public assistant uses
the firm's wording for it; until then it uses the built-in text. Existing articles are
never overwritten.
"""

from django.core.management.base import BaseCommand, CommandError

from apps.ai.models import KnowledgeBaseArticle, KnowledgeBaseCategory
from apps.ai.services.court_process_guide import GUIDE_TITLE, STEPS
from apps.ai.services.court_process_guide_service import CourtProcessGuideService
from apps.firm.models import LawFirm


class Command(BaseCommand):
    help = "Create draft knowledge-base articles for each step of a Kenyan civil case, for the firm to review and publish."

    def add_arguments(self, parser):
        parser.add_argument("--firm-id", required=True)

    def handle(self, *args, **options):
        firm = LawFirm.objects.filter(id=options["firm_id"]).first()
        if firm is None:
            raise CommandError("Firm not found.")
        category, _ = KnowledgeBaseCategory.objects.get_or_create(
            slug="court-process",
            defaults={
                "name": "Court process", "description": GUIDE_TITLE,
                "suggested_question": "What are the steps in a court case?", "page_sections": ["home"],
            },
        )
        created = 0
        for step in STEPS:
            slug = CourtProcessGuideService.article_slug(firm, step)
            if KnowledgeBaseArticle.objects.filter(slug=slug).exists():
                continue
            body = "\n".join(
                [step["summary"]]
                + [line for heading, points in step["sections"] for line in ["", f"**{heading}**", *[f"- {point}" for point in points]]]
            )
            KnowledgeBaseArticle.objects.create(
                firm=firm, category=category, slug=slug,
                title=f"Step {step['number']}: {step['title']}", summary=step["summary"], body=body,
                keywords=", ".join(step["aliases"]),
                public_category=KnowledgeBaseArticle.PublicCategory.FAQ,
                source_name="Civil Procedure Act (Cap. 21) and Civil Procedure Rules, 2010",
                source_url="https://new.kenyalaw.org/akn/ke/act/1924/3/eng",
                is_published=False, approval_status=KnowledgeBaseArticle.ApprovalStatus.DRAFT,
            )
            created += 1
        self.stdout.write(self.style.SUCCESS(
            f"{created} draft step article(s) created for {firm.name}. Review and publish them under public knowledge in the admin."
        ))
