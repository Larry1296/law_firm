from django.db import transaction
from django.db.models import Max
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.cases.models import Case, CaseActivity, CaseEvent, CaseTask, CaseTimeline
from apps.common.choices import CourtEventOutcome, CourtEventType, InternalCaseLifecycleStage
from apps.events.services import EventService


class ProceedingsWorkflowService:
    """Kenyan court-proceedings rules and atomic outcome recording."""

    TRANSITIONS = {
        CourtEventType.FILING: [CourtEventType.REGISTRATION, CourtEventType.REGISTRY_ACTION],
        CourtEventType.REGISTRATION: [CourtEventType.DIRECTIONS, CourtEventType.MENTION, CourtEventType.SERVICE],
        CourtEventType.DIRECTIONS: [CourtEventType.MENTION, CourtEventType.CASE_MANAGEMENT, CourtEventType.HEARING],
        CourtEventType.CASE_MANAGEMENT: [CourtEventType.HEARING, CourtEventType.MENTION, CourtEventType.MEDIATION],
        CourtEventType.MENTION: [
            CourtEventType.HEARING,
            CourtEventType.FURTHER_MENTION,
            CourtEventType.APPLICATION_HEARING,
            CourtEventType.PRELIMINARY_OBJECTION,
            CourtEventType.DIRECTIONS,
        ],
        CourtEventType.FURTHER_MENTION: [
            CourtEventType.HEARING, CourtEventType.FURTHER_MENTION, CourtEventType.APPLICATION_HEARING
        ],
        CourtEventType.APPLICATION_HEARING: [
            CourtEventType.RULING, CourtEventType.HEARING, CourtEventType.FURTHER_MENTION
        ],
        CourtEventType.PRELIMINARY_OBJECTION: [
            CourtEventType.RULING, CourtEventType.HEARING, CourtEventType.FURTHER_MENTION
        ],
        CourtEventType.HEARING: [
            CourtEventType.FURTHER_HEARING, CourtEventType.SUBMISSIONS, CourtEventType.RULING
        ],
        CourtEventType.FURTHER_HEARING: [
            CourtEventType.FURTHER_HEARING, CourtEventType.DEFENCE_HEARING, CourtEventType.SUBMISSIONS
        ],
        CourtEventType.DEFENCE_HEARING: [CourtEventType.FURTHER_HEARING, CourtEventType.SUBMISSIONS],
        CourtEventType.SUBMISSIONS: [CourtEventType.JUDGMENT, CourtEventType.RULING],
        CourtEventType.RULING: [
            CourtEventType.HEARING, CourtEventType.REVIEW, CourtEventType.APPEAL, CourtEventType.CLOSURE
        ],
        CourtEventType.JUDGMENT: [
            CourtEventType.DECREE, CourtEventType.EXECUTION, CourtEventType.REVIEW,
            CourtEventType.APPEAL, CourtEventType.CLOSURE,
        ],
        CourtEventType.DECREE: [CourtEventType.EXECUTION, CourtEventType.APPEAL],
        CourtEventType.EXECUTION: [CourtEventType.EXECUTION, CourtEventType.CLOSURE],
    }
    ALWAYS_AVAILABLE = [CourtEventType.MEDIATION, CourtEventType.SETTLEMENT]
    CRIMINAL_EXTRA = {
        CourtEventType.REGISTRATION: [CourtEventType.PLEA],
        CourtEventType.PLEA: [CourtEventType.MENTION, CourtEventType.HEARING],
        CourtEventType.JUDGMENT: [CourtEventType.MITIGATION, CourtEventType.SENTENCING],
        CourtEventType.MITIGATION: [CourtEventType.PROBATION_REPORT, CourtEventType.SENTENCING],
        CourtEventType.PROBATION_REPORT: [CourtEventType.SENTENCING],
        CourtEventType.SENTENCING: [CourtEventType.APPEAL, CourtEventType.REVIEW, CourtEventType.CLOSURE],
    }
    STAGE_BY_NEXT_EVENT = {
        CourtEventType.DIRECTIONS: InternalCaseLifecycleStage.AWAITING_DIRECTIONS,
        CourtEventType.MENTION: InternalCaseLifecycleStage.AWAITING_MENTION,
        CourtEventType.FURTHER_MENTION: InternalCaseLifecycleStage.AWAITING_MENTION,
        CourtEventType.COMPLIANCE_MENTION: InternalCaseLifecycleStage.AWAITING_MENTION,
        CourtEventType.APPLICATION_HEARING: InternalCaseLifecycleStage.AWAITING_APPLICATION_HEARING,
        CourtEventType.HEARING: InternalCaseLifecycleStage.AWAITING_HEARING,
        CourtEventType.FURTHER_HEARING: InternalCaseLifecycleStage.PART_HEARD,
        CourtEventType.DEFENCE_HEARING: InternalCaseLifecycleStage.PART_HEARD,
        CourtEventType.SUBMISSIONS: InternalCaseLifecycleStage.AWAITING_SUBMISSIONS,
        CourtEventType.RULING: InternalCaseLifecycleStage.AWAITING_RULING,
        CourtEventType.JUDGMENT: InternalCaseLifecycleStage.AWAITING_JUDGMENT,
        CourtEventType.EXECUTION: InternalCaseLifecycleStage.EXECUTION,
        CourtEventType.APPEAL: InternalCaseLifecycleStage.ON_APPEAL,
        CourtEventType.CLOSURE: InternalCaseLifecycleStage.CLOSED,
    }

    @classmethod
    def ensure_can_record(cls, actor, case):
        EventService.ensure_can_manage(actor, case)

    @classmethod
    def allowed_next_events(cls, case, current_event=None):
        current_event = current_event or case.events.order_by("-starts_at", "-created_at").first()
        current_type = current_event.event_type if current_event else None
        options = list(cls.TRANSITIONS.get(current_type, []))
        if case.case_type == Case.CaseType.CRIMINAL:
            options = list(cls.CRIMINAL_EXTRA.get(current_type, options))
        for item in cls.ALWAYS_AVAILABLE:
            if item not in options:
                options.append(item)
        return [
            {
                "value": value,
                "label": CourtEventType(value).label,
                "recommended": index == 0,
                "reason": "Most likely procedural step" if index == 0 else "",
            }
            for index, value in enumerate(options)
        ] + [{
            "value": CourtEventType.OTHER_COURT_DIRECTED,
            "label": CourtEventType.OTHER_COURT_DIRECTED.label,
            "recommended": False,
            "requires_court_direction": True,
        }]

    @classmethod
    def validate_registered_case(cls, case, event_type):
        pre_filing = {CourtEventType.INTERNAL, CourtEventType.FILING, CourtEventType.REGISTRY_ACTION}
        if event_type not in pre_filing and (
            not case.official_court_case_number or case.court_stage in {
                Case.CourtStage.NOT_FILED, Case.CourtStage.READY_FOR_FILING
            }
        ):
            raise ValidationError(
                {"case": "Substantive proceedings require registry acceptance and an official court case number."}
            )

    @classmethod
    @transaction.atomic
    def record_outcome(cls, *, case, event_id, actor, data):
        case = Case.objects.select_for_update().get(pk=case.pk)
        event = CaseEvent.objects.select_for_update().get(pk=event_id, case=case)
        cls.ensure_can_record(actor, case)
        if event.status in {CaseEvent.EventStatus.COMPLETED, CaseEvent.EventStatus.CONCLUDED}:
            raise ValidationError({"event": "This proceeding already has a final outcome."})
        outcome_code = data["outcome_code"]
        next_type = data.get("next_event_type") or ""
        if not data.get("outcome"):
            raise ValidationError({"outcome": "A completed proceeding requires an outcome."})
        allowed = {item["value"] for item in cls.allowed_next_events(case, event)}
        if next_type and next_type not in allowed:
            raise ValidationError({"next_event_type": "This event is not eligible in the current procedural context."})
        if next_type == CourtEventType.OTHER_COURT_DIRECTED and not data.get("court_direction_details"):
            raise ValidationError({"court_direction_details": "Record the court direction for an exceptional event."})
        cls.validate_registered_case(case, event.event_type)

        event.proceeded = data["proceeded"]
        event.outcome_code = outcome_code
        event.outcome = data["outcome"]
        event.attendance = data.get("attendance", [])
        event.orders_directions = data.get("orders_directions", "")
        event.court_direction_details = data.get("court_direction_details", "")
        event.actual_start = data.get("actual_date") or timezone.now()
        event.actual_end = timezone.now()
        event.recorded_by = actor
        event.status = (
            CaseEvent.EventStatus.PART_HEARD
            if outcome_code == CourtEventOutcome.PART_HEARD
            else CaseEvent.EventStatus.COMPLETED
        )
        event.save()
        document_ids = data.get("supporting_document_ids", [])
        if document_ids:
            event.supporting_documents.set(case.attachments.filter(id__in=document_ids))

        next_event = None
        next_date = data.get("next_date")
        if next_type:
            if not next_date:
                raise ValidationError({"next_date": "The next date and time are required when creating a next event."})
            cls.validate_registered_case(case, next_type)
            duplicate = CaseEvent.objects.filter(
                case=case, event_type=next_type, starts_at=next_date,
                status__in=[CaseEvent.EventStatus.SCHEDULED, CaseEvent.EventStatus.CONFIRMED],
            ).exists()
            if duplicate:
                raise ValidationError({"next_event_type": "An active event of this type already exists at that time."})
            sequence = (CaseEvent.objects.filter(case=case).aggregate(Max("sequence_number"))["sequence_number__max"] or 0) + 1
            next_event = CaseEvent.objects.create(
                case=case,
                sequence_number=sequence,
                previous_event=event,
                event_type=next_type,
                title=data.get("next_event_title") or CourtEventType(next_type).label,
                starts_at=next_date,
                court=case.court_name,
                court_station=case.court_station,
                courtroom=data.get("courtroom", case.courtroom),
                hearing_mode=data.get("hearing_mode", CaseEvent.HearingMode.NOT_APPLICABLE),
                physical_venue=data.get("physical_venue", ""),
                virtual_meeting_url=data.get("virtual_meeting_url", ""),
                judicial_officer=data.get("judicial_officer", ""),
                created_by=actor,
                court_stage_before=case.court_stage,
            )
            EventService.awareness_for_event(next_event)
            EventService.notify_event(next_event, actor=actor, reason="scheduled")

        previous_stage = case.lifecycle_stage
        if outcome_code == CourtEventOutcome.SETTLED:
            new_stage = InternalCaseLifecycleStage.SETTLED
        elif outcome_code == CourtEventOutcome.WITHDRAWN:
            new_stage = InternalCaseLifecycleStage.WITHDRAWN
        elif outcome_code == CourtEventOutcome.DISMISSED:
            new_stage = InternalCaseLifecycleStage.DISMISSED
        elif outcome_code == CourtEventOutcome.JUDGMENT_DELIVERED:
            new_stage = InternalCaseLifecycleStage.JUDGMENT_DELIVERED
        else:
            new_stage = cls.STAGE_BY_NEXT_EVENT.get(next_type, previous_stage)
        case.lifecycle_stage = new_stage
        case.save(update_fields=["lifecycle_stage", "updated_at"])
        EventService.sync_case_next_court_date(case)

        for deadline in data.get("deadlines", []):
            CaseTask.objects.create(
                case=case,
                title=deadline["title"],
                description=deadline.get("description", ""),
                task_type=deadline.get("task_type", CaseTask.TaskType.OTHER),
                due_at=deadline["due_at"],
                assigned_to=case.assigned_lawyer.user if case.assigned_lawyer_id else actor,
                created_by=actor,
            )
        CaseTimeline.objects.create(
            case=case,
            action=f"{event.get_event_type_display()} outcome",
            description=data["outcome"],
            created_by=actor,
        )
        CaseActivity.objects.create(
            case=case,
            action="PROCEEDING_OUTCOME_RECORDED",
            description=data["outcome"],
            actor=actor,
            metadata={
                "event_id": str(event.id),
                "next_event_id": str(next_event.id) if next_event else None,
                "previous_lifecycle_stage": previous_stage,
                "new_lifecycle_stage": new_stage,
                "exceptional_court_direction": next_type == CourtEventType.OTHER_COURT_DIRECTED,
            },
        )
        return event, next_event, case
