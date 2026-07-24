"""
Management command to send event reminder notifications.

Run daily via cron:
    0 8 * * * cd /path/to/project && python manage.py send_event_reminders

Or manually:
    python manage.py send_event_reminders
    python manage.py send_event_reminders --dry-run
"""

from django.core.management.base import BaseCommand

from apps.events.services import EventService


class Command(BaseCommand):
    help = "Send reminder notifications for upcoming case events based on the reminder schedule."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be sent without actually sending notifications.",
        )

    def handle(self, *args, **options):
        dry_run = options.get("dry_run", False)

        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN — no notifications will be sent."))

        results = EventService.process_due_reminders()

        if not results:
            self.stdout.write(self.style.SUCCESS("No reminders due today."))
            return

        total_notifications = 0
        for event, days_remaining, count in results:
            total_notifications += count
            self.stdout.write(
                f"  {event.case.case_number} — {event.title}: "
                f"{days_remaining} day{'s' if days_remaining != 1 else ''} to go "
                f"→ {count} notification{'s' if count != 1 else ''} sent"
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"Done. {len(results)} event(s) processed, "
                f"{total_notifications} notification(s) sent."
            )
        )