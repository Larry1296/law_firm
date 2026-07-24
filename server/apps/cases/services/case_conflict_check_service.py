from datetime import timedelta

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.cases.models import (
    Case,
    CaseActivity,
    CaseConflictCheck,
    CaseTask,
    CaseTimeline,
)
from apps.common.choices import UserRole
from apps.notifications.models import Notification
from apps.notifications.services import NotificationService


class CaseConflictCheckService:
    REVIEW_ACTIVITY = "CONFLICT_CHECK_REVIEWED"
    CLEAR_ACTIVITY = "CONFLICT_CHECK_CLEARED"

    ACTIONS = {
        "INITIATE",
        "REVIEW",
        "MARK_CLEAR",
        "POTENTIAL_CONFLICT",
        "CONFIRM_CONFLICT",
        "REQUEST_WAIVER",
        "RECORD_WAIVER",
        "REJECT",
        "CANCEL",
    }

    # ==========================================================
    # BASIC LOOKUPS
    # ==========================================================

    @staticmethod
    def has_originating_intake_conflict(case):
        try:
            return bool(case.originating_conflict_check)
        except Exception:
            return False

    @staticmethod
    def existing_check(case):
        return CaseConflictCheck.objects.filter(case=case).first()

    @staticmethod
    def client_safe_status(check):
        if check is None:
            return "Matter acceptance review not recorded"
        if check.status in {CaseConflictCheck.Status.CLEAR, CaseConflictCheck.Status.WAIVED}:
            return "Matter accepted"
        if check.status in {CaseConflictCheck.Status.REJECTED, CaseConflictCheck.Status.CONFLICT_CONFIRMED}:
            return "Matter cannot be accepted"
        return "Matter acceptance review in progress"

    # ==========================================================
    # PERMISSIONS
    # ==========================================================

    @staticmethod
    def can_initiate(user, case):
        """
        Conflict check can be initiated by:
        - Firm owner/admin
        - Assigned lawyer
        - Assigned secretary
        """

        if (
            user.role == UserRole.ADMIN
            and case.firm.owner_id == user.id
        ):
            return True

        lawyer = getattr(user, "lawyer_profile", None)
        if lawyer and case.assigned_lawyer_id == lawyer.id:
            return True

        secretary = getattr(user, "secretary_profile", None)
        if secretary and case.assigned_secretary_id == secretary.id:
            return True

        return False

    @staticmethod
    def can_approve(user, case):
        """
        Conflict outcomes require lawyer authority
        or firm owner authority.
        """

        if (
            user.role == UserRole.ADMIN
            and case.firm.owner_id == user.id
        ):
            return True

        lawyer = getattr(user, "lawyer_profile", None)

        return bool(
            lawyer
            and case.assigned_lawyer_id == lawyer.id
        )

    @classmethod
    def ensure_can_act(cls, user, case, action):

        if action == "INITIATE":
            if cls.can_initiate(user, case):
                return

        elif cls.can_approve(user, case):
            return

        raise PermissionError(
            "You do not have permission to perform this conflict-check action."
        )

    # ==========================================================
    # AVAILABLE ACTIONS
    # ==========================================================

    @classmethod
    def available_actions(cls, check, user=None):

        if check is None:
            return []

        if user:
            can_initiate = cls.can_initiate(
                user,
                check.case
            )
            can_approve = cls.can_approve(
                user,
                check.case
            )
        else:
            can_initiate = True
            can_approve = True

        status = check.status

        if status == CaseConflictCheck.Status.NOT_STARTED:

            return (
                ["INITIATE"]
                if can_initiate
                else []
            )

        if status == CaseConflictCheck.Status.PENDING:

            if not can_approve:
                return []

            if (
                check.reviewed_at
                and check.reviewed_by_id
            ):
                return [
                    "MARK_CLEAR",
                    "POTENTIAL_CONFLICT",
                    "CONFIRM_CONFLICT",
                    "REQUEST_WAIVER",
                    "CANCEL",
                ]

            return [
                "REVIEW",
                "POTENTIAL_CONFLICT",
                "CONFIRM_CONFLICT",
                "CANCEL",
            ]

        if status == CaseConflictCheck.Status.POTENTIAL_CONFLICT:

            return (
                [
                    "CONFIRM_CONFLICT",
                    "REQUEST_WAIVER",
                    "CANCEL",
                ]
                if can_approve
                else []
            )

        if status == CaseConflictCheck.Status.CONFLICT_CONFIRMED:

            return (
                [
                    "REQUEST_WAIVER",
                    "REJECT",
                ]
                if can_approve
                else []
            )

        if status == CaseConflictCheck.Status.WAIVER_PENDING:

            return (
                [
                    "RECORD_WAIVER",
                    "CONFIRM_CONFLICT",
                    "REJECT",
                ]
                if can_approve
                else []
            )

        if status == CaseConflictCheck.Status.WAIVED:

            return (
                ["MARK_CLEAR"]
                if can_approve
                else []
            )

        return []

    # ==========================================================
    # REFERENCE NUMBER GENERATION
    # ==========================================================

    @staticmethod
    def _next_reference(case):

        year = timezone.localdate().year

        prefix = f"CONFLICT-{year}-"

        existing = (
            CaseConflictCheck.objects
            .filter(
                firm=case.firm,
                reference_number__startswith=prefix,
            )
            .order_by("-reference_number")
            .values_list(
                "reference_number",
                flat=True,
            )
            .first()
        )

        next_number = 1

        if existing:
            try:
                next_number = (
                    int(
                        existing.rsplit("-", 1)[-1]
                    )
                    + 1
                )
            except ValueError:
                next_number = 1

        return f"{prefix}{next_number:05d}"

    @classmethod
    def generate_reference(cls, case):

        case.firm.__class__.objects.select_for_update().get(
            id=case.firm_id
        )

        for _ in range(5):

            reference = cls._next_reference(case)

            exists = (
                CaseConflictCheck.objects
                .filter(
                    firm=case.firm,
                    reference_number=reference,
                )
                .exists()
            )

            if not exists:
                return reference

        raise ValidationError(
            {
                "reference_number":
                    "Could not allocate a conflict reference."
            }
        )

    # ==========================================================
    # DEFAULT SEARCH DATA
    # ==========================================================

    @staticmethod
    def default_searched_names(case):

        names = [
            case.client.full_name
        ]

        if case.defendant:
            names.append(case.defendant)

        return [
            {
                "name": name,
                "role": (
                    "CLIENT"
                    if index == 0
                    else "OPPONENT"
                ),
            }
            for index, name in enumerate(names)
        ]

    # ==========================================================
    # CREATE / GET CONFLICT CHECK
    # ==========================================================

    @classmethod
    @transaction.atomic
    def get_or_create_check(
        cls,
        *,
        case,
        actor,
        data=None,
    ):

        data = data or {}

        if cls.has_originating_intake_conflict(case):
            raise ValidationError({
                "conflict_check": "This matter already has an authoritative intake conflict check. Record supplemental searches against that proposed-matter conflict record."
            })

        try:

            check = (
                CaseConflictCheck.objects
                .select_for_update()
                .get(case=case)
            )

            created = False

        except CaseConflictCheck.DoesNotExist:

            check = CaseConflictCheck.objects.create(
                case=case,
                firm=case.firm,
                reference_number=cls.generate_reference(case),
                status=CaseConflictCheck.Status.NOT_STARTED,
                searched_names=cls.default_searched_names(case),
                searched_entities=[],
            )

            created = True


        if data.get("search_scope"):

            check.search_scope = data["search_scope"]

        elif data.get("scope"):

            check.search_scope = data["scope"]


        if data.get("searched_names") is not None:

            check.searched_names = data["searched_names"]


        if data.get("searched_entities") is not None:

            check.searched_entities = data["searched_entities"]


        check.save()


        if created:

            CaseActivity.objects.create(
                case=case,
                action="Conflict check record created",
                description=(
                    "A conflict-of-interest check record was opened."
                ),
                actor=actor,
                metadata={
                    "conflict_check_id": str(check.id),
                    "reference_number": check.reference_number,
                },
            )


        return check

       # ==========================================================
    # INITIATE CONFLICT CHECK
    # ==========================================================

    @classmethod
    @transaction.atomic
    def initiate_check(
        cls,
        *,
        case,
        actor,
        reason="",
        data=None,
    ):

        cls.ensure_can_act(
            actor,
            case,
            "INITIATE",
        )

        if cls.has_originating_intake_conflict(case):
            raise ValidationError({
                "conflict_check": "This matter already has an authoritative intake conflict check."
            })

        check = cls.get_or_create_check(
            case=case,
            actor=actor,
            data=data,
        )

        if check.status == CaseConflictCheck.Status.NOT_STARTED:

            check.status = CaseConflictCheck.Status.PENDING
            check.initiated_at = timezone.now()
            check.initiated_by = actor

            check.save(
                update_fields=[
                    "status",
                    "initiated_at",
                    "initiated_by",
                    "search_scope",
                    "searched_names",
                    "searched_entities",
                    "updated_at",
                ]
            )

            CaseTimeline.objects.create(
                case=case,
                action="Conflict Check Initiated",
                description=(
                    "Conflict-of-interest review was initiated "
                    "before engagement confirmation."
                ),
                created_by=actor,
            )

            CaseActivity.objects.create(
                case=case,
                action="Matter transitioned to conflict-check pending",
                description=(
                    reason
                    or "Matter moved into conflict-check review."
                ),
                actor=actor,
                metadata={
                    "conflict_check_id": str(check.id),
                    "reference_number": check.reference_number,
                },
            )

            cls.create_conflict_task(
                case=case,
                actor=actor,
            )

            cls.notify_team(
                case=case,
                actor=actor,
                title="Conflict check initiated",
                message=(
                    f"Conflict check {check.reference_number} "
                    "was initiated."
                ),
            )

        return check


    # ==========================================================
    # CONFLICT CHECK TASKS
    # ==========================================================

    @staticmethod
    def create_conflict_task(
        *,
        case,
        actor,
    ):

        assigned_to = actor

        if (
            case.assigned_lawyer_id
            and case.assigned_lawyer.user_id
        ):
            assigned_to = case.assigned_lawyer.user


        task, _ = CaseTask.objects.get_or_create(
            case=case,
            title="Complete conflict-of-interest check",
            defaults={
                "description": (
                    "Complete the conflict search and record "
                    "the outcome before engagement confirmation."
                ),
                "task_type": CaseTask.TaskType.OTHER,
                "due_at": timezone.now() + timedelta(days=2),
                "assigned_to": assigned_to,
                "created_by": actor,
                "is_client_visible": False,
            },
        )

        return task


    @staticmethod
    def close_conflict_task(
        *,
        case,
    ):

        CaseTask.objects.filter(
            case=case,
            title="Complete conflict-of-interest check",
            completed_at__isnull=True,
        ).update(
            status=CaseTask.TaskStatus.DONE,
            completed_at=timezone.now(),
        )


    # ==========================================================
    # ACTION EXECUTION
    # ==========================================================

    @classmethod
    @transaction.atomic
    def perform_action(
        cls,
        *,
        case,
        actor,
        action,
        effective_at=None,
        reason="",
        data=None,
    ):
        data = data or {}
        cls.ensure_can_act(actor, case, action)

        if action == "INITIATE":
            return cls.initiate_check(case=case, actor=actor, reason=reason, data=data)

        try:
            check = (
                CaseConflictCheck.objects
                .select_for_update(of=("self",))
                .select_related("case", "firm")
                .get(case=case)
            )
        except CaseConflictCheck.DoesNotExist:
            raise ValidationError({"action": "A conflict check must be initiated before this action can be performed."})

        if action == "REVIEW":
            return cls.review_check(check=check, actor=actor, effective_at=effective_at, reason=reason, data=data)
        if action == "MARK_CLEAR":
            return cls.mark_clear(check=check, actor=actor, effective_at=effective_at, reason=reason, data=data)
        if action == "POTENTIAL_CONFLICT":
            return cls.mark_potential_conflict(check=check, actor=actor, reason=reason, data=data)
        if action == "CONFIRM_CONFLICT":
            return cls.confirm_conflict(check=check, actor=actor, reason=reason, data=data)
        if action == "REQUEST_WAIVER":
            return cls.request_waiver(check=check, actor=actor, reason=reason, data=data)
        if action == "RECORD_WAIVER":
            return cls.record_waiver(check=check, actor=actor, effective_at=effective_at, reason=reason, data=data)
        if action == "REJECT":
            return cls.reject_instruction(check=check, actor=actor, reason=reason, data=data)
        if action == "CANCEL":
            return cls.cancel_check(check=check, actor=actor, reason=reason, data=data)

        raise ValidationError({"action": "Unsupported conflict-check action."})

    @staticmethod
    def _actor_name(actor):
        return getattr(actor, "full_name", None) or getattr(actor, "email", "Unknown user")

    @staticmethod
    def _normalized_text(value):
        return (value or "").strip()

    @classmethod
    def _review_event_key(cls, check):
        return f"CONFLICT_REVIEW:{check.id}:{check.reviewed_at.isoformat() if check.reviewed_at else ''}"

    @classmethod
    def _clear_event_key(cls, check):
        return f"CONFLICT_CLEAR:{check.id}:{check.completed_at.isoformat() if check.completed_at else ''}"

    @classmethod
    def review_check(cls, *, check, actor, effective_at, reason, data):
        if check.status not in {
            CaseConflictCheck.Status.PENDING,
            CaseConflictCheck.Status.POTENTIAL_CONFLICT,
            CaseConflictCheck.Status.WAIVER_PENDING,
        }:
            raise ValidationError({"action": "Only pending or reviewable conflict checks can be reviewed."})

        summary = cls._normalized_text(data.get("result_summary"))
        notes = cls._normalized_text(data.get("internal_notes"))
        reason = cls._normalized_text(reason)
        if not effective_at:
            raise ValidationError({"effective_at": "An effective date and time is required when reviewing a conflict check."})
        if not reason:
            raise ValidationError({"reason": "A reason is required for this conflict-check action."})
        if not summary:
            raise ValidationError({"result_summary": "A result summary is required for review."})

        if check.reviewed_at or check.reviewed_by_id:
            existing_event_key = cls._review_event_key(check)
            activity = (
                CaseActivity.objects
                .filter(case=check.case, action=cls.REVIEW_ACTIVITY)
                .order_by("created_at")
                .first()
            )
            activity_metadata = activity.metadata if activity else {}
            same_review = (
                check.reviewed_by_id == actor.id
                and abs(check.reviewed_at.timestamp() - effective_at.timestamp()) < 0.001
                and check.result_summary == summary
                and check.internal_notes == notes
                and activity_metadata.get("review_reason") == reason
            )
            if same_review:
                return check
            raise ValidationError({
                "action": "This conflict check has already been reviewed. Use a controlled review correction workflow to change the recorded review."
            })

        check.reviewed_at = effective_at
        check.reviewed_by = actor
        check.result_summary = summary
        check.internal_notes = notes
        check.save(update_fields=["reviewed_at", "reviewed_by", "result_summary", "internal_notes", "updated_at"])

        event_key = cls._review_event_key(check)
        cls.record_timeline_once(
            case=check.case,
            action="Conflict Check Reviewed",
            description="Conflict search results were reviewed before final acceptance of the instruction.",
            actor=actor,
            event_key=event_key,
        )
        cls.record_activity_once(
            case=check.case,
            action=cls.REVIEW_ACTIVITY,
            description=f"Conflict check reviewed by {cls._actor_name(actor)}.",
            actor=actor,
            metadata={
                "event_key": event_key,
                "event_type": cls.REVIEW_ACTIVITY,
                "conflict_check_id": str(check.id),
                "case_id": str(check.case_id),
                "actor_id": str(actor.id),
                "review_reason": reason,
            },
        )
        return check

    @classmethod
    def mark_clear(cls, *, check, actor, effective_at, reason, data):
        if check.status == CaseConflictCheck.Status.CLEAR:
            return check
        if check.status not in {CaseConflictCheck.Status.PENDING, CaseConflictCheck.Status.WAIVED}:
            raise ValidationError({"action": "Only pending or waived conflict checks can be marked clear."})
        if not (check.reviewed_at and check.reviewed_by_id):
            raise ValidationError({"action": "The conflict check must be reviewed before it can be marked clear."})
        if not effective_at:
            raise ValidationError({"effective_at": "An effective date and time is required when marking a conflict check clear."})

        summary = cls._normalized_text(data.get("result_summary"))
        if summary and not check.result_summary:
            check.result_summary = summary

        check.status = CaseConflictCheck.Status.CLEAR
        check.completed_at = effective_at
        check.completed_by = actor
        # Current policy treats MARK_CLEAR as the final conflict-clearance approval step.
        check.approved_at = effective_at
        check.approved_by = actor
        check.save(update_fields=[
            "status", "result_summary", "completed_at", "completed_by", "approved_at", "approved_by", "updated_at"
        ])
        cls.close_conflict_task(case=check.case)

        event_key = cls._clear_event_key(check)
        cls.record_timeline_once(
            case=check.case,
            action="Conflict Cleared",
            description="Conflict check was marked clear after review.",
            actor=actor,
            event_key=event_key,
        )
        cls.record_activity_once(
            case=check.case,
            action=cls.CLEAR_ACTIVITY,
            description=f"Conflict check marked clear by {cls._actor_name(actor)}.",
            actor=actor,
            metadata={
                "event_key": event_key,
                "event_type": cls.CLEAR_ACTIVITY,
                "conflict_check_id": str(check.id),
                "case_id": str(check.case_id),
                "actor_id": str(actor.id),
            },
        )
        return check

    @classmethod
    def mark_potential_conflict(cls, *, check, actor, reason, data):
        if check.status in {CaseConflictCheck.Status.CLEAR, CaseConflictCheck.Status.REJECTED, CaseConflictCheck.Status.CANCELLED}:
            return check
        check.status = CaseConflictCheck.Status.POTENTIAL_CONFLICT
        check.result_summary = cls._normalized_text(data.get("result_summary")) or check.result_summary
        check.internal_notes = cls._normalized_text(data.get("internal_notes")) or check.internal_notes
        check.save(update_fields=["status", "result_summary", "internal_notes", "updated_at"])
        return check

    @classmethod
    def confirm_conflict(cls, *, check, actor, reason, data):
        if check.status == CaseConflictCheck.Status.CLEAR:
            raise ValidationError({"action": "A clear conflict check cannot be confirmed as conflicted."})
        check.status = CaseConflictCheck.Status.CONFLICT_CONFIRMED
        check.result_summary = cls._normalized_text(data.get("result_summary")) or check.result_summary
        check.internal_notes = cls._normalized_text(data.get("internal_notes")) or check.internal_notes
        check.save(update_fields=["status", "result_summary", "internal_notes", "updated_at"])
        return check

    @classmethod
    def request_waiver(cls, *, check, actor, reason, data):
        check.status = CaseConflictCheck.Status.WAIVER_PENDING
        check.waiver_required = True
        check.waiver_details = cls._normalized_text(data.get("waiver_details")) or check.waiver_details
        check.save(update_fields=["status", "waiver_required", "waiver_details", "updated_at"])
        return check

    @classmethod
    def record_waiver(cls, *, check, actor, effective_at, reason, data):
        if check.status not in {CaseConflictCheck.Status.WAIVER_PENDING, CaseConflictCheck.Status.CONFLICT_CONFIRMED}:
            raise ValidationError({"action": "A waiver can only be recorded for a waiver-pending or confirmed conflict check."})
        check.status = CaseConflictCheck.Status.WAIVED
        check.waiver_required = True
        check.waiver_obtained = True
        check.waiver_details = cls._normalized_text(data.get("waiver_details")) or check.waiver_details
        if effective_at:
            check.completed_at = effective_at
            check.completed_by = actor
            check.approved_at = effective_at
            check.approved_by = actor
        check.save(update_fields=[
            "status", "waiver_required", "waiver_obtained", "waiver_details", "completed_at", "completed_by", "approved_at", "approved_by", "updated_at"
        ])
        cls.close_conflict_task(case=check.case)
        return check

    @classmethod
    def reject_instruction(cls, *, check, actor, reason, data):
        check.status = CaseConflictCheck.Status.REJECTED
        check.completed_at = timezone.now()
        check.completed_by = actor
        check.result_summary = cls._normalized_text(data.get("result_summary")) or check.result_summary
        check.internal_notes = cls._normalized_text(data.get("internal_notes")) or check.internal_notes
        check.save(update_fields=["status", "completed_at", "completed_by", "result_summary", "internal_notes", "updated_at"])
        cls.close_conflict_task(case=check.case)
        return check

    @classmethod
    def cancel_check(cls, *, check, actor, reason, data):
        check.status = CaseConflictCheck.Status.CANCELLED
        check.completed_at = timezone.now()
        check.completed_by = actor
        check.internal_notes = cls._normalized_text(data.get("internal_notes")) or check.internal_notes
        check.save(update_fields=["status", "completed_at", "completed_by", "internal_notes", "updated_at"])
        cls.close_conflict_task(case=check.case)
        return check


    # ==========================================================
    # NOTIFICATIONS
    # ==========================================================

    @staticmethod
    def notify_team(
        *,
        case,
        actor,
        title,
        message,
        reviewer_only=False,
    ):

        recipients = []


        if (
            case.assigned_lawyer_id
            and case.assigned_lawyer.user_id
        ):
            recipients.append(
                case.assigned_lawyer.user
            )


        if (
            not reviewer_only
            and case.assigned_secretary_id
            and case.assigned_secretary.user_id
        ):
            recipients.append(
                case.assigned_secretary.user
            )


        if reviewer_only and case.firm.owner_id:

            recipients.append(
                case.firm.owner
            )


        seen = set()


        for recipient in recipients:

            if recipient.id in seen:
                continue


            seen.add(recipient.id)


            NotificationService.create(
                firm=case.firm,
                recipient=recipient,
                actor=actor,
                case=case,
                notification_type=(
                    Notification.NotificationType
                    .CASE_STATUS_UPDATE
                ),
                title=(
                    f"{title}: {case.case_number}"
                ),
                message=message,
                action_url=(
                    f"/admin/cases/{case.id}"
                ),
                event_key=(
                    f"CONFLICT:{title}:"
                    f"{case.id}:{recipient.id}"
                ),
            )


    # ==========================================================
    # TIMELINE / ACTIVITY DUPLICATION PROTECTION
    # ==========================================================

    @staticmethod
    def timeline_exists(
        *,
        case,
        action,
        event_key,
    ):

        return CaseTimeline.objects.filter(
            case=case,
            action=action,
            description__contains=(
                f"Event key: {event_key}"
            ),
        ).exists()


    @classmethod
    def record_timeline_once(
        cls,
        *,
        case,
        action,
        description,
        actor,
        event_key,
    ):

        if cls.timeline_exists(
            case=case,
            action=action,
            event_key=event_key,
        ):
            return None


        return CaseTimeline.objects.create(
            case=case,
            action=action,
            description=(
                f"{description}\n"
                f"Event key: {event_key}"
            ),
            created_by=actor,
        )


    @staticmethod
    def activity_exists(
        *,
        case,
        action,
        event_key,
    ):

        return CaseActivity.objects.filter(
            case=case,
            action=action,
            metadata__event_key=event_key,
        ).exists()


    @classmethod
    def record_activity_once(
        cls,
        *,
        case,
        action,
        description,
        actor,
        metadata,
    ):

        event_key = metadata["event_key"]


        if cls.activity_exists(
            case=case,
            action=action,
            event_key=event_key,
        ):
            return None


        return CaseActivity.objects.create(
            case=case,
            action=action,
            description=description,
            actor=actor,
            metadata=metadata,
        )