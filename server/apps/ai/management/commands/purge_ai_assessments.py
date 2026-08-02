from datetime import timedelta

from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.ai.models import AICaseAssessment


class Command(BaseCommand):
    help = "Delete superseded AI case assessments older than the configured retention period."

    def add_arguments(self, parser):
        parser.add_argument("--days", type=int, default=settings.AI_CASE_ASSESSMENT_RETENTION_DAYS)

    def handle(self, *args, **options):
        if options["days"] < 1:
            raise ValueError("Retention days must be positive.")
        cutoff = timezone.now() - timedelta(days=options["days"])
        deleted, _ = AICaseAssessment.objects.filter(is_stale=True, analyzed_at__lt=cutoff).delete()
        self.stdout.write(self.style.SUCCESS(f"Deleted {deleted} retained AI assessment record(s)."))
