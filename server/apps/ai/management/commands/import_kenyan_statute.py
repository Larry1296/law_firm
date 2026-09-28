"""Import Kenyan Acts from Kenya Law into searchable sections for the public legal assistant.

    venv/bin/python manage.py import_kenyan_statute all
    venv/bin/python manage.py import_kenyan_statute data-protection --file ~/Downloads/dpa.html \
        --version-url https://new.kenyalaw.org/akn/ke/act/2019/24/eng@2022-12-31

To use a newer version, open the Act on new.kenyalaw.org, save the page as HTML
("Save page as", HTML only) and pass it with --file and the page's address.

Each Act is saved to apps/ai/data/sources/ (and a copy to docs/legal-sources/) so an
import can be repeated offline from the exact version reviewed. Re-running updates
changed sections and unpublishes sections no longer in the source.
"""

import hashlib
import re
import shutil
import urllib.request
from datetime import date
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.ai.models import LegalProvision, LegalSourceDocument
from apps.ai.services.statute_import_service import parse_statute

ACTS = {
    "data-protection": ("data-protection-act-2019", "Data Protection Act, 2019", "https://new.kenyalaw.org/akn/ke/act/2019/24/eng"),
    "civil-procedure": ("civil-procedure-act-cap-21", "Civil Procedure Act (Cap. 21)", "https://new.kenyalaw.org/akn/ke/act/1924/3/eng"),
    "employment": ("employment-act-2007", "Employment Act, 2007", "https://new.kenyalaw.org/akn/ke/act/2007/11/eng"),
}
SOURCES_DIR = Path(__file__).resolve().parents[2] / "data" / "sources"
DOCS_DIR = Path(__file__).resolve().parents[5] / "docs" / "legal-sources"
MINIMUM_SECTIONS = 20


class Command(BaseCommand):
    help = "Import Kenyan Acts from Kenya Law (Akoma Ntoso HTML) into searchable, citable sections."

    def add_arguments(self, parser):
        parser.add_argument("acts", nargs="+", choices=[*ACTS, "all"])
        parser.add_argument("--refresh", action="store_true", help="Download the current version again from Kenya Law.")
        parser.add_argument("--file", help="A saved Kenya Law HTML page for this Act (one Act only).")
        parser.add_argument("--version-url", help="The Kenya Law address the saved page came from, including @date.")

    def handle(self, *args, **options):
        keys = list(ACTS) if "all" in options["acts"] else options["acts"]
        if options["file"]:
            if len(keys) != 1:
                raise CommandError("--file imports exactly one Act; name it instead of 'all'.")
            self.store_saved_page(keys[0], Path(options["file"]).expanduser(), options["version_url"])
        for key in keys:
            self.import_act(key, refresh=options["refresh"])

    def store_saved_page(self, key, path, version_url):
        slug, _, url = ACTS[key]
        if not path.is_file():
            raise CommandError(f"File not found: {path}")
        SOURCES_DIR.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(path, SOURCES_DIR / f"{slug}.html")
        (SOURCES_DIR / f"{slug}.url").write_text(version_url or url)

    def fetch(self, slug, url, refresh):
        path = SOURCES_DIR / f"{slug}.html"
        meta = SOURCES_DIR / f"{slug}.url"
        if refresh or not path.exists():
            request = urllib.request.Request(url, headers={"User-Agent": "SheriaMaster legal source import"})
            try:
                with urllib.request.urlopen(request, timeout=60) as response:
                    html, resolved = response.read(), response.geturl()
            except OSError as exc:
                raise CommandError(
                    f"Could not download {url} ({exc}). Open it in a browser, save the page as HTML, "
                    f"and re-run with --file <saved.html> --version-url <address shown in the browser>."
                ) from exc
            path.write_bytes(html)
            meta.write_text(resolved)
        DOCS_DIR.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(path, DOCS_DIR / path.name)
        return path.read_bytes(), (meta.read_text().strip() if meta.exists() else url)

    def import_act(self, key, *, refresh):
        slug, title, url = ACTS[key]
        raw, resolved_url = self.fetch(slug, url, refresh)
        sections = parse_statute(raw.decode("utf-8"))
        if len(sections) < MINIMUM_SECTIONS:
            raise CommandError(f"{title}: only {len(sections)} sections were extracted; refusing an incomplete import.")
        version = re.search(r"@(\d{4}-\d{2}-\d{2})", resolved_url)
        counts = {"created": 0, "updated": 0, "unchanged": 0}
        with transaction.atomic():
            document, _ = LegalSourceDocument.objects.update_or_create(
                slug=slug,
                defaults={
                    "title": title, "jurisdiction": "Kenya",
                    "source_type": LegalSourceDocument.SourceType.STATUTE,
                    "official_url": resolved_url,
                    "version_date": date.fromisoformat(version.group(1)) if version else None,
                    "imported_at": timezone.now(), "last_verified_at": timezone.localdate(),
                    "source_checksum": hashlib.sha256(raw).hexdigest(),
                    "is_official_primary_source": True, "is_published": True,
                    "metadata": {"local_filename": f"{slug}.html", "publisher": "Kenya Law"},
                },
            )
            seen = []
            for order, section in enumerate(sections):
                seen.append(section.eid)
                defaults = {
                    "unit_type": LegalProvision.UnitType.SECTION, "chapter": "", "part": section.part,
                    "article_number": section.number, "heading": section.heading, "text": section.text,
                    "checksum": section.checksum, "display_order": order, "is_published": True,
                }
                existing = LegalProvision.objects.filter(document=document, stable_key=section.eid).first()
                if existing is None:
                    LegalProvision.objects.create(document=document, stable_key=section.eid, **defaults)
                    counts["created"] += 1
                elif existing.checksum != section.checksum or not existing.is_published:
                    for field, value in defaults.items():
                        setattr(existing, field, value)
                    existing.save()
                    counts["updated"] += 1
                else:
                    counts["unchanged"] += 1
            LegalProvision.objects.filter(document=document).exclude(stable_key__in=seen).update(is_published=False)
        self.stdout.write(self.style.SUCCESS(
            f"{title} ({resolved_url}): {len(sections)} sections; " + ", ".join(f"{k}={v}" for k, v in counts.items())
        ))
