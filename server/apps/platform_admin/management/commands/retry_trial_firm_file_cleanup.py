from django.core.management.base import BaseCommand

from apps.platform_admin.models import FirmFileCleanup
from apps.platform_admin.services.trial_firm_deletion_service import TrialFirmDeletionService


class Command(BaseCommand):
    help = 'Retry file removals left pending after trial-firm deletion (safe to schedule).'

    def handle(self, *args, **options):
        TrialFirmDeletionService.cleanup_files()
        self.stdout.write(f'Pending file removals: {FirmFileCleanup.objects.count()}')
