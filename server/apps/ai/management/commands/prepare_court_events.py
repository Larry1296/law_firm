"""Refresh court preparation briefs for every firm's upcoming sittings and notify advocates and clients.

Run daily, for example at 07:00 Nairobi time:
    0 7 * * * cd /path/to/server && venv/bin/python manage.py prepare_court_events
"""

from django.core.management.base import BaseCommand

from apps.ai.services.court_preparation_service import CourtPreparationService


class Command(BaseCommand):
    help = "Refresh court preparation briefs and notify advocates and clients 7, 3, 1 and 0 days before each sitting."

    def handle(self, *args, **options):
        sent = CourtPreparationService.process_due()
        self.stdout.write(self.style.SUCCESS(f"{sent} court preparation notification(s) sent."))
