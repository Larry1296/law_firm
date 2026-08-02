import hashlib
from datetime import date
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.ai.models import LegalProvision, LegalSourceDocument
from apps.ai.services.constitution_import_service import extract_pdf_text, parse_constitution


class Command(BaseCommand):
    help = "Import the bundled Constitution of Kenya PDF into searchable provisions."

    def add_arguments(self, parser):
        parser.add_argument("--source", type=str, help="Override the bundled PDF path.")
        parser.add_argument("--verified-date", type=date.fromisoformat, default=date.today())

    def handle(self, *args, **options):
        default_path = Path(__file__).resolve().parents[2] / "data" / "sources" / "The_Constitution_of_Kenya_2010.pdf"
        source_path = Path(options["source"] or default_path).resolve()
        if source_path.name.endswith(":Zone.Identifier"):
            raise CommandError("Refusing to import Windows metadata stream.")
        if not source_path.is_file() or source_path.suffix.lower() != ".pdf":
            raise CommandError(f"Constitution PDF not found: {source_path}")
        source_checksum = hashlib.sha256(source_path.read_bytes()).hexdigest()
        try:
            provisions = parse_constitution(extract_pdf_text(source_path))
        except (RuntimeError, ValueError) as exc:
            raise CommandError(str(exc)) from exc

        counts = {"created": 0, "updated": 0, "unchanged": 0, "failed": 0}
        with transaction.atomic():
            document, _ = LegalSourceDocument.objects.update_or_create(
                slug="constitution-of-kenya-2010",
                defaults={
                    "title": "Constitution of Kenya, 2010", "jurisdiction": "Kenya",
                    "source_type": LegalSourceDocument.SourceType.CONSTITUTION,
                    "official_url": "https://new.kenyalaw.org/akn/ke/act/2010/constitution",
                    "effective_date": date(2010, 8, 27), "version_date": date(2010, 8, 27),
                    "imported_at": timezone.now(), "last_verified_at": options["verified_date"],
                    "source_checksum": source_checksum, "is_official_primary_source": True,
                    "is_published": True, "metadata": {"local_filename": source_path.name},
                },
            )
            seen = []
            for item in provisions:
                seen.append(item.stable_key)
                defaults = {
                    "unit_type": item.unit_type, "chapter": item.chapter, "part": item.part,
                    "article_number": item.article_number, "heading": item.heading,
                    "clauses": item.clauses, "text": item.text, "checksum": item.checksum,
                    "display_order": item.display_order, "is_published": True,
                }
                try:
                    existing = LegalProvision.objects.filter(document=document, stable_key=item.stable_key).first()
                    if existing is None:
                        LegalProvision.objects.create(document=document, stable_key=item.stable_key, **defaults)
                        counts["created"] += 1
                    elif existing.checksum != item.checksum or any(getattr(existing, key) != value for key, value in defaults.items()):
                        for key, value in defaults.items():
                            setattr(existing, key, value)
                        existing.save()
                        counts["updated"] += 1
                    else:
                        counts["unchanged"] += 1
                except Exception:
                    counts["failed"] += 1
                    raise
            LegalProvision.objects.filter(document=document).exclude(stable_key__in=seen).update(is_published=False)
        self.stdout.write(self.style.SUCCESS("Constitution import complete: " + ", ".join(f"{key}={value}" for key, value in counts.items())))
