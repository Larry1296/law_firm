from django.core.management.base import BaseCommand

from apps.firm.logo import normalize_logo
from apps.firm.models import LawFirm


class Command(BaseCommand):
    help = "Square and resize logos uploaded before logos were normalized on upload."

    def handle(self, *args, **options):
        for firm in LawFirm.objects.exclude(logo="").exclude(logo=None):
            old_file = firm.logo.name
            with firm.logo.open("rb") as source:
                normalized = normalize_logo(source)
            firm.logo.save(normalized.name, normalized, save=False)
            firm.save(update_fields=["logo", "updated_at"])
            # The original stays in storage, so this can be undone by pointing logo back at it.
            self.stdout.write(f"{firm.name}: {old_file} -> {firm.logo.name}")
