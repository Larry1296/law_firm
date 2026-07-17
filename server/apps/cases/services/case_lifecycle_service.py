from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.cases.models import Case, CaseActivity, CaseEvent, CaseLifecycleTransition, CaseTimeline
from apps.common.choices import UserRole


class CaseLifecycleService:
    FIELD_BY_DIMENSION = {
        CaseLifecycleTransition.Dimension.MATTER_STATUS: "matter_status",
        CaseLifecycleTransition.Dimension.COURT_STAGE: "court_stage",
        CaseLifecycleTransition.Dimension.OUTCOME_STATUS: "outcome_status",
        CaseLifecycleTransition.Dimension.ENFORCEMENT_STATUS: "enforcement_status",
        CaseLifecycleTransition.Dimension.APPEAL_STATUS: "appeal_status",
    }

    LEGAL_TIMELINE_ACTIONS = {
        Case.MatterStatus.INSTRUCTIONS_RECEIVED: "Instructions Received",
        Case.MatterStatus.CONFLICT_CLEARED: "Conflict Cleared",
        Case.MatterStatus.ENGAGEMENT_CONFIRMED: "Engagement Confirmed",
        Case.MatterStatus.SETTLEMENT_IN_PROGRESS: "Settlement Negotiations",
        Case.MatterStatus.CLOSED: "Closure",
        Case.CourtStage.READY_FOR_FILING: "Ready for Filing",
        Case.CourtStage.FILED: "Case Filed",
        Case.CourtStage.AWAITING_RESPONSE: "Service Completed",
        Case.CourtStage.CASE_MANAGEMENT: "Case Management Directions",
        Case.CourtStage.PRE_TRIAL: "Pre-Trial",
        Case.CourtStage.HEARING_IN_PROGRESS: "Hearing",
        Case.CourtStage.JUDGMENT_DELIVERED: "Judgment",
        Case.CourtStage.EXECUTION: "Execution",
    }

    CIVIL_SUIT_TRANSITIONS = {
        CaseLifecycleTransition.Dimension.MATTER_STATUS: {
            Case.MatterStatus.DRAFT: {Case.MatterStatus.INSTRUCTIONS_RECEIVED},
            Case.MatterStatus.INSTRUCTIONS_RECEIVED: {Case.MatterStatus.CONFLICT_CHECK_PENDING},
            Case.MatterStatus.CONFLICT_CHECK_PENDING: {
                Case.MatterStatus.CONFLICT_CLEARED,
                Case.MatterStatus.CONFLICT_IDENTIFIED,
            },
            Case.MatterStatus.CONFLICT_IDENTIFIED: {Case.MatterStatus.CANCELLED},
            Case.MatterStatus.CONFLICT_CLEARED: {Case.MatterStatus.ENGAGEMENT_PENDING},
            Case.MatterStatus.ENGAGEMENT_PENDING: {Case.MatterStatus.ENGAGEMENT_CONFIRMED},
            Case.MatterStatus.ENGAGEMENT_CONFIRMED: {Case.MatterStatus.MATTER_OPEN},
            Case.MatterStatus.MATTER_OPEN: {
                Case.MatterStatus.ON_HOLD,
                Case.MatterStatus.SETTLEMENT_IN_PROGRESS,
                Case.MatterStatus.CLOSURE_PENDING,
            },
            Case.MatterStatus.ON_HOLD: {Case.MatterStatus.MATTER_OPEN},
            Case.MatterStatus.SETTLEMENT_IN_PROGRESS: {
                Case.MatterStatus.MATTER_OPEN,
                Case.MatterStatus.CLOSED,
            },
            Case.MatterStatus.CLOSURE_PENDING: {Case.MatterStatus.CLOSED},
            Case.MatterStatus.CLOSED: {Case.MatterStatus.ARCHIVED},
        },
        CaseLifecycleTransition.Dimension.COURT_STAGE: {
            Case.CourtStage.NOT_FILED: {Case.CourtStage.READY_FOR_FILING},
            Case.CourtStage.READY_FOR_FILING: {Case.CourtStage.FILED},
            Case.CourtStage.FILED: {
                Case.CourtStage.AWAITING_ASSESSMENT_OR_PAYMENT,
                Case.CourtStage.AWAITING_SERVICE,
            },
            Case.CourtStage.AWAITING_ASSESSMENT_OR_PAYMENT: {Case.CourtStage.AWAITING_SERVICE},
            Case.CourtStage.AWAITING_SERVICE: {Case.CourtStage.SERVICE_IN_PROGRESS},
            Case.CourtStage.SERVICE_IN_PROGRESS: {Case.CourtStage.AWAITING_RESPONSE},
            Case.CourtStage.AWAITING_RESPONSE: {Case.CourtStage.PLEADINGS_OPEN},
            Case.CourtStage.PLEADINGS_OPEN: {Case.CourtStage.PLEADINGS_CLOSED},
            Case.CourtStage.PLEADINGS_CLOSED: {Case.CourtStage.CASE_MANAGEMENT},
            Case.CourtStage.CASE_MANAGEMENT: {Case.CourtStage.PRE_TRIAL},
            Case.CourtStage.PRE_TRIAL: {Case.CourtStage.AWAITING_HEARING},
            Case.CourtStage.AWAITING_HEARING: {Case.CourtStage.HEARING_IN_PROGRESS},
            Case.CourtStage.HEARING_IN_PROGRESS: {Case.CourtStage.SUBMISSIONS},
            Case.CourtStage.SUBMISSIONS: {Case.CourtStage.JUDGMENT_RESERVED},
            Case.CourtStage.JUDGMENT_RESERVED: {Case.CourtStage.JUDGMENT_DELIVERED},
            Case.CourtStage.JUDGMENT_DELIVERED: {
                Case.CourtStage.DECREE_EXTRACTION,
                Case.CourtStage.APPEAL_OR_REVIEW,
            },
            Case.CourtStage.DECREE_EXTRACTION: {Case.CourtStage.EXECUTION},
            Case.CourtStage.EXECUTION: {Case.CourtStage.CONCLUDED},
            Case.CourtStage.APPEAL_OR_REVIEW: {
                Case.CourtStage.DECREE_EXTRACTION,
                Case.CourtStage.CONCLUDED,
            },
        },
        CaseLifecycleTransition.Dimension.OUTCOME_STATUS: {
            Case.OutcomeStatus.PENDING: {
                Case.OutcomeStatus.WON,
                Case.OutcomeStatus.PARTLY_WON,
                Case.OutcomeStatus.LOST,
                Case.OutcomeStatus.SETTLED,
                Case.OutcomeStatus.WITHDRAWN,
                Case.OutcomeStatus.STRUCK_OUT,
                Case.OutcomeStatus.DISMISSED,
                Case.OutcomeStatus.CONSENT_RECORDED,
                Case.OutcomeStatus.ABATED,
                Case.OutcomeStatus.OTHER,
            }
        },
        CaseLifecycleTransition.Dimension.ENFORCEMENT_STATUS: {
            Case.EnforcementStatus.NOT_APPLICABLE: {
                Case.EnforcementStatus.NOT_STARTED,
                Case.EnforcementStatus.DECREE_PENDING,
            },
            Case.EnforcementStatus.NOT_STARTED: {Case.EnforcementStatus.DECREE_PENDING},
            Case.EnforcementStatus.DECREE_PENDING: {Case.EnforcementStatus.DECREE_ISSUED},
            Case.EnforcementStatus.DECREE_ISSUED: {
                Case.EnforcementStatus.DEMAND_FOR_COMPLIANCE,
                Case.EnforcementStatus.EXECUTION_IN_PROGRESS,
            },
            Case.EnforcementStatus.DEMAND_FOR_COMPLIANCE: {
                Case.EnforcementStatus.PART_PAYMENT,
                Case.EnforcementStatus.SATISFIED,
                Case.EnforcementStatus.EXECUTION_IN_PROGRESS,
            },
            Case.EnforcementStatus.PART_PAYMENT: {
                Case.EnforcementStatus.SATISFIED,
                Case.EnforcementStatus.EXECUTION_IN_PROGRESS,
            },
            Case.EnforcementStatus.EXECUTION_IN_PROGRESS: {
                Case.EnforcementStatus.SATISFIED,
                Case.EnforcementStatus.STAYED,
                Case.EnforcementStatus.UNSUCCESSFUL,
            },
            Case.EnforcementStatus.STAYED: {Case.EnforcementStatus.EXECUTION_IN_PROGRESS},
            Case.EnforcementStatus.SATISFIED: {Case.EnforcementStatus.CLOSED},
            Case.EnforcementStatus.UNSUCCESSFUL: {Case.EnforcementStatus.CLOSED},
        },
        CaseLifecycleTransition.Dimension.APPEAL_STATUS: {
            Case.AppealStatus.NONE: {
                Case.AppealStatus.UNDER_CONSIDERATION,
                Case.AppealStatus.REVIEW_FILED,
                Case.AppealStatus.APPEAL_FILED,
                Case.AppealStatus.STAY_REQUESTED,
            },
            Case.AppealStatus.UNDER_CONSIDERATION: {
                Case.AppealStatus.NONE,
                Case.AppealStatus.REVIEW_FILED,
                Case.AppealStatus.APPEAL_FILED,
            },
            Case.AppealStatus.STAY_REQUESTED: {
                Case.AppealStatus.STAY_GRANTED,
                Case.AppealStatus.STAY_DENIED,
            },
            Case.AppealStatus.APPEAL_FILED: {Case.AppealStatus.APPEAL_PENDING},
            Case.AppealStatus.APPEAL_PENDING: {Case.AppealStatus.APPEAL_DETERMINED},
        },
    }

    @classmethod
    def track_config(cls, case):
        return cls.CIVIL_SUIT_TRANSITIONS

    @classmethod
    def can_transition(cls, user, case, dimension):
        if user.role == UserRole.ADMIN and case.firm.owner_id == user.id:
            return True
        lawyer = getattr(user, "lawyer_profile", None)
        if lawyer and case.assigned_lawyer_id == lawyer.id:
            return True
        secretary = getattr(user, "secretary_profile", None)
        if secretary and dimension == CaseLifecycleTransition.Dimension.COURT_STAGE:
            return case.assigned_secretary_id == secretary.id
        return False

    @classmethod
    def get_available_transitions(cls, case, actor=None):
        if case.matter_status in {
            Case.MatterStatus.CLOSED,
            Case.MatterStatus.ARCHIVED,
            Case.MatterStatus.CANCELLED,
        }:
            if case.matter_status != Case.MatterStatus.CLOSED:
                return []
            allowed_archive = {
                "dimension": CaseLifecycleTransition.Dimension.MATTER_STATUS.value,
                "from_state": Case.MatterStatus.CLOSED.value,
                "to_state": Case.MatterStatus.ARCHIVED.value,
                "label": cls.state_label(
                    CaseLifecycleTransition.Dimension.MATTER_STATUS,
                    Case.MatterStatus.ARCHIVED,
                ),
            }
            return [allowed_archive] if actor is None or cls.can_transition(actor, case, CaseLifecycleTransition.Dimension.MATTER_STATUS) else []

        transitions = []
        config = cls.track_config(case)
        for dimension, field in cls.FIELD_BY_DIMENSION.items():
            if actor is not None and not cls.can_transition(actor, case, dimension):
                continue
            if not cls.dimension_is_available(case, dimension):
                continue
            current = getattr(case, field)
            for to_state in sorted(config.get(dimension, {}).get(current, set())):
                if not cls.transition_is_contextually_available(case, dimension, to_state):
                    continue
                transitions.append(
                    {
                        "dimension": getattr(dimension, "value", dimension),
                        "from_state": getattr(current, "value", current),
                        "to_state": getattr(to_state, "value", to_state),
                        "label": cls.state_label(dimension, to_state),
                    }
                )
        return transitions

    @classmethod
    def dimension_is_available(cls, case, dimension):
        if dimension == CaseLifecycleTransition.Dimension.MATTER_STATUS:
            return True
        if dimension == CaseLifecycleTransition.Dimension.COURT_STAGE:
            return case.matter_status == Case.MatterStatus.MATTER_OPEN
        if dimension == CaseLifecycleTransition.Dimension.OUTCOME_STATUS:
            return case.court_stage in {
                Case.CourtStage.JUDGMENT_DELIVERED,
                Case.CourtStage.CONCLUDED,
            } or case.matter_status == Case.MatterStatus.SETTLEMENT_IN_PROGRESS
        if dimension == CaseLifecycleTransition.Dimension.ENFORCEMENT_STATUS:
            return case.court_stage in {
                Case.CourtStage.JUDGMENT_DELIVERED,
                Case.CourtStage.DECREE_EXTRACTION,
                Case.CourtStage.EXECUTION,
                Case.CourtStage.CONCLUDED,
            }
        if dimension == CaseLifecycleTransition.Dimension.APPEAL_STATUS:
            return case.court_stage in {
                Case.CourtStage.JUDGMENT_DELIVERED,
                Case.CourtStage.APPEAL_OR_REVIEW,
                Case.CourtStage.CONCLUDED,
            }
        return False

    @classmethod
    def transition_is_contextually_available(cls, case, dimension, to_state):
        if dimension == CaseLifecycleTransition.Dimension.MATTER_STATUS:
            from apps.cases.services.case_conflict_check_service import CaseConflictCheckService

            check = CaseConflictCheckService.existing_check(case)
            if to_state == Case.MatterStatus.CONFLICT_CLEARED:
                return check is not None and check.status in {"CLEAR", "WAIVED"}
            if to_state == Case.MatterStatus.CONFLICT_IDENTIFIED:
                return check is not None and check.status in {
                    "POTENTIAL_CONFLICT",
                    "CONFLICT_CONFIRMED",
                    "WAIVER_PENDING",
                }
        if dimension == CaseLifecycleTransition.Dimension.COURT_STAGE and to_state == Case.CourtStage.READY_FOR_FILING:
            return case.matter_status == Case.MatterStatus.MATTER_OPEN
        if dimension == CaseLifecycleTransition.Dimension.OUTCOME_STATUS and to_state in {
            Case.OutcomeStatus.WON,
            Case.OutcomeStatus.PARTLY_WON,
            Case.OutcomeStatus.LOST,
        }:
            return case.court_stage in {Case.CourtStage.JUDGMENT_DELIVERED, Case.CourtStage.CONCLUDED}
        if dimension == CaseLifecycleTransition.Dimension.ENFORCEMENT_STATUS:
            return case.court_stage in {
                Case.CourtStage.JUDGMENT_DELIVERED,
                Case.CourtStage.DECREE_EXTRACTION,
                Case.CourtStage.EXECUTION,
                Case.CourtStage.CONCLUDED,
            }
        if dimension == CaseLifecycleTransition.Dimension.APPEAL_STATUS:
            return case.court_stage in {
                Case.CourtStage.JUDGMENT_DELIVERED,
                Case.CourtStage.APPEAL_OR_REVIEW,
                Case.CourtStage.CONCLUDED,
            }
        return True

    @classmethod
    def state_label(cls, dimension, state):
        field = cls.FIELD_BY_DIMENSION[dimension]
        choices = dict(Case._meta.get_field(field).choices)
        return choices.get(state, state.replace("_", " ").title())

    @classmethod
    def validate_transition(cls, *, case, actor, dimension, to_state, metadata, is_correction=False):
        if dimension not in cls.FIELD_BY_DIMENSION:
            raise ValidationError({"dimension": "Unsupported lifecycle dimension."})
        if not cls.can_transition(actor, case, dimension):
            raise PermissionError("You do not have permission to perform this lifecycle transition.")
        if case.matter_status in {Case.MatterStatus.CLOSED, Case.MatterStatus.ARCHIVED, Case.MatterStatus.CANCELLED} and not is_correction:
            allowed = {Case.MatterStatus.ARCHIVED}
            if dimension != CaseLifecycleTransition.Dimension.MATTER_STATUS or to_state not in allowed:
                raise ValidationError({"case": "Closed, archived or cancelled matters reject ordinary transitions."})
        if not is_correction and not cls.dimension_is_available(case, dimension):
            raise ValidationError(
                {
                    "dimension": (
                        "This lifecycle dimension is not available in the current "
                        "matter or court stage."
                    )
                }
            )

        field = cls.FIELD_BY_DIMENSION[dimension]
        current = getattr(case, field)
        allowed = cls.track_config(case).get(dimension, {}).get(current, set())
        if not is_correction and to_state not in allowed:
            raise ValidationError({"to_state": f"Cannot transition {dimension} from {current} to {to_state}."})
        if not is_correction and not cls.transition_is_contextually_available(case, dimension, to_state):
            raise ValidationError({"to_state": "This transition is not available until its lifecycle prerequisites are met."})

        if dimension == CaseLifecycleTransition.Dimension.COURT_STAGE:
            cls.validate_court_stage_requirements(case=case, to_state=to_state, metadata=metadata)
        if dimension == CaseLifecycleTransition.Dimension.MATTER_STATUS and not is_correction:
            cls.validate_matter_status_requirements(case=case, to_state=to_state)

    @classmethod
    def validate_matter_status_requirements(cls, *, case, to_state):
        if to_state == Case.MatterStatus.CONFLICT_CLEARED:
            from apps.cases.services.case_conflict_check_service import CaseConflictCheckService

            check = CaseConflictCheckService.existing_check(case)
            if check is None or check.status not in {"CLEAR", "WAIVED"}:
                raise ValidationError(
                    {"conflict_check": "Conflict check must be clear or waived before the matter can be conflict-cleared."}
                )
        if to_state == Case.MatterStatus.CONFLICT_IDENTIFIED:
            from apps.cases.services.case_conflict_check_service import CaseConflictCheckService

            check = CaseConflictCheckService.existing_check(case)
            if check is None or check.status not in {"POTENTIAL_CONFLICT", "CONFLICT_CONFIRMED", "WAIVER_PENDING"}:
                raise ValidationError(
                    {"conflict_check": "A potential, confirmed or waiver-pending conflict check is required."}
                )

    @classmethod
    def validate_court_stage_requirements(cls, *, case, to_state, metadata):
        metadata = metadata or {}
        if to_state == Case.CourtStage.FILED:
            filing_date = metadata.get("filing_date") or case.filing_date
            official_number = (
                metadata.get("official_court_case_number")
                or metadata.get("cts_reference")
                or metadata.get("efiling_reference")
                or case.official_court_case_number
                or case.cts_reference
                or case.efiling_reference
            )
            court_station = metadata.get("court_station") or case.court_station
            registry = metadata.get("registry") or case.registry or case.court_name
            missing = []
            if not filing_date:
                missing.append("filing_date")
            if not official_number:
                missing.append("official_court_case_number")
            if not court_station:
                missing.append("court_station")
            if not registry:
                missing.append("registry")
            if missing and not metadata.get("override_reason"):
                raise ValidationError(
                    {
                        "metadata": (
                            "Filed transition requires filing_date, recognized court "
                            "reference, court_station and registry unless an audited "
                            "override_reason is supplied."
                        ),
                        "missing": missing,
                    }
                )
        if to_state == Case.CourtStage.AWAITING_RESPONSE:
            if not (
                metadata.get("service_successful")
                or metadata.get("recognized_service_event")
                or metadata.get("affidavit_of_service_filed")
            ):
                raise ValidationError(
                    {"metadata": "Awaiting response requires successful or legally recognized service evidence."}
                )

    @classmethod
    def apply_metadata(cls, case, dimension, to_state, metadata, actor):
        metadata = metadata or {}
        update_fields = []
        if dimension == CaseLifecycleTransition.Dimension.COURT_STAGE and to_state == Case.CourtStage.FILED:
            for field in [
                "filing_date",
                "official_court_case_number",
                "efiling_reference",
                "cts_reference",
                "assessment_reference",
                "payment_reference",
                "payment_date",
                "court_station",
                "registry",
                "court_name",
                "court_fee_amount",
            ]:
                if field in metadata:
                    setattr(case, field, metadata[field])
                    update_fields.append(field)
            if actor:
                case.filed_by = actor
                update_fields.append("filed_by")
        if dimension == CaseLifecycleTransition.Dimension.COURT_STAGE and to_state == Case.CourtStage.EXECUTION:
            if case.enforcement_status == Case.EnforcementStatus.NOT_APPLICABLE:
                case.enforcement_status = Case.EnforcementStatus.NOT_STARTED
                update_fields.append("enforcement_status")
        return update_fields

    @classmethod
    @transaction.atomic
    def transition(cls, *, case, actor, dimension, to_state, effective_at=None, reason="", metadata=None, source_event=None, correction_of=None):
        metadata = metadata or {}
        effective_at = effective_at or timezone.now()
        if not reason:
            raise ValidationError({"reason": "A transition reason is required."})
        is_correction = correction_of is not None
        cls.validate_transition(
            case=case,
            actor=actor,
            dimension=dimension,
            to_state=to_state,
            metadata=metadata,
            is_correction=is_correction,
        )
        field = cls.FIELD_BY_DIMENSION[dimension]
        from_state = getattr(case, field)
        if from_state == to_state and not is_correction:
            raise ValidationError({"to_state": "The case is already in this state."})

        metadata_updates = cls.apply_metadata(case, dimension, to_state, metadata, actor)
        setattr(case, field, to_state)
        if dimension == CaseLifecycleTransition.Dimension.COURT_STAGE:
            case.status = cls.legacy_status_for_court_stage(to_state, case.status)
            metadata_updates.append("status")
        if dimension == CaseLifecycleTransition.Dimension.MATTER_STATUS:
            case.is_active = to_state not in {
                Case.MatterStatus.CLOSED,
                Case.MatterStatus.ARCHIVED,
                Case.MatterStatus.CANCELLED,
            }
            metadata_updates.append("is_active")
            if to_state in {Case.MatterStatus.CLOSED, Case.MatterStatus.ARCHIVED}:
                case.closed_at = case.closed_at or timezone.now()
                metadata_updates.append("closed_at")
        case.save(update_fields=list(set([field, "updated_at", *metadata_updates])))

        transition = CaseLifecycleTransition.objects.create(
            case=case,
            dimension=dimension,
            from_state=from_state,
            to_state=to_state,
            effective_at=effective_at,
            actor=actor,
            reason=reason,
            metadata=metadata,
            source_event=source_event,
            correction_of=correction_of,
            is_correction=is_correction,
        )
        CaseActivity.objects.create(
            case=case,
            action="Lifecycle Transition Corrected" if is_correction else "Lifecycle Transition",
            description=reason,
            actor=actor,
            metadata={
                "transition_id": str(transition.id),
                "dimension": dimension,
                "from_state": from_state,
                "to_state": to_state,
            },
        )
        timeline_action = cls.LEGAL_TIMELINE_ACTIONS.get(to_state)
        if timeline_action:
            CaseTimeline.objects.create(
                case=case,
                action=timeline_action,
                description=reason,
                created_by=actor,
            )
        if (
            dimension == CaseLifecycleTransition.Dimension.MATTER_STATUS
            and to_state == Case.MatterStatus.CONFLICT_CHECK_PENDING
            and not is_correction
        ):
            from apps.cases.services.case_conflict_check_service import CaseConflictCheckService

            CaseConflictCheckService.initiate_check(
                case=case,
                actor=actor,
                reason=reason,
                data=metadata,
            )
        return transition

    @classmethod
    def legacy_status_for_court_stage(cls, court_stage, current_status):
        return {
            Case.CourtStage.NOT_FILED: Case.Status.PENDING,
            Case.CourtStage.READY_FOR_FILING: Case.Status.PENDING_FILING,
            Case.CourtStage.FILED: Case.Status.FILED,
            Case.CourtStage.AWAITING_SERVICE: Case.Status.SERVICE_PENDING,
            Case.CourtStage.SERVICE_IN_PROGRESS: Case.Status.SERVICE_PENDING,
            Case.CourtStage.AWAITING_RESPONSE: Case.Status.AWAITING_RESPONSE,
            Case.CourtStage.CASE_MANAGEMENT: Case.Status.DIRECTIONS,
            Case.CourtStage.PRE_TRIAL: Case.Status.PRE_TRIAL,
            Case.CourtStage.AWAITING_HEARING: Case.Status.HEARING,
            Case.CourtStage.HEARING_IN_PROGRESS: Case.Status.HEARING,
            Case.CourtStage.SUBMISSIONS: Case.Status.SUBMISSIONS,
            Case.CourtStage.JUDGMENT_RESERVED: Case.Status.AWAITING_JUDGMENT,
            Case.CourtStage.JUDGMENT_DELIVERED: Case.Status.JUDGMENT_DELIVERED,
            Case.CourtStage.DECREE_EXTRACTION: Case.Status.DECREE_EXTRACTION,
            Case.CourtStage.EXECUTION: Case.Status.EXECUTION,
            Case.CourtStage.APPEAL_OR_REVIEW: Case.Status.ON_APPEAL,
            Case.CourtStage.CONCLUDED: Case.Status.CLOSED,
        }.get(court_stage, current_status)

    @classmethod
    def record_initial_case_opening(cls, case, actor):
        if case.lifecycle_transitions.exists():
            return None
        transition = CaseLifecycleTransition.objects.create(
            case=case,
            dimension=CaseLifecycleTransition.Dimension.MATTER_STATUS,
            from_state="",
            to_state=case.matter_status,
            effective_at=case.created_at or timezone.now(),
            actor=actor,
            reason="Case opened and instructions received.",
            metadata={"source": "case_creation"},
        )
        CaseTimeline.objects.create(
            case=case,
            action="Instructions Received",
            description="Initial client instructions were recorded when the case was created.",
            created_by=actor,
        )
        return transition
