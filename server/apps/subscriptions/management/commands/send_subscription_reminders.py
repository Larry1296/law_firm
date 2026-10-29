"""Remind firm owners before their trial or paid period ends, when it ends and when the firm lapses.

Run daily, for example at 08:00 Nairobi time:
    0 8 * * * cd /path/to/server && venv/bin/python manage.py send_subscription_reminders
"""

from django.core.management.base import BaseCommand

from apps.subscriptions.services import SubscriptionService


class Command(BaseCommand):
    help = "Notify and email firm owners 14, 7 and 1 days before renewal (3 and 1 for a trial), at the grace period and at lapse."

    def handle(self, *args, **options):
        sent = SubscriptionService.send_renewal_reminders()
        self.stdout.write(self.style.SUCCESS(f"{sent} subscription reminder(s) sent."))
