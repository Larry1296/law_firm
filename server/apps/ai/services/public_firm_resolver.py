from urllib.parse import urlparse

from django.conf import settings

from apps.firm.models import LawFirm


class PublicFirmResolver:
    """Resolve one public-site tenant without ever falling back to all firms."""

    @staticmethod
    def resolve(request):
        configured_id = getattr(settings, "PUBLIC_FIRM_ID", "").strip()
        if configured_id:
            return LawFirm.objects.filter(id=configured_id, is_active=True).first()

        hostname = request.get_host().split(":", 1)[0].lower().rstrip(".")
        matches = []
        for firm in LawFirm.objects.filter(is_active=True).exclude(website=""):
            website_host = (urlparse(firm.website).hostname or "").lower().rstrip(".")
            if website_host and website_host == hostname:
                matches.append(firm)
        return matches[0] if len(matches) == 1 else None
