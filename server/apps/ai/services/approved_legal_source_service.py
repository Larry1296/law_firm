from urllib.parse import urlparse


class ApprovedLegalSourceService:
    APPROVED_DOMAINS = frozenset({"new.kenyalaw.org", "kenyalaw.org", "www.kenyalaw.org"})

    @classmethod
    def validate_url(cls, url):
        parsed = urlparse(url)
        if parsed.scheme != "https" or parsed.hostname not in cls.APPROVED_DOMAINS:
            raise ValueError("Legal source URL is not on an approved authoritative domain.")
        return url

    @classmethod
    def citation_exists_locally(cls, *, title, url):
        from apps.ai.models import LegalSourceDocument
        cls.validate_url(url)
        return LegalSourceDocument.objects.filter(title=title, official_url=url, is_published=True).exists()
