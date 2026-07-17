from django.apps import apps
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.cases.models import (
    Case,
    CaseActivity,
    CaseAttachment,
    CaseConflictCheck,
    CaseCourtroom,
    CaseEvent,
    CaseFiling,
    CaseLifecycleTransition,
    CaseNote,
    CaseParty,
    CaseTask,
    CaseTimeline,
)
from apps.clients.models import Client
from apps.staff.models import Lawyer, Secretary
from apps.users.models import User


COUNT_MODELS = {
    "cases": Case,
    "case_timelines": CaseTimeline,
    "case_activities": CaseActivity,
    "conflict_checks": CaseConflictCheck,
    "case_events": CaseEvent,
    "case_filings": CaseFiling,
    "case_attachments": CaseAttachment,
    "case_notes": CaseNote,
    "case_tasks": CaseTask,
    "case_parties": CaseParty,
    "case_courtroom_history": CaseCourtroom,
    "case_lifecycle_transitions": CaseLifecycleTransition,
}


OPTIONAL_COUNT_MODELS = {
    "courtroom_sessions": ("courtroom", "CourtroomSession"),
    "client_event_awareness": ("events", "EventClientAwareness"),
    "case_notifications": ("notifications", "Notification"),
    "case_communication_threads": ("communications", "CommunicationThread"),
}


PRESERVED_MODELS = {
    "clients": Client,
    "users": User,
    "lawyers": Lawyer,
    "secretaries": Secretary,
}


class Command(BaseCommand):
    help = "Development-only command to delete all case records and case-owned dependent data."

    def add_arguments(self, parser):
        parser.add_argument(
            "--yes",
            action="store_true",
            help="Actually delete case records. Without this flag the command is a dry run.",
        )

    def _optional_queryset(self, app_label, model_name):
        try:
            model = apps.get_model(app_label, model_name)
        except LookupError:
            return None

        if app_label == "notifications" and hasattr(model, "case"):
            return model.objects.filter(case__isnull=False)
        if app_label == "communications" and hasattr(model, "case"):
            return model.objects.filter(case__isnull=False)
        return model.objects.all()

    def _counts(self):
        counts = {name: model.objects.count() for name, model in COUNT_MODELS.items()}
        for name, (app_label, model_name) in OPTIONAL_COUNT_MODELS.items():
            queryset = self._optional_queryset(app_label, model_name)
            if queryset is not None:
                counts[name] = queryset.count()
        return counts

    def handle(self, *args, **options):
        commit = options["yes"]
        before = self._counts()
        preserved_before = {name: model.objects.count() for name, model in PRESERVED_MODELS.items()}

        self.stdout.write("Case-related counts before deletion:")
        for name, count in before.items():
            self.stdout.write(f"  {name}: {count}")
        self.stdout.write("Preserved data counts before deletion:")
        for name, count in preserved_before.items():
            self.stdout.write(f"  {name}: {count}")

        if not commit:
            self.stdout.write(self.style.WARNING("Dry run only. Re-run with --yes to delete case records."))
            return

        with transaction.atomic():
            deleted_count, deleted_by_model = Case.objects.all().delete()

        after = self._counts()
        preserved_after = {name: model.objects.count() for name, model in PRESERVED_MODELS.items()}

        self.stdout.write(f"Deleted objects through case cascades: {deleted_count}")
        for model_name, count in sorted(deleted_by_model.items()):
            self.stdout.write(f"  {model_name}: {count}")

        self.stdout.write("Case-related counts after deletion:")
        for name, count in after.items():
            self.stdout.write(f"  {name}: {count}")
        self.stdout.write("Preserved data counts after deletion:")
        for name, count in preserved_after.items():
            self.stdout.write(f"  {name}: {count}")

        changed = {
            name: (preserved_before[name], preserved_after[name])
            for name in preserved_before
            if preserved_before[name] != preserved_after[name]
        }
        if changed:
            raise RuntimeError(f"Non-case preserved counts changed unexpectedly: {changed}")

        self.stdout.write(self.style.SUCCESS("Case records and dependent case-owned data were deleted."))
