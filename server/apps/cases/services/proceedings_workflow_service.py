from django.db import transaction
from django.db.models import Case as QueryCase, IntegerField, Max, Q, Value, When
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
            CourtEventType.FURTHER_MENTION,
            CourtEventType.HEARING,
            CourtEventType.APPLICATION_HEARING,
            CourtEventType.PRELIMINARY_OBJECTION,
            CourtEventType.DIRECTIONS,
        ],
        CourtEventType.FURTHER_MENTION: [
            CourtEventType.FURTHER_MENTION, CourtEventType.HEARING, CourtEventType.APPLICATION_HEARING
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
        CourtEventType.APPEAL: [CourtEventType.REGISTRATION, CourtEventType.DIRECTIONS],
        CourtEventType.REVIEW: [CourtEventType.APPLICATION_HEARING, CourtEventType.RULING],
    }
    TRACK_TRANSITIONS = {
        (CaseEvent.Track.APPEAL, CourtEventType.APPEAL): [
            CourtEventType.REGISTRATION, CourtEventType.DIRECTIONS
        ],
        (CaseEvent.Track.APPEAL, CourtEventType.REGISTRATION): [
            CourtEventType.DIRECTIONS, CourtEventType.MENTION
        ],
        (CaseEvent.Track.APPEAL, CourtEventType.DIRECTIONS): [
            CourtEventType.HEARING, CourtEventType.MENTION
        ],
        (CaseEvent.Track.APPEAL, CourtEventType.HEARING): [
            CourtEventType.SUBMISSIONS, CourtEventType.JUDGMENT, CourtEventType.FURTHER_HEARING
        ],
        (CaseEvent.Track.APPEAL, CourtEventType.FURTHER_HEARING): [
            CourtEventType.FURTHER_HEARING, CourtEventType.SUBMISSIONS
        ],
        (CaseEvent.Track.APPEAL, CourtEventType.SUBMISSIONS): [CourtEventType.JUDGMENT],
        (CaseEvent.Track.APPEAL, CourtEventType.JUDGMENT): [
            CourtEventType.EXECUTION, CourtEventType.HEARING, CourtEventType.CLOSURE
        ],
        (CaseEvent.Track.REVIEW, CourtEventType.REVIEW): [
            CourtEventType.APPLICATION_HEARING, CourtEventType.RULING
        ],
        (CaseEvent.Track.REVIEW, CourtEventType.APPLICATION_HEARING): [
            CourtEventType.RULING, CourtEventType.FURTHER_MENTION
        ],
        (CaseEvent.Track.REVIEW, CourtEventType.RULING): [
            CourtEventType.HEARING, CourtEventType.EXECUTION, CourtEventType.APPEAL,
            CourtEventType.CLOSURE,
        ],
        (CaseEvent.Track.EXECUTION, CourtEventType.EXECUTION): [
            CourtEventType.EXECUTION, CourtEventType.APPEAL, CourtEventType.CLOSURE
        ],
    }
    INTERLOCUTORY_TYPES = {
        CourtEventType.APPLICATION_HEARING,
        CourtEventType.PRELIMINARY_OBJECTION,
        CourtEventType.OTHER_COURT_DIRECTED,
    }

    @classmethod
    def is_interlocutory_event(cls, event):
        return (
            event.event_type in cls.INTERLOCUTORY_TYPES
            or (
                event.previous_event_id
                and event.previous_event.event_type in cls.INTERLOCUTORY_TYPES
                and event.event_type == CourtEventType.RULING
            )
        )
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
    STAGE_BY_TRACK_EVENT = {
        (CaseEvent.Track.APPEAL, event_type): InternalCaseLifecycleStage.ON_APPEAL
        for event_type in (
            CourtEventType.APPEAL, CourtEventType.REGISTRATION, CourtEventType.DIRECTIONS,
            CourtEventType.MENTION, CourtEventType.FURTHER_MENTION, CourtEventType.HEARING,
            CourtEventType.FURTHER_HEARING, CourtEventType.SUBMISSIONS, CourtEventType.JUDGMENT,
        )
    }
    STAGE_BY_TRACK_EVENT.update({
        (CaseEvent.Track.REVIEW, event_type): InternalCaseLifecycleStage.STAYED
        for event_type in (
            CourtEventType.REVIEW, CourtEventType.APPLICATION_HEARING,
            CourtEventType.FURTHER_MENTION, CourtEventType.RULING,
        )
    })

    @classmethod
    def event_label(cls, event_type, track=CaseEvent.Track.TRIAL, *, repeated=False):
        label = CourtEventType(event_type).label
        if event_type == CourtEventType.EXECUTION and repeated:
            label = "Execution — further attempt"
        if track != CaseEvent.Track.TRIAL:
            label = f"{label} — {CaseEvent.Track(track).label}"
        return label

    @classmethod
    def _outcome_recommendation(cls, event):
        if event.outcome_code in {
            CourtEventOutcome.ADJOURNED,
            CourtEventOutcome.DID_NOT_PROCEED,
            CourtEventOutcome.TAKEN_OUT,
            CourtEventOutcome.VACATED,
        }:
            return event.event_type, event.track, cls.event_label(event.event_type, event.track)
        if event.outcome_code == CourtEventOutcome.PART_HEARD:
            return (
                CourtEventType.FURTHER_HEARING,
                event.track,
                cls.event_label(CourtEventType.FURTHER_HEARING, event.track) + " (part heard)",
            )
        if event.event_type in {CourtEventType.MENTION, CourtEventType.FURTHER_MENTION} and (
            "compliance pending" in (event.outcome or "").lower()
        ):
            return CourtEventType.FURTHER_MENTION, event.track, "Further mention (compliance)"
        outcome = (event.outcome or "").lower()
        if event.track == CaseEvent.Track.APPEAL and event.event_type == CourtEventType.JUDGMENT:
            if "remit" in outcome or "retrial" in outcome:
                return CourtEventType.HEARING, CaseEvent.Track.TRIAL, "Hearing (retrial)"
            if "dismiss" in outcome:
                return CourtEventType.EXECUTION, CaseEvent.Track.EXECUTION, "Execution"
        if event.track == CaseEvent.Track.REVIEW and event.event_type == CourtEventType.RULING:
            if "allow" in outcome or "reopen" in outcome:
                return CourtEventType.HEARING, CaseEvent.Track.TRIAL, "Hearing (reopened after review)"
            if "dismiss" in outcome:
                return CourtEventType.EXECUTION, CaseEvent.Track.EXECUTION, "Execution"
        return None

    @classmethod
    def _transition_options(cls, event):
        outcome_choice = cls._outcome_recommendation(event)
        if outcome_choice:
            return [outcome_choice]
        values = cls.TRACK_TRANSITIONS.get(
            (event.track, event.event_type),
            cls.TRANSITIONS.get(event.event_type, []),
        )
        result = []
        for value in values:
            track = event.track
            if value == CourtEventType.APPEAL:
                track = CaseEvent.Track.APPEAL
            elif value == CourtEventType.REVIEW:
                track = CaseEvent.Track.REVIEW
            elif value == CourtEventType.EXECUTION:
                track = CaseEvent.Track.EXECUTION
            elif event.track in {CaseEvent.Track.APPEAL, CaseEvent.Track.REVIEW} and value == CourtEventType.HEARING:
                track = event.track
            result.append((
                value,
                track,
                cls.event_label(
                    value,
                    track,
                    repeated=value == event.event_type == CourtEventType.EXECUTION,
                ),
            ))
        return result

    @classmethod
    def recommended_next_action(cls, case):
        current = (
            case.events.filter(
                status__in=[
                    CaseEvent.EventStatus.COMPLETED,
                    CaseEvent.EventStatus.CONCLUDED,
                    CaseEvent.EventStatus.ADJOURNED,
                    CaseEvent.EventStatus.PART_HEARD,
                ]
            )
            .exclude(
                Q(event_type__in=cls.INTERLOCUTORY_TYPES)
                | Q(
                    event_type=CourtEventType.RULING,
                    previous_event__event_type__in=cls.INTERLOCUTORY_TYPES,
                )
            )
            .order_by("-actual_end", "-starts_at", "-created_at")
            .first()
        )
        if current:
            options = cls._transition_options(current)
            if not options:
                return None
            event_type, track, label = options[0]
            return {"event_type": event_type, "track": track, "label": label}
        if case.lifecycle_stage == InternalCaseLifecycleStage.CLOSED:
            return None
        if case.court_stage in {Case.CourtStage.NOT_FILED, Case.CourtStage.READY_FOR_FILING}:
            return {
                "event_type": CourtEventType.FILING,
                "track": CaseEvent.Track.TRIAL,
                "label": CourtEventType.FILING.label,
            }
        return {
            "event_type": CourtEventType.DIRECTIONS,
            "track": CaseEvent.Track.TRIAL,
            "label": CourtEventType.DIRECTIONS.label,
        }

    @classmethod
    def _resync_next_action(cls, case, *, actor=None):
        pending = (
            case.events.filter(
                starts_at__gte=timezone.now(),
                status__in=[CaseEvent.EventStatus.SCHEDULED, CaseEvent.EventStatus.CONFIRMED],
            )
            .annotate(
                headline_priority=QueryCase(
                    When(
                        Q(event_type__in=cls.INTERLOCUTORY_TYPES)
                        | Q(
                            event_type=CourtEventType.RULING,
                            previous_event__event_type__in=cls.INTERLOCUTORY_TYPES,
                        ),
                        then=Value(1),
                    ),
                    default=Value(0),
                    output_field=IntegerField(),
                )
            )
            .order_by("starts_at", "headline_priority", "created_at")
            .first()
        )
        recommendation = None if pending else cls.recommended_next_action(case)
        next_action = pending.title if pending else (recommendation or {}).get("label", "")
        next_date = pending.starts_at if pending else None
        previous = {
            "next_action": case.next_action,
            "next_court_date": case.next_court_date.isoformat() if case.next_court_date else None,
        }
        if case.next_action == next_action and case.next_court_date == next_date:
            return pending or recommendation
        case.next_action = next_action
        case.next_court_date = next_date
        case.save(update_fields=["next_action", "next_court_date", "updated_at"])
        CaseActivity.objects.create(
            case=case,
            action="NEXT_ACTION_WORKFLOW_SYNC",
            description=next_action or "No further action",
            actor=actor,
            metadata={
                "source": "workflow_sync",
                "previous_value": previous,
                "new_value": {
                    "next_action": next_action,
                    "next_court_date": next_date.isoformat() if next_date else None,
                },
                "event_id": str(pending.id) if pending else None,
            },
        )
        return pending or recommendation

    @classmethod
    def ensure_can_record(cls, actor, case):
        EventService.ensure_can_manage(actor, case)

    @classmethod
    def allowed_next_events(cls, case, current_event=None):
        current_event = current_event or case.events.order_by("-starts_at", "-created_at").first()
        current_type = current_event.event_type if current_event else None
        transition_options = cls._transition_options(current_event) if current_event else []
        options = [item[0] for item in transition_options]
        if case.case_type == Case.CaseType.CRIMINAL:
            options = list(cls.CRIMINAL_EXTRA.get(current_type, options))
        for item in cls.ALWAYS_AVAILABLE:
            if item not in options:
                options.append(item)
        result = [
            {
                "value": value,
                "label": next(
                    (item[2] for item in transition_options if item[0] == value),
                    CourtEventType(value).label,
                ),
                "track": next(
                    (item[1] for item in transition_options if item[0] == value),
                    CaseEvent.Track.TRIAL,
                ),
                "recommended": index == 0,
                "reason": "Most likely procedural step" if index == 0 else "",
            }
            for index, value in enumerate(options)
        ]
        return result + [{
            "value": CourtEventType.OTHER_COURT_DIRECTED,
            "label": CourtEventType.OTHER_COURT_DIRECTED.label,
            "recommended": False,
            "requires_court_direction": True,
            "track": current_event.track if current_event else CaseEvent.Track.TRIAL,
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
        if outcome_code in {
            CourtEventOutcome.ADJOURNED,
            CourtEventOutcome.DID_NOT_PROCEED,
        }:
            event.adjournment_reason = data.get("adjournment_reason") or data["outcome"]
        event.actual_start = data.get("actual_date") or timezone.now()
        event.actual_end = timezone.now()
        event.recorded_by = actor
        event.status = {
            CourtEventOutcome.PART_HEARD: CaseEvent.EventStatus.PART_HEARD,
            CourtEventOutcome.ADJOURNED: CaseEvent.EventStatus.ADJOURNED,
        }.get(outcome_code, CaseEvent.EventStatus.COMPLETED)
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
            selected_option = next(
                (item for item in cls.allowed_next_events(case, event) if item["value"] == next_type),
                {},
            )
            next_track = data.get("next_event_track") or selected_option.get("track") or event.track
            next_title = (
                data.get("court_direction_details")
                if next_type == CourtEventType.OTHER_COURT_DIRECTED
                else selected_option.get("label") or cls.event_label(next_type, next_track)
            )
            next_event = CaseEvent.objects.create(
                case=case,
                sequence_number=sequence,
                previous_event=event,
                event_type=next_type,
                track=next_track,
                title=next_title,
                description=(
                    event.adjournment_reason
                    if outcome_code in {
                        CourtEventOutcome.ADJOURNED,
                        CourtEventOutcome.DID_NOT_PROCEED,
                    }
                    else ""
                ),
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
        elif event.event_type == CourtEventType.CLOSURE:
            new_stage = InternalCaseLifecycleStage.CLOSED
        elif (
            outcome_code == CourtEventOutcome.JUDGMENT_DELIVERED
            and event.track == CaseEvent.Track.TRIAL
        ):
            new_stage = InternalCaseLifecycleStage.JUDGMENT_DELIVERED
        else:
            next_track = next_event.track if next_event else (cls.recommended_next_action(case) or {}).get("track")
            derived_type = next_type or (cls.recommended_next_action(case) or {}).get("event_type")
            if cls.is_interlocutory_event(event):
                new_stage = previous_stage
            else:
                new_stage = cls.STAGE_BY_TRACK_EVENT.get(
                    (next_track, derived_type),
                    cls.STAGE_BY_NEXT_EVENT.get(derived_type, previous_stage),
                )
        case.lifecycle_stage = new_stage
        case.save(update_fields=["lifecycle_stage", "updated_at"])
        cls._resync_next_action(case, actor=actor)

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
