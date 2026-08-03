from django.utils import timezone
from django.utils.text import slugify

from apps.ai.models import KnowledgeBaseArticle, KnowledgeBaseCategory, PublicAdvocateProfile, PublicFirmKnowledgePolicy


class FirmKnowledgeService:
    """Projects an allowlisted subset of canonical firm records into public retrieval."""

    @staticmethod
    def sync(firm):
        policy = PublicFirmKnowledgePolicy.objects.filter(firm=firm).first()
        category, _ = KnowledgeBaseCategory.objects.update_or_create(
            slug="firm-services",
            defaults={
                "name": "Firm services", "description": "Administrator-approved public firm information.",
                "suggested_question": "What legal services does the firm offer?",
                "page_sections": ["home", "about", "practice_areas", "consultation", "contact"],
                "display_order": 1, "is_active": True,
            },
        )
        slug = f"verified-public-firm-profile-{slugify(str(firm.id))}"
        approved = bool(policy and policy.is_published and policy.approved_by_id and firm.is_active)
        if not approved:
            KnowledgeBaseArticle.objects.filter(slug=slug).update(is_published=False)
            return None

        KnowledgeBaseArticle.objects.filter(slug="firm-services-published-on-homepage").update(is_published=False)

        sections = [f"Firm name: {firm.name}."]
        keywords = [firm.name, "firm", "services", "practice areas", "contact", "location", "opening hours"]
        if policy.include_owner and firm.owner_id:
            sections.append(f"Published firm owner: {firm.owner.full_name}.")
            keywords.extend(["owner", "firm owner", firm.owner.full_name])
        if policy.include_description and firm.description:
            sections.append(f"About the firm: {firm.description.strip()}")
        if policy.include_practice_areas:
            areas = list(firm.practice_areas.filter(is_active=True).values_list("name", flat=True))
            if areas:
                sections.append("Approved practice areas: " + ", ".join(areas) + ".")
                keywords.extend(areas)
        if policy.include_contact:
            contacts = []
            if firm.email:
                contacts.append(f"email {firm.email}")
            if firm.phone_number:
                contacts.append(f"telephone {firm.phone_number}")
            if firm.website:
                contacts.append(f"website {firm.website}")
            if contacts:
                sections.append("Public contact information: " + "; ".join(contacts) + ".")
        if policy.include_location:
            locations = [value.strip() for value in (firm.physical_address, firm.postal_address) if value and value.strip()]
            if locations:
                sections.append("Public office location: " + "; ".join(locations) + ".")
        settings = getattr(firm, "settings", None)
        if policy.include_hours and settings and settings.is_active and settings.opening_time and settings.closing_time:
            days = "Monday to Friday"
            if settings.work_on_saturday:
                days += " and Saturday"
            if settings.work_on_sunday:
                days += " and Sunday"
            opening = settings.opening_time.strftime("%H:%M") if hasattr(settings.opening_time, "strftime") else str(settings.opening_time)[:5]
            closing = settings.closing_time.strftime("%H:%M") if hasattr(settings.closing_time, "strftime") else str(settings.closing_time)[:5]
            sections.append(f"Published working hours: {days}, {opening} to {closing} ({settings.timezone}).")
        if policy.include_branches:
            branches = []
            for branch in firm.branches.filter(is_active=True):
                detail = branch.name
                if branch.physical_address:
                    detail += f" — {branch.physical_address.strip()}"
                branches.append(detail)
            if branches:
                sections.append("Published offices: " + "; ".join(branches) + ".")
        profiles = PublicAdvocateProfile.objects.filter(
            lawyer__law_firm=firm, lawyer__is_active=True, lawyer__user__is_active=True,
            is_published=True, approved_by__isnull=False,
        ).select_related("lawyer")
        advocate_lines = []
        for profile in profiles:
            areas = list(profile.lawyer.practice_areas.filter(is_active=True).values_list("name", flat=True))
            line = f"{profile.display_name}, {profile.lawyer.job_title}"
            if areas:
                line += f"; practice areas: {', '.join(areas)}"
            if profile.public_bio:
                line += f"; profile: {profile.public_bio.strip()}"
            advocate_lines.append(line)
        if advocate_lines:
            sections.append("Approved public advocate profiles: " + " | ".join(advocate_lines) + ".")

        article, _ = KnowledgeBaseArticle.objects.update_or_create(
            slug=slug,
            defaults={
                "firm": firm,
                "title": f"Verified public information about {firm.name}",
                "category": category,
                "summary": f"Administrator-approved public identity, services and contact details for {firm.name}.",
                "body": "\n\n".join(sections),
                "jurisdiction": "Firm information",
                "source_name": f"{firm.name} administrator-approved firm record",
                "source_url": firm.website if policy.include_contact else "",
                "source_reference": "Administrator-approved public firm profile",
                "last_verified_at": timezone.localdate(),
                "keywords": ", ".join(keywords),
                "is_published": True,
                "visibility": KnowledgeBaseArticle.Visibility.PUBLIC,
                "approval_status": KnowledgeBaseArticle.ApprovalStatus.PUBLISHED,
                "published_at": policy.approved_at or timezone.now(),
                "approved_by": policy.approved_by,
                "approved_at": policy.approved_at or timezone.now(),
                "source_type": KnowledgeBaseArticle.SourceType.FIRM_PROFILE,
                "public_category": KnowledgeBaseArticle.PublicCategory.OVERVIEW,
                "withdrawn_at": None,
                "withdrawn_by": None,
                "updated_by": policy.approved_by,
                "created_by": policy.approved_by,
            },
        )
        return article
