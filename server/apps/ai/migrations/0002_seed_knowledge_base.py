from datetime import date

from django.db import migrations


VERIFIED = date(2026, 8, 2)


def seed(apps, schema_editor):
    Category = apps.get_model("ai", "KnowledgeBaseCategory")
    Article = apps.get_model("ai", "KnowledgeBaseArticle")
    firm, _ = Category.objects.update_or_create(
        slug="firm-services",
        defaults={
            "name": "Firm services",
            "description": "Published service information from this website.",
            "suggested_question": "What legal services does the firm offer?",
            "display_order": 1,
            "is_active": True,
        },
    )
    rights, _ = Category.objects.update_or_create(
        slug="constitutional-rights",
        defaults={
            "name": "Constitutional rights",
            "description": "Selected general information from Kenya's Constitution.",
            "suggested_question": "What does access to justice mean in Kenya?",
            "display_order": 2,
            "is_active": True,
        },
    )
    disputes, _ = Category.objects.update_or_create(
        slug="civil-claims",
        defaults={
            "name": "Civil claims",
            "description": "Selected introductory information about Kenyan civil claims.",
            "suggested_question": "Can an unpaid debt be taken to the Small Claims Court?",
            "display_order": 3,
            "is_active": True,
        },
    )
    privacy, _ = Category.objects.update_or_create(
        slug="data-protection",
        defaults={
            "name": "Data protection",
            "description": "Selected general information about personal-data protection.",
            "suggested_question": "What principles apply to personal data in Kenya?",
            "display_order": 4,
            "is_active": True,
        },
    )
    articles = [
        {
            "slug": "firm-services-published-on-homepage",
            "category": firm,
            "title": "Legal services published by the firm",
            "summary": "The public homepage lists six service areas.",
            "body": (
                "The firm's public homepage lists Civil Litigation, Corporate Law, Criminal "
                "Defense, Contract Drafting, Court Representation, and Legal Consultation. "
                "The repository does not contain administrator-verified opening hours, a "
                "specific office address, or confirmed public contact details for this "
                "knowledge base. An administrator must verify and publish those details before "
                "the assistant may state them."
            ),
            "jurisdiction": "Firm information",
            "source_name": "Law firm public homepage",
            "source_url": "",
            "source_reference": "Homepage — Our Legal Services (administrator verification required)",
            "keywords": "firm services practice areas litigation corporate criminal contracts court consultation location hours contact",
        },
        {
            "slug": "constitutional-access-to-justice",
            "category": rights,
            "title": "Constitutional access to justice",
            "summary": "Article 48 addresses access to justice.",
            "body": (
                "Article 48 of the Constitution of Kenya requires the State to ensure access "
                "to justice for all persons. If a fee is required, it must be reasonable and "
                "must not impede access to justice. This is general constitutional information; "
                "how it applies to a particular dispute requires legal advice."
            ),
            "jurisdiction": "Kenya",
            "source_name": "Kenya Law",
            "source_url": "https://new.kenyalaw.org/akn/ke/act/2010/constitution",
            "source_reference": "Constitution of Kenya, 2010, Article 48",
            "keywords": "access justice court fees constitutional rights article 48",
        },
        {
            "slug": "small-claims-court-claim-types",
            "category": disputes,
            "title": "Types of claims considered by the Small Claims Court",
            "summary": "The Act identifies categories of civil claims and exclusions.",
            "body": (
                "Section 12 of the Small Claims Court Act lists civil claims including claims "
                "about sale or supply of goods or services, money held and received, certain "
                "property loss or damage, delivery or recovery of movable property, personal "
                "injury compensation, and contractual set-off or counterclaims. The Act also "
                "contains exclusions and jurisdictional conditions. Whether a debt claim fits "
                "the Court depends on its facts, the current monetary limit, local jurisdiction, "
                "and current law, so a claimant should check the latest official text or consult "
                "an advocate."
            ),
            "jurisdiction": "Kenya",
            "source_name": "Kenya Law",
            "source_url": "https://new.kenyalaw.org/akn/ke/act/2016/2",
            "source_reference": "Small Claims Court Act, Cap. 10A, sections 12 and 15",
            "keywords": "unpaid debt small claims court contract money goods services recover claim",
        },
        {
            "slug": "personal-data-protection-principles",
            "category": privacy,
            "title": "Principles for processing personal data",
            "summary": "The Data Protection Act sets principles for handling personal data.",
            "body": (
                "Section 25 of the Data Protection Act requires personal data to be processed "
                "lawfully, fairly and transparently; collected for explicit, specified and "
                "legitimate purposes; adequate, relevant and limited to what is necessary; "
                "accurate and kept up to date where necessary; and retained no longer than "
                "necessary. The Act contains further rights, duties and exceptions that may be "
                "relevant to a specific situation."
            ),
            "jurisdiction": "Kenya",
            "source_name": "Kenya Law",
            "source_url": "https://new.kenyalaw.org/akn/ke/act/2019/24",
            "source_reference": "Data Protection Act, Cap. 411C, section 25",
            "keywords": "privacy personal data controller processor lawful transparent retention section 25",
        },
    ]
    for item in articles:
        slug = item.pop("slug")
        Article.objects.update_or_create(
            slug=slug,
            defaults={**item, "last_verified_at": VERIFIED, "is_published": True},
        )


def unseed(apps, schema_editor):
    Article = apps.get_model("ai", "KnowledgeBaseArticle")
    Category = apps.get_model("ai", "KnowledgeBaseCategory")
    Article.objects.filter(slug__in=[
        "firm-services-published-on-homepage",
        "constitutional-access-to-justice",
        "small-claims-court-claim-types",
        "personal-data-protection-principles",
    ]).delete()
    Category.objects.filter(slug__in=[
        "firm-services", "constitutional-rights", "civil-claims", "data-protection"
    ]).delete()


class Migration(migrations.Migration):
    dependencies = [("ai", "0001_initial")]
    operations = [migrations.RunPython(seed, unseed)]
