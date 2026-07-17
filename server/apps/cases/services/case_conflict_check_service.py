from datetime import timedelta

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.cases.models import (
    Case,
    CaseActivity,
    CaseConflictCheck,
    CaseLifecycleTransition,
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

    @staticmethod
    def existing_check(case):
        try:
            return case.conflict_check
        except CaseConflictCheck.DoesNotExist:
            return None

    @staticmethod
    def can_initiate(user, case):
        if user.role == UserRole.ADMIN and case.firm.owner_id == user.id:
            return True
        if getattr(user, "lawyer_profile", None) and case.assigned_lawyer_id == user.lawyer_profile.id:
            return True
        if getattr(user, "secretary_profile", None) and case.assigned_secretary_id == user.secretary_profile.id:
            return True
        return False

    @staticmethod
    def can_approve(user, case):
        if user.role == UserRole.ADMIN and case.firm.owner_id == user.id:
            return True
        return bool(getattr(user, "lawyer_profile", None) and case.assigned_lawyer_id == user.lawyer_profile.id)

    @classmethod
    def ensure_can_act(cls, user, case, action):
        if action == "INITIATE" and cls.can_initiate(user, case):
            return
        if action != "INITIATE" and cls.can_approve(user, case):
            return
        raise PermissionError("You do not have permission to perform this conflict-check action.")

    @classmethod
    def available_actions(cls, check, user=None):
        if check is None:
            return []
        if user is not None:
            can_initiate = cls.can_initiate(user, check.case)
            can_approve = cls.can_approve(user, check.case)
        else:
            can_initiate = can_approve = True
        if check.status == CaseConflictCheck.Status.NOT_STARTED:
            return ["INITIATE"] if can_initiate else []
        if check.status == CaseConflictCheck.Status.PENDING:
            if not can_approve:
                return []
            if check.reviewed_at and check.reviewed_by_id:
                return ["MARK_CLEAR", "POTENTIAL_CONFLICT", "CONFIRM_CONFLICT", "REQUEST_WAIVER", "CANCEL"]
            return ["REVIEW", "POTENTIAL_CONFLICT", "CONFIRM_CONFLICT", "CANCEL"]
        if check.status == CaseConflictCheck.Status.POTENTIAL_CONFLICT:
            return ["CONFIRM_CONFLICT", "REQUEST_WAIVER", "CANCEL"] if can_approve else []
        if check.status == CaseConflictCheck.Status.CONFLICT_CONFIRMED:
            return ["REQUEST_WAIVER", "REJECT"] if can_approve else []
        if check.status == CaseConflictCheck.Status.WAIVER_PENDING:
            return ["RECORD_WAIVER", "CONFIRM_CONFLICT", "REJECT"] if can_approve else []
        if check.status == CaseConflictCheck.Status.WAIVED:
            return ["MARK_CLEAR"] if can_approve else []
        return []

    @staticmethod
    def _next_reference(case):
        year = timezone.localdate().year
        prefix = f"CONFLICT-{year}-"
        existing = (
            CaseConflictCheck.objects.filter(firm=case.firm, reference_number__startswith=prefix)
            .order_by("-reference_number")
            .values_list("reference_number", flat=True)
            .first()
        )
        next_number = 1
        if existing:
            try:
                next_number = int(existing.rsplit("-", 1)[-1]) + 1
            except ValueError:
                next_number = 1
        return f"{prefix}{next_number:05d}"

    @classmethod
    def generate_reference(cls, case):
        case.firm.__class__.objects.select_for_update().get(id=case.firm_id)
        for _ in range(5):
            reference = cls._next_reference(case)
            if not CaseConflictCheck.objects.filter(
                firm=case.firm,
                reference_number=reference,
            ).exists():
                return reference
        raise ValidationError({"reference_number": "Could not allocate a conflict reference."})

    @staticmethod
    def default_searched_names(case):
        names = [case.client.full_name]
        if case.defendant:
            names.append(case.defendant)
        return [{"name": name, "role": "CLIENT" if index == 0 else "OPPONENT"} for index, name in enumerate(names)]

    @classmethod
    @transaction.atomic
    def get_or_create_check(cls, *, case, actor, data=None):
        data = data or {}
        try:
            check = CaseConflictCheck.objects.select_for_update().get(case=case)
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
                description="A conflict-of-interest check record was opened.",
                actor=actor,
                metadata={"conflict_check_id": str(check.id), "reference_number": check.reference_number},
            )
        return check

    @classmethod
    @transaction.atomic
    def initiate_check(cls, *, case, actor, reason="", data=None):
        cls.ensure_can_act(actor, case, "INITIATE")
        check = cls.get_or_create_check(case=case, actor=actor, data=data)
        if check.status == CaseConflictCheck.Status.NOT_STARTED:
            check.status = CaseConflictCheck.Status.PENDING
            check.initiated_at = timezone.now()
            check.initiated_by = actor
            check.save(update_fields=["status", "initiated_at", "initiated_by", "search_scope", "searched_names", "searched_entities", "updated_at"])

            CaseTimeline.objects.create(
                case=case,
                action="Conflict Check Initiated",
                description="Conflict-of-interest review was initiated before engagement confirmation.",
                created_by=actor,
            )
            CaseActivity.objects.create(
                case=case,
                action="Matter transitioned to conflict-check pending",
                description=reason or "Matter moved into conflict-check review.",
                actor=actor,
                metadata={"conflict_check_id": str(check.id), "reference_number": check.reference_number},
            )
            cls.create_conflict_task(case=case, actor=actor)
            cls.notify_team(case=case, actor=actor, title="Conflict check initiated", message=f"Conflict check {check.reference_number} was initiated.")
        return check

    @staticmethod
    def create_conflict_task(*, case, actor):
        assigned_to = case.assigned_lawyer.user if case.assigned_lawyer_id and case.assigned_lawyer.user_id else actor
        task, _ = CaseTask.objects.get_or_create(
            case=case,
            title="Complete conflict-of-interest check",
            defaults={
                "description": "Complete the conflict search and record the outcome before engagement confirmation.",
                "task_type": CaseTask.TaskType.OTHER,
                "due_at": timezone.now() + timedelta(days=2),
                "assigned_to": assigned_to,
                "created_by": actor,
                "is_client_visible": False,
            },
        )
        return task

    @staticmethod
    def close_conflict_task(*, case):
        CaseTask.objects.filter(
            case=case,
            title="Complete conflict-of-interest check",
            completed_at__isnull=True,
        ).update(status=CaseTask.TaskStatus.DONE, completed_at=timezone.now())

    @staticmethod
    def notify_team(*, case, actor, title, message, reviewer_only=False):
        recipients = []
        if case.assigned_lawyer_id and case.assigned_lawyer.user_id:
            recipients.append(case.assigned_lawyer.user)
        if not reviewer_only and case.assigned_secretary_id and case.assigned_secretary.user_id:
            recipients.append(case.assigned_secretary.user)
        if reviewer_only and case.firm.owner_id:
            recipients.append(case.firm.owner)
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
                notification_type=Notification.NotificationType.CASE_STATUS_UPDATE,
                title=f"{title}: {case.case_number}",
                message=message,
                action_url=f"/admin/cases/{case.id}",
                event_key=f"CONFLICT:{title}:{case.id}:{recipient.id}",
            )

    @staticmethod
    def timeline_exists(*, case, action, event_key):
        return CaseTimeline.objects.filter(
            case=case,
            action=action,
            description__contains=f"Event key: {event_key}",
        ).exists()

    @classmethod
    def record_timeline_once(cls, *, case, action, description, actor, event_key):
        if cls.timeline_exists(case=case, action=action, event_key=event_key):
            return None
        return CaseTimeline.objects.create(
            case=case,
            action=action,
            description=f"{description}\nEvent key: {event_key}",
            created_by=actor,
        )

    @staticmethod
    def activity_exists(*, case, action, event_key):
        return CaseActivity.objects.filter(
            case=case,
            action=action,
            metadata__event_key=event_key,
        ).exists()

    @classmethod
    def record_activity_once(cls, *, case, action, description, actor, metadata):
        event_key = metadata["event_key"]
        if cls.activity_exists(case=case, action=action, event_key=event_key):
            return None
        return CaseActivity.objects.create(
            case=case,
            action=action,
            description=description,
            actor=actor,
            metadata=metadata,
        )

    @classmethod
    def existing_review_reason(cls, *, case, check):
        activity = (
            CaseActivity.objects.filter(
                case=case,
                action=cls.REVIEW_ACTIVITY,
                metadata__conflict_check_id=str(check.id),
                metadata__event_type=cls.REVIEW_ACTIVITY,
            )
            .order_by("created_at")
            .first()
        )
        return (activity.metadata or {}).get("reason") if activity else None

    @staticmethod
    def same_moment(left, right):
        if not left or not right:
            return False
        return left == right

    @classmethod
    @transaction.atomic
    def perform_action(cls, *, case, actor, action, effective_at=None, reason="", data=None):
        data = data or {}
        if action not in cls.ACTIONS:
            raise ValidationError({"action": "Unsupported conflict-check action."})
        cls.ensure_can_act(actor, case, action)

        if action == "INITIATE":
            return cls.initiate_check(case=case, actor=actor, reason=reason, data=data)

        try:
            check = (
                CaseConflictCheck.objects.select_for_update(of=("self",))
                .select_related("case", "firm")
                .get(case=case)
            )
        except CaseConflictCheck.DoesNotExist:
            raise ValidationError({"conflict_check": "Initiate the conflict check before recording an outcome."})
        now = effective_at or timezone.now()

        if check.status in {CaseConflictCheck.Status.NOT_STARTED, CaseConflictCheck.Status.CANCELLED}:
            raise ValidationError({"conflict_check": "Initiate the conflict check before recording an outcome."})

        if action == "REVIEW":
            if effective_at is None:
                raise ValidationError({"effective_at": "An effective date and time is required when reviewing a conflict check."})
            if check.status not in {
                CaseConflictCheck.Status.PENDING,
                CaseConflictCheck.Status.POTENTIAL_CONFLICT,
                CaseConflictCheck.Status.WAIVER_PENDING,
                CaseConflictCheck.Status.WAIVED,
            }:
                raise ValidationError({"action": "Only pending or reviewable conflict checks can be reviewed."})
            result_summary = data.get("result_summary", check.result_summary)
            internal_notes = data.get("internal_notes", check.internal_notes)
            if check.reviewed_at and check.reviewed_by_id:
                existing_reason = cls.existing_review_reason(case=case, check=check)
                if (
                    check.reviewed_by_id == actor.id
                    and cls.same_moment(check.reviewed_at, now)
                    and result_summary == check.result_summary
                    and internal_notes == check.internal_notes
                    and existing_reason == reason
                ):
                    return check
                raise ValidationError(
                    {
                        "action": (
                            "This conflict check has already been reviewed. Use a controlled review "
                            "correction workflow to change the recorded review."
                        )
                    }
                )
            check.result_summary = result_summary
            check.internal_notes = internal_notes
            check.reviewed_at = now
            check.reviewed_by = actor
            check.save(
                update_fields=[
                    "result_summary",
                    "internal_notes",
                    "reviewed_at",
                    "reviewed_by",
                    "updated_at",
                ]
            )
            event_key = f"CONFLICT_REVIEW:{check.id}:{check.reviewed_at.isoformat()}"
            cls.record_timeline_once(
                case=case,
                action="Conflict Check Reviewed",
                description="Conflict search results were reviewed before final acceptance of the instruction.",
                actor=actor,
                event_key=event_key,
            )
            cls.record_activity_once(
                case=case,
                action=cls.REVIEW_ACTIVITY,
                description=f"Conflict check reviewed by {actor.full_name}.",
                actor=actor,
                metadata={
                    "conflict_check_id": str(check.id),
                    "case_id": str(case.id),
                    "actor_id": str(actor.id),
                    "event_type": cls.REVIEW_ACTIVITY,
                    "event_key": event_key,
                    "reason": reason,
                },
            )

        elif action == "MARK_CLEAR":
            if check.status == CaseConflictCheck.Status.CLEAR:
                return check
            if effective_at is None:
                raise ValidationError({"effective_at": "An effective date and time is required when marking a conflict check clear."})
            if check.status not in {CaseConflictCheck.Status.PENDING, CaseConflictCheck.Status.WAIVED}:
                raise ValidationError({"action": "Only pending or waived conflict checks can be marked clear."})
            if not check.reviewed_at or not check.reviewed_by_id:
                raise ValidationError({"action": "The conflict check must be reviewed before it can be marked clear."})
            check.status = CaseConflictCheck.Status.CLEAR
            check.completed_at = now
            check.completed_by = actor
            # In the current workflow, final clearance is also the approval decision.
            check.approved_at = now
            check.approved_by = actor
            check.save(
                update_fields=[
                    "status",
                    "completed_at",
                    "completed_by",
                    "approved_at",
                    "approved_by",
                    "updated_at",
                ]
            )
            event_key = f"CONFLICT_CLEAR:{check.id}:{check.completed_at.isoformat()}"
            cls.record_timeline_once(
                case=case,
                action="Conflict Cleared",
                description="Conflict check completed and cleared after review.",
                actor=actor,
                event_key=event_key,
            )
            cls.record_activity_once(
                case=case,
                action=cls.CLEAR_ACTIVITY,
                description=f"Conflict check marked clear by {actor.full_name}.",
                actor=actor,
                metadata={
                    "conflict_check_id": str(check.id),
                    "case_id": str(case.id),
                    "actor_id": str(actor.id),
                    "event_type": cls.CLEAR_ACTIVITY,
                    "event_key": event_key,
                    "reason": reason,
                },
            )
            cls.close_conflict_task(case=case)
            cls.notify_team(case=case, actor=actor, title="Conflict check cleared", message="Conflict check cleared. Engagement formalities may proceed.")

        elif action == "POTENTIAL_CONFLICT":
            check.status = CaseConflictCheck.Status.POTENTIAL_CONFLICT
            check.result_summary = data.get("result_summary", check.result_summary)
            check.internal_notes = data.get("internal_notes", check.internal_notes)
            check.reviewed_at = now
            check.reviewed_by = actor
            check.save()
            CaseActivity.objects.create(case=case, action="Potential conflict recorded", description=reason, actor=actor, metadata={"conflict_check_id": str(check.id)})
            cls.notify_team(case=case, actor=actor, title="Potential conflict review required", message="A potential conflict requires authorized review.", reviewer_only=True)

        elif action == "CONFIRM_CONFLICT":
            if check.status not in {CaseConflictCheck.Status.POTENTIAL_CONFLICT, CaseConflictCheck.Status.PENDING, CaseConflictCheck.Status.WAIVER_PENDING}:
                raise ValidationError({"action": "Conflict can only be confirmed from pending, potential-conflict or waiver-pending review."})
            check.status = CaseConflictCheck.Status.CONFLICT_CONFIRMED
            check.result_summary = data.get("result_summary", check.result_summary)
            check.internal_notes = data.get("internal_notes", check.internal_notes)
            check.reviewed_at = now
            check.reviewed_by = actor
            check.save()
            CaseTimeline.objects.create(case=case, action="Conflict Identified", description="A conflict issue was identified for internal review.", created_by=actor)
            CaseActivity.objects.create(case=case, action="Conflict confirmed", description=reason, actor=actor, metadata={"conflict_check_id": str(check.id)})
            cls.notify_team(case=case, actor=actor, title="Conflict confirmed", message="A conflict has been confirmed and requires authorized handling.", reviewer_only=True)

        elif action == "REQUEST_WAIVER":
            check.status = CaseConflictCheck.Status.WAIVER_PENDING
            check.waiver_required = True
            check.waiver_details = data.get("waiver_details", check.waiver_details)
            check.internal_notes = data.get("internal_notes", check.internal_notes)
            check.save()
            CaseActivity.objects.create(case=case, action="Conflict waiver requested", description=reason, actor=actor, metadata={"conflict_check_id": str(check.id)})

        elif action == "RECORD_WAIVER":
            if check.status != CaseConflictCheck.Status.WAIVER_PENDING:
                raise ValidationError({"action": "A waiver can only be recorded after waiver is requested."})
            check.status = CaseConflictCheck.Status.WAIVED
            check.waiver_required = True
            check.waiver_obtained = True
            check.waiver_details = data.get("waiver_details", check.waiver_details)
            check.approved_at = now
            check.approved_by = actor
            check.save()
            CaseActivity.objects.create(case=case, action="Conflict waiver recorded", description=reason, actor=actor, metadata={"conflict_check_id": str(check.id)})

        elif action == "REJECT":
            check.status = CaseConflictCheck.Status.REJECTED
            check.result_summary = data.get("result_summary", check.result_summary)
            check.internal_notes = data.get("internal_notes", check.internal_notes)
            check.completed_at = now
            check.completed_by = actor
            check.save()
            CaseActivity.objects.create(case=case, action="Instruction rejected after conflict check", description=reason, actor=actor, metadata={"conflict_check_id": str(check.id)})
            cls.close_conflict_task(case=case)

        elif action == "CANCEL":
            check.status = CaseConflictCheck.Status.CANCELLED
            check.completed_at = now
            check.completed_by = actor
            check.internal_notes = data.get("internal_notes", check.internal_notes)
            check.save()
            CaseActivity.objects.create(case=case, action="Conflict check cancelled", description=reason, actor=actor, metadata={"conflict_check_id": str(check.id)})
            cls.close_conflict_task(case=case)

        return check

    @staticmethod
    def client_safe_status(check):
        if check is None or check.status in {CaseConflictCheck.Status.NOT_STARTED, CaseConflictCheck.Status.PENDING, CaseConflictCheck.Status.POTENTIAL_CONFLICT, CaseConflictCheck.Status.WAIVER_PENDING}:
            return "Matter acceptance review in progress"
        if check.status in {CaseConflictCheck.Status.CLEAR, CaseConflictCheck.Status.WAIVED}:
            return "Matter accepted"
        if check.status in {CaseConflictCheck.Status.CONFLICT_CONFIRMED, CaseConflictCheck.Status.REJECTED, CaseConflictCheck.Status.CANCELLED}:
            return "Matter cannot be accepted"
        return "Matter acceptance review in progress"
