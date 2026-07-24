from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.cases.models import Case, CaseActivity, CaseFiling, CaseLifecycleTransition, CaseParty, CaseTimeline, CourtProceeding
from apps.clients.models import Client
from apps.common.choices import UserRole


class Command(BaseCommand):
    help = "Repair one existing matter after intake/conflict architecture migration."

    def add_arguments(self, parser):
        parser.add_argument("--matter-number", required=True)
        parser.add_argument("--conflict-reference", default="")
        parser.add_argument("--dry-run", action="store_true")

    def log_change(self, changes, message):
        changes.append(message)
        self.stdout.write(message)

    def handle(self, *args, **options):
        matter_number = options["matter_number"]
        conflict_reference = options.get("conflict_reference") or ""
        dry_run = options["dry_run"]

        try:
            with transaction.atomic():
                case = (
                    Case.objects.select_for_update(of=("self",))
                    .select_related("client", "created_by", "firm")
                    .get(case_number=matter_number)
                )
                changes = []

                try:
                    conflict_check = case.originating_conflict_check
                except Exception:
                    conflict_check = None
                if conflict_reference:
                    if not conflict_check or conflict_check.reference_number != conflict_reference:
                        raise CommandError(f"{matter_number} is not linked to {conflict_reference}.")
                if not conflict_check:
                    raise CommandError(f"{matter_number} has no originating proposed-matter conflict check.")

                actor = case.created_by
                court, _ = CourtProceeding.objects.get_or_create(matter=case)
                case_updates = []
                court_updates = []

                def set_case(field, value):
                    if getattr(case, field) != value:
                        self.log_change(changes, f"case.{field}: {getattr(case, field)!r} -> {value!r}")
                        setattr(case, field, value)
                        case_updates.append(field)

                def set_court(field, value):
                    if getattr(court, field) != value:
                        self.log_change(changes, f"court_proceeding.{field}: {getattr(court, field)!r} -> {value!r}")
                        setattr(court, field, value)
                        court_updates.append(field)

                official = court.official_court_case_number or case.official_court_case_number
                if official:
                    set_case("official_court_case_number", official)
                    set_court("official_court_case_number", official)
                for field in ["filing_date", "court_type", "court_level", "court_name", "court_station", "registry", "efiling_reference", "assessment_reference", "court_fee_amount", "payment_reference", "payment_date"]:
                    value = getattr(court, field, None) or getattr(case, field, None)
                    if value not in (None, ""):
                        set_case(field, value)
                        set_court(field, value)
                set_case("matter_status", Case.MatterStatus.MATTER_OPEN)
                set_case("court_stage", Case.CourtStage.FILED)
                set_case("outcome_status", Case.OutcomeStatus.PENDING)
                set_case("enforcement_status", Case.EnforcementStatus.NOT_APPLICABLE)
                set_case("appeal_status", Case.AppealStatus.NONE)
                set_court("court_stage", Case.CourtStage.FILED)

                client = case.client
                client_updates = []
                if client.lifecycle_status in {Client.LifecycleStatus.PROSPECT, Client.LifecycleStatus.PROSPECTIVE}:
                    self.log_change(changes, f"client.lifecycle_status: {client.lifecycle_status!r} -> {Client.LifecycleStatus.OFFICIAL!r}")
                    client.lifecycle_status = Client.LifecycleStatus.OFFICIAL
                    client_updates.append("lifecycle_status")
                if client.access_type == Client.AccessType.PROSPECT and client.user_id:
                    self.log_change(changes, f"client.access_type: {client.access_type!r} -> {Client.AccessType.PORTAL_ENABLED!r}")
                    client.access_type = Client.AccessType.PORTAL_ENABLED
                    client_updates.append("access_type")
                elif client.access_type == Client.AccessType.ASSISTED_CLIENT:
                    self.log_change(changes, f"client.access_type: {client.access_type!r} -> {Client.AccessType.ASSISTED!r}")
                    client.access_type = Client.AccessType.ASSISTED
                    client_updates.append("access_type")

                user_updates = []
                if client.user_id and client.user.role == UserRole.PROSPECT:
                    self.log_change(changes, f"portal_user.role: {client.user.role!r} -> {UserRole.OFFICIAL_CLIENT!r}")
                    client.user.role = UserRole.OFFICIAL_CLIENT
                    user_updates.append("role")

                if case.procedure_track == Case.ProcedureTrack.SMALL_CLAIM:
                    for party in case.parties.select_for_update():
                        if party.is_our_client:
                            if party.party_role != CaseParty.PartyRole.CLAIMANT:
                                self.log_change(changes, f"party {party.name} role: {party.party_role!r} -> {CaseParty.PartyRole.CLAIMANT!r}")
                                party.party_role = CaseParty.PartyRole.CLAIMANT
                            if party.party_type != CaseParty.PartyType.INDIVIDUAL:
                                self.log_change(changes, f"party {party.name} type: {party.party_type!r} -> {CaseParty.PartyType.INDIVIDUAL!r}")
                                party.party_type = CaseParty.PartyType.INDIVIDUAL
                            if not dry_run:
                                party.save(update_fields=["party_role", "party_type", "updated_at"])
                        elif party.is_adverse:
                            update_fields = []
                            if party.party_role != CaseParty.PartyRole.RESPONDENT:
                                self.log_change(changes, f"party {party.name} role: {party.party_role!r} -> {CaseParty.PartyRole.RESPONDENT!r}")
                                party.party_role = CaseParty.PartyRole.RESPONDENT
                                update_fields.append("party_role")
                            if "Apex Skyline Developers" in party.name and party.party_type != CaseParty.PartyType.COMPANY:
                                self.log_change(changes, f"party {party.name} type: {party.party_type!r} -> {CaseParty.PartyType.COMPANY!r}")
                                party.party_type = CaseParty.PartyType.COMPANY
                                update_fields.append("party_type")
                            if update_fields and not dry_run:
                                party.save(update_fields=[*update_fields, "updated_at"])

                if not dry_run:
                    if case_updates:
                        case.save(update_fields=[*set(case_updates), "updated_at"])
                    if court_updates:
                        court.save(update_fields=[*set(court_updates), "updated_at"])
                    if client_updates:
                        client.save(update_fields=[*set(client_updates), "updated_at"])
                    if user_updates:
                        client.user.save(update_fields=[*set(user_updates), "updated_at"])

                if not CaseFiling.objects.filter(case=case, source="EXISTING_FILED_COURT_CASE_REGISTRATION").exists():
                    self.log_change(changes, "create originating CaseFiling for existing filed court case registration")
                    if not dry_run:
                        filed_at = timezone.make_aware(timezone.datetime.combine(case.filing_date, timezone.datetime.min.time())) if case.filing_date else None
                        CaseFiling.objects.create(
                            case=case,
                            filing_type=CaseFiling.FilingType.ORIGINATING_CLAIM,
                            status=CaseFiling.FilingStatus.FILED,
                            title="Claim filed",
                            description="Originating claim metadata recorded from existing filed court case registration. No uploaded document was recorded with this filing.",
                            filed_at=filed_at,
                            official_court_case_number=case.official_court_case_number,
                            efiling_reference=case.efiling_reference,
                            assessment_reference=case.assessment_reference,
                            court_fee_amount=case.court_fee_amount,
                            payment_reference=case.payment_reference,
                            payment_date=case.payment_date,
                            filed_by=actor,
                            is_client_visible=True,
                            source="EXISTING_FILED_COURT_CASE_REGISTRATION",
                        )

                if not dry_run:
                    if case.lifecycle_transitions.filter(dimension=CaseLifecycleTransition.Dimension.MATTER_STATUS, to_state=Case.MatterStatus.MATTER_OPEN, metadata__source="matter_architecture_repair").count() == 0:
                        CaseLifecycleTransition.objects.create(
                            case=case,
                            dimension=CaseLifecycleTransition.Dimension.MATTER_STATUS,
                            from_state="ACTIVE",
                            to_state=Case.MatterStatus.MATTER_OPEN,
                            actor=actor,
                            effective_at=timezone.now(),
                            reason="Corrected canonical matter status for accepted active legal matter.",
                            metadata={"source": "matter_architecture_repair", "originating_conflict_reference": conflict_check.reference_number},
                        )
                    activity_description = f"Official court case {case.official_court_case_number} was confirmed as external proceeding for internal matter {case.case_number}."
                    if not case.activities.filter(action="MATTER_ARCHITECTURE_REPAIRED", metadata__source="matter_architecture_repair").exists():
                        CaseActivity.objects.create(
                            case=case,
                            action="MATTER_ARCHITECTURE_REPAIRED",
                            description=activity_description,
                            actor=actor,
                            metadata={
                                "source": "matter_architecture_repair",
                                "internal_matter_number": case.case_number,
                                "official_court_case_number": case.official_court_case_number,
                                "originating_conflict_reference": conflict_check.reference_number,
                            },
                        )
                    if not case.timeline.filter(action="Matter Architecture Repaired", description__contains=case.case_number).exists():
                        CaseTimeline.objects.create(
                            case=case,
                            action="Matter Architecture Repaired",
                            description=activity_description,
                            created_by=actor,
                        )

                if dry_run:
                    transaction.set_rollback(True)
                    self.stdout.write(self.style.WARNING("Dry run only; no database changes were saved."))
                elif not changes:
                    self.stdout.write(self.style.SUCCESS("No changes required; repair is idempotent."))
                else:
                    self.stdout.write(self.style.SUCCESS(f"Repair completed for {matter_number}."))
        except Case.DoesNotExist as exc:
            raise CommandError(f"Matter {matter_number} was not found.") from exc
