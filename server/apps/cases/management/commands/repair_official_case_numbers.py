import re

from django.utils.dateparse import parse_date
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.cases.models import Case
from apps.cases.services.case_service import CaseService


EXTERNAL_CASE_NUMBER_RE = re.compile(
    r"^(?:ELC|CMCC|HCCC|MCC|SCC|ELRC|HC|COA|SC)\s+[A-Z]?\d+.*\b20\d{2}$",
    re.IGNORECASE,
)


class Command(BaseCommand):
    help = (
        "Moves external-looking court numbers out of case_number into "
        "official_court_case_number and generates a firm internal matter number."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--commit",
            action="store_true",
            help="Apply the repair. Without this flag the command performs a dry run.",
        )
        parser.add_argument("--case-id", help="Repair or enrich one specific case id.", default=None)
        parser.add_argument("--filing-date", help="Set filing_date for repaired/enriched cases.", default=None)
        parser.add_argument("--efiling-reference", help="Set efiling_reference for repaired/enriched cases.", default=None)
        parser.add_argument("--payment-reference", help="Set payment_reference for repaired/enriched cases.", default=None)

    def handle(self, *args, **options):
        commit = options["commit"]
        case_id = options["case_id"]
        filing_date = parse_date(options["filing_date"]) if options["filing_date"] else None
        if options["filing_date"] and filing_date is None:
            self.stderr.write(self.style.ERROR("--filing-date must use YYYY-MM-DD format."))
            return
        queryset = (
            Case.objects.select_related("firm")
            .filter(official_court_case_number="", case_number__isnull=False)
            .order_by("firm_id", "created_at", "id")
        )
        if case_id:
            queryset = Case.objects.select_related("firm").filter(id=case_id)
        candidates = []
        for case in queryset:
            looks_external = EXTERNAL_CASE_NUMBER_RE.match((case.case_number or "").strip())
            can_enrich = case_id and case.official_court_case_number
            if looks_external or can_enrich:
                candidates.append(case)

        self.stdout.write(f"Found {len(candidates)} candidate case(s).")
        if not candidates:
            return

        for case in candidates:
            if case.official_court_case_number:
                message = f"enrich filed-case details for {case.case_number}"
            else:
                message = f"{case.case_number} -> official_court_case_number"
            self.stdout.write(f"{'[commit]' if commit else '[dry-run]'} {case.id}: {message}")

        if not commit:
            self.stdout.write(self.style.WARNING("Dry run only. Re-run with --commit to apply."))
            return

        with transaction.atomic():
            for case in candidates:
                original_number = case.case_number.strip()
                update_fields = []
                original_number = case.case_number.strip()
                if not case.official_court_case_number:
                    if Case.objects.filter(
                        firm=case.firm,
                        official_court_case_number__iexact=original_number,
                    ).exclude(id=case.id).exists():
                        self.stdout.write(
                            self.style.WARNING(
                                f"Skipped {case.id}: official number {original_number} already exists."
                            )
                        )
                        continue
                    case.official_court_case_number = original_number
                    case.case_number = CaseService.generate_case_number(case.firm)
                    update_fields.extend(["official_court_case_number", "case_number"])
                if not case.court_stage or case.court_stage == Case.CourtStage.NOT_FILED:
                    case.court_stage = Case.CourtStage.FILED
                    update_fields.append("court_stage")
                if filing_date:
                    case.filing_date = filing_date
                    update_fields.append("filing_date")
                if options["efiling_reference"]:
                    case.efiling_reference = options["efiling_reference"]
                    update_fields.append("efiling_reference")
                if options["payment_reference"]:
                    case.payment_reference = options["payment_reference"]
                    update_fields.append("payment_reference")
                if update_fields:
                    update_fields.append("updated_at")
                    case.save(update_fields=update_fields)

        self.stdout.write(self.style.SUCCESS("Repair completed."))
