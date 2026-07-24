from django.db import transaction
from django.db.models import Q
from django.conf import settings
from django.utils import timezone

from apps.cases.models import Case, CaseEvent
from apps.cases.services.case_service import CaseService
from apps.common.choices import UserRole
from apps.events.models import EventClientAwareness
from apps.notifications.models import Notification
from apps.notifications.services import NotificationService


class EventService:
    COURT_EVENT_TYPES = {
        CaseEvent.EventType.MENTION,
        CaseEvent.EventType.HEARING,
        CaseEvent.EventType.DIRECTIONS,
        CaseEvent.EventType.PRE_TRIAL,
        CaseEvent.EventType.RULING,
        CaseEvent.EventType.JUDGMENT,
        CaseEvent.EventType.TAXATION,
    }

    # ==========================================================
    # VALID NEXT EVENT TYPES PER COURT STAGE
    # ==========================================================

    VALID_EVENT_TYPES_BY_COURT_STAGE = {
        Case.CourtStage.NOT_APPLICABLE: {
            CaseEvent.EventType.INTERNAL,
            CaseEvent.EventType.CLIENT_MEETING,
            CaseEvent.EventType.ADMINISTRATIVE,
            CaseEvent.EventType.OTHER,
        },
        Case.CourtStage.NOT_FILED: {
            CaseEvent.EventType.INTERNAL,
            CaseEvent.EventType.CLIENT_MEETING,
            CaseEvent.EventType.FILING,
            CaseEvent.EventType.ADMINISTRATIVE,
            CaseEvent.EventType.SETTLEMENT,
            CaseEvent.EventType.ADR,
            CaseEvent.EventType.MEDIATION,
            CaseEvent.EventType.OTHER,
        },
        Case.CourtStage.READY_FOR_FILING: {
            CaseEvent.EventType.FILING,
            CaseEvent.EventType.INTERNAL,
            CaseEvent.EventType.CLIENT_MEETING,
            CaseEvent.EventType.REGISTRY_ACTION,
            CaseEvent.EventType.ADMINISTRATIVE,
            CaseEvent.EventType.OTHER,
        },
        Case.CourtStage.FILED: {
            CaseEvent.EventType.REGISTRY_ACTION,
            CaseEvent.EventType.SERVICE,
            CaseEvent.EventType.MENTION,
            CaseEvent.EventType.DIRECTIONS,
            CaseEvent.EventType.INTERNAL,
            CaseEvent.EventType.ADMINISTRATIVE,
            CaseEvent.EventType.OTHER,
        },
        Case.CourtStage.AWAITING_ASSESSMENT_OR_PAYMENT: {
            CaseEvent.EventType.REGISTRY_ACTION,
            CaseEvent.EventType.MENTION,
            CaseEvent.EventType.INTERNAL,
            CaseEvent.EventType.ADMINISTRATIVE,
            CaseEvent.EventType.OTHER,
        },
        Case.CourtStage.AWAITING_SERVICE: {
            CaseEvent.EventType.SERVICE,
            CaseEvent.EventType.REGISTRY_ACTION,
            CaseEvent.EventType.MENTION,
            CaseEvent.EventType.INTERNAL,
            CaseEvent.EventType.OTHER,
        },
        Case.CourtStage.SERVICE_IN_PROGRESS: {
            CaseEvent.EventType.SERVICE,
            CaseEvent.EventType.MENTION,
            CaseEvent.EventType.INTERNAL,
            CaseEvent.EventType.OTHER,
        },
        Case.CourtStage.AWAITING_RESPONSE: {
            CaseEvent.EventType.MENTION,
            CaseEvent.EventType.DIRECTIONS,
            CaseEvent.EventType.INTERNAL,
            CaseEvent.EventType.OTHER,
        },
        Case.CourtStage.PLEADINGS_OPEN: {
            CaseEvent.EventType.MENTION,
            CaseEvent.EventType.DIRECTIONS,
            CaseEvent.EventType.INTERNAL,
            CaseEvent.EventType.OTHER,
        },
        Case.CourtStage.PLEADINGS_CLOSED: {
            CaseEvent.EventType.CASE_MANAGEMENT,
            CaseEvent.EventType.MENTION,
            CaseEvent.EventType.DIRECTIONS,
            CaseEvent.EventType.SETTLEMENT,
            CaseEvent.EventType.ADR,
            CaseEvent.EventType.MEDIATION,
            CaseEvent.EventType.INTERNAL,
            CaseEvent.EventType.OTHER,
        },
        Case.CourtStage.CASE_MANAGEMENT: {
            CaseEvent.EventType.PRE_TRIAL,
            CaseEvent.EventType.MENTION,
            CaseEvent.EventType.DIRECTIONS,
            CaseEvent.EventType.SETTLEMENT,
            CaseEvent.EventType.ADR,
            CaseEvent.EventType.MEDIATION,
            CaseEvent.EventType.HEARING,
            CaseEvent.EventType.INTERNAL,
            CaseEvent.EventType.OTHER,
        },
        Case.CourtStage.PRE_TRIAL: {
            CaseEvent.EventType.HEARING,
            CaseEvent.EventType.MENTION,
            CaseEvent.EventType.DIRECTIONS,
            CaseEvent.EventType.SETTLEMENT,
            CaseEvent.EventType.INTERNAL,
            CaseEvent.EventType.OTHER,
        },
        Case.CourtStage.AWAITING_HEARING: {
            CaseEvent.EventType.HEARING,
            CaseEvent.EventType.MENTION,
            CaseEvent.EventType.SETTLEMENT,
            CaseEvent.EventType.INTERNAL,
            CaseEvent.EventType.OTHER,
        },
        Case.CourtStage.HEARING_IN_PROGRESS: {
            CaseEvent.EventType.HEARING,
            CaseEvent.EventType.SUBMISSIONS,
            CaseEvent.EventType.RULING,
            CaseEvent.EventType.MENTION,
            CaseEvent.EventType.PART_HEARD if hasattr(CaseEvent.EventType, 'PART_HEARD') else CaseEvent.EventType.OTHER,
            CaseEvent.EventType.SETTLEMENT,
            CaseEvent.EventType.INTERNAL,
            CaseEvent.EventType.OTHER,
        },
        Case.CourtStage.SUBMISSIONS: {
            CaseEvent.EventType.RULING,
            CaseEvent.EventType.JUDGMENT,
            CaseEvent.EventType.MENTION,
            CaseEvent.EventType.INTERNAL,
            CaseEvent.EventType.OTHER,
        },
        Case.CourtStage.JUDGMENT_RESERVED: {
            CaseEvent.EventType.JUDGMENT,
            CaseEvent.EventType.RULING,
            CaseEvent.EventType.MENTION,
            CaseEvent.EventType.INTERNAL,
            CaseEvent.EventType.OTHER,
        },
        Case.CourtStage.JUDGMENT_DELIVERED: {
            CaseEvent.EventType.TAXATION,
            CaseEvent.EventType.EXECUTION,
            CaseEvent.EventType.APPEAL,
            CaseEvent.EventType.REVIEW,
            CaseEvent.EventType.MENTION,
            CaseEvent.EventType.INTERNAL,
            CaseEvent.EventType.OTHER,
        },
        Case.CourtStage.DECREE_EXTRACTION: {
            CaseEvent.EventType.EXECUTION,
            CaseEvent.EventType.TAXATION,
            CaseEvent.EventType.APPEAL,
            CaseEvent.EventType.MENTION,
            CaseEvent.EventType.REGISTRY_ACTION,
            CaseEvent.EventType.INTERNAL,
            CaseEvent.EventType.OTHER,
        },
        Case.CourtStage.EXECUTION: {
            CaseEvent.EventType.EXECUTION,
            CaseEvent.EventType.TAXATION,
            CaseEvent.EventType.MENTION,
            CaseEvent.EventType.RULING,
            CaseEvent.EventType.APPEAL,
            CaseEvent.EventType.INTERNAL,
            CaseEvent.EventType.OTHER,
        },
        Case.CourtStage.APPEAL_OR_REVIEW: {
            CaseEvent.EventType.APPEAL,
            CaseEvent.EventType.REVIEW,
            CaseEvent.EventType.HEARING,
            CaseEvent.EventType.MENTION,
            CaseEvent.EventType.SUBMISSIONS,
            CaseEvent.EventType.JUDGMENT,
            CaseEvent.EventType.RULING,
            CaseEvent.EventType.INTERNAL,
            CaseEvent.EventType.OTHER,
        },
        Case.CourtStage.CONCLUDED: {
            CaseEvent.EventType.APPEAL,
            CaseEvent.EventType.REVIEW,
            CaseEvent.EventType.TAXATION,
            CaseEvent.EventType.INTERNAL,
            CaseEvent.EventType.ADMINISTRATIVE,
            CaseEvent.EventType.OTHER,
        },
    }

    # ==========================================================
    # REMINDER THRESHOLDS (in days before event)
    # ==========================================================

    REMINDER_SCHEDULE = [
        # (minimum_gap_days, reminder_days_before)
        # If event is >120 days away: 3 reminders at 90, 30, 7 days
        (120, [90, 30, 7]),
        # If event is 60-120 days away: 2 reminders at 30, 7 days
        (60, [30, 7]),
        # If event is 14-60 days away: 1 reminder at 7 days
        (14, [7]),
        # If event is 3-14 days away: 1 reminder at 3 days
        (3, [3]),
        # If event is <3 days away: no scheduled reminders
        # (creation notification is the only alert)
    ]

    # ==========================================================
    # BASIC HELPERS
    # ==========================================================

    @staticmethod
    def get_user_firm(user):
        return CaseService.get_user_firm(user)

    @staticmethod
    def is_admin_for_firm(user, firm):
        return user.role == UserRole.ADMIN and getattr(firm, "owner_id", None) == user.id

    @classmethod
    def scoped_cases(cls, user):
        firm = cls.get_user_firm(user)
        queryset = Case.objects.filter(firm=firm, is_active=True).select_related(
            "firm",
            "client",
            "client__user",
            "assigned_lawyer",
            "assigned_lawyer__user",
            "assigned_secretary",
            "assigned_secretary__user",
        )
        if cls.is_admin_for_firm(user, firm):
            return queryset
        if hasattr(user, "lawyer_profile"):
            return queryset.filter(assigned_lawyer=user.lawyer_profile)
        if hasattr(user, "secretary_profile"):
            secretary = user.secretary_profile
            return queryset.filter(
                Q(assigned_secretary=secretary)
                | Q(assigned_lawyer__in=secretary.assigned_lawyers.all())
            )
        if hasattr(user, "client_profile"):
            return queryset.filter(client=user.client_profile)
        return queryset.none()

    @classmethod
    def scoped_events(cls, user):
        queryset = (
            CaseEvent.objects.filter(case__in=cls.scoped_cases(user))
            .select_related(
                "case",
                "case__client",
                "case__client__user",
                "case__assigned_lawyer",
                "case__assigned_lawyer__user",
                "case__assigned_secretary",
                "case__assigned_secretary__user",
                "created_by",
            )
            .select_related("client_awareness", "client_awareness__updated_by")
            .order_by("starts_at")
        )
        if hasattr(user, "client_profile"):
            queryset = queryset.filter(is_client_visible=True)
        return queryset

    @classmethod
    def list_events(cls, user, *, scope="", case_id=None):
        now = timezone.now()
        today = timezone.localdate()
        queryset = cls.scoped_events(user)
        if case_id:
            queryset = queryset.filter(case_id=case_id)
        if scope == "today":
            queryset = queryset.filter(starts_at__date=today)
        elif scope == "upcoming":
            queryset = queryset.filter(starts_at__gte=now)
        elif scope == "current":
            queryset = queryset.filter(starts_at__date=today, status=CaseEvent.EventStatus.SCHEDULED)
        elif scope == "past":
            queryset = queryset.filter(starts_at__lt=now)
        return queryset

    @classmethod
    def participant_users(cls, event):
        users = []
        case = event.case
        if case.assigned_lawyer_id and case.assigned_lawyer.user_id:
            users.append(case.assigned_lawyer.user)
        if case.assigned_secretary_id and case.assigned_secretary.user_id:
            users.append(case.assigned_secretary.user)
        if event.is_client_visible and case.client.user_id:
            users.append(case.client.user)

        unique = {}
        for user in users:
            if user and user.is_active:
                unique[user.id] = user
        return list(unique.values())

    @classmethod
    def ensure_can_manage(cls, user, case):
        if cls.is_admin_for_firm(user, case.firm):
            return True
        lawyer = getattr(user, "lawyer_profile", None)
        if lawyer is not None and lawyer.is_active and case.assigned_lawyer_id == lawyer.id:
            return True
        secretary = getattr(user, "secretary_profile", None)
        if secretary is not None and secretary.is_active:
            return (
                case.assigned_secretary_id == secretary.id
                or secretary.assigned_lawyers.filter(id=case.assigned_lawyer_id).exists()
            )
        raise PermissionError("Only the firm owner/admin or assigned secretary can manage events.")

    # ==========================================================
    # VALID NEXT EVENT TYPES
    # ==========================================================

    @classmethod
    def get_valid_event_types(cls, case):
        """
        Returns the set of valid EventType values for the next event
        based on the case's current court stage.
        """
        return cls.VALID_EVENT_TYPES_BY_COURT_STAGE.get(
            case.court_stage,
            {
                CaseEvent.EventType.INTERNAL,
                CaseEvent.EventType.CLIENT_MEETING,
                CaseEvent.EventType.MENTION,
                CaseEvent.EventType.OTHER,
            },
        )

    @classmethod
    def get_next_event_suggestion(cls, case):
        """
        Returns the most recent completed event's next_action and next_date
        as a suggestion for the next event to create.
        """
        last_event = (
            CaseEvent.objects.filter(case=case)
            .exclude(next_date__isnull=True)
            .order_by("-starts_at")
            .first()
        )
        if not last_event:
            return None
        return {
            "next_action": last_event.next_action or "",
            "next_date": last_event.next_date,
            "source_event_id": str(last_event.id),
            "source_event_title": last_event.title,
            "source_event_type": last_event.event_type,
        }

    # ==========================================================
    # CLIENT AWARENESS
    # ==========================================================

    @classmethod
    def awareness_for_event(cls, event):
        awareness, _ = EventClientAwareness.objects.get_or_create(
            event=event,
            defaults={"client": event.case.client},
        )
        return awareness

    @classmethod
    def action_url_for(cls, recipient, event):
        if hasattr(recipient, "client_profile"):
            return f"/client/calendar?event={event.id}"
        if hasattr(recipient, "lawyer_profile"):
            return f"/lawyer/calendar?event={event.id}"
        if hasattr(recipient, "secretary_profile"):
            return f"/secretary/calendar?event={event.id}"
        if recipient.role == UserRole.ADMIN:
            return f"/admin/calendar?event={event.id}"
        return f"/notifications?event={event.id}"

    # ==========================================================
    # SYNC CASE NEXT COURT DATE
    # ==========================================================

    @classmethod
    def sync_case_next_court_date(cls, case):
        """
        Updates Case.next_court_date and Case.next_action from the
        nearest upcoming scheduled/confirmed event.
        """
        nearest_event = (
            CaseEvent.objects.filter(
                case=case,
                starts_at__gte=timezone.now(),
                status__in=[
                    CaseEvent.EventStatus.SCHEDULED,
                    CaseEvent.EventStatus.CONFIRMED,
                ],
            )
            .order_by("starts_at")
            .first()
        )

        if nearest_event:
            case.next_court_date = nearest_event.starts_at
            case.next_action = nearest_event.title
        else:
            case.next_court_date = None
            case.next_action = ""

        case.save(update_fields=["next_court_date", "next_action", "updated_at"])

    # ==========================================================
    # NOTIFICATIONS
    # ==========================================================

    @classmethod
    def notify_event(cls, event, *, actor=None, reason="scheduled"):
        awareness = cls.awareness_for_event(event)
        notifications = []
        local_time = timezone.localtime(event.starts_at).strftime("%d %b %Y %H:%M")
        verb = "updated" if reason == "updated" else "scheduled"

        for recipient in cls.participant_users(event):
            notification = NotificationService.create(
                firm=event.case.firm,
                recipient=recipient,
                actor=actor,
                case=event.case,
                notification_type=Notification.NotificationType.CASE_EVENT,
                title=f"Case event {verb}: {event.case.case_number}",
                message=f"{event.title} is {verb} for {local_time}.",
                action_url=cls.action_url_for(recipient, event),
                event_key=f"CASE_EVENT:{reason}:{event.id}:{recipient.id}",
            )
            if notification is not None:
                notifications.append(notification)

        if event.is_client_visible and event.case.client.user_id:
            awareness.status = EventClientAwareness.AwarenessStatus.NOTIFIED
            awareness.notified_at = awareness.notified_at or timezone.now()
            awareness.updated_by = actor
            awareness.save(update_fields=["status", "notified_at", "updated_by", "updated_at"])
        return notifications

    @classmethod
    def send_reminder_notifications(cls, event, *, days_remaining):
        """
        Sends a reminder notification to all participants with the
        number of remaining days to the event.
        """
        notifications = []
        local_time = timezone.localtime(event.starts_at).strftime("%d %b %Y %H:%M")

        if days_remaining == 0:
            countdown_text = "today"
        elif days_remaining == 1:
            countdown_text = "tomorrow"
        else:
            countdown_text = f"in {days_remaining} days"

        for recipient in cls.participant_users(event):
            notification = NotificationService.create(
                firm=event.case.firm,
                recipient=recipient,
                actor=None,
                case=event.case,
                notification_type=Notification.NotificationType.CASE_EVENT,
                title=f"Reminder: {event.case.case_number} — {days_remaining} day{'s' if days_remaining != 1 else ''} to go",
                message=(
                    f"{event.title} is {countdown_text} ({local_time}). "
                    f"Court: {event.court_station or event.court or 'Not specified'}. "
                    f"Mode: {event.get_hearing_mode_display()}."
                ),
                action_url=cls.action_url_for(recipient, event),
                event_key=f"CASE_EVENT_REMINDER:{event.id}:{days_remaining}d:{recipient.id}",
            )
            if notification is not None:
                notifications.append(notification)

        return notifications

    # ==========================================================
    # REMINDER SCHEDULING LOGIC
    # ==========================================================

    @classmethod
    def get_reminder_days(cls, event):
        """
        Returns the list of days-before-event when reminders should
        be sent, based on how far away the event is.
        """
        now = timezone.now()
        if event.starts_at <= now:
            return []

        gap_days = (event.starts_at - now).days

        for min_gap, reminder_days in cls.REMINDER_SCHEDULE:
            if gap_days >= min_gap:
                return reminder_days

        return []

    @classmethod
    def process_due_reminders(cls):
        """
        Called by a daily management command. Checks all upcoming
        scheduled events and sends reminders for any that are due today.
        Returns a list of (event, days_remaining, notification_count) tuples.
        """
        now = timezone.now()
        today = timezone.localdate()
        results = []

        upcoming_events = (
            CaseEvent.objects.filter(
                starts_at__gte=now,
                status__in=[
                    CaseEvent.EventStatus.SCHEDULED,
                    CaseEvent.EventStatus.CONFIRMED,
                ],
            )
            .select_related(
                "case",
                "case__firm",
                "case__client",
                "case__client__user",
                "case__assigned_lawyer",
                "case__assigned_lawyer__user",
                "case__assigned_secretary",
                "case__assigned_secretary__user",
            )
        )

        for event in upcoming_events:
            reminder_days = cls.get_reminder_days(event)
            if not reminder_days:
                continue

            event_date = event.starts_at.date()
            days_until_event = (event_date - today).days

            if days_until_event in reminder_days:
                notifications = cls.send_reminder_notifications(
                    event,
                    days_remaining=days_until_event,
                )
                results.append((event, days_until_event, len(notifications)))

        return results

    # ==========================================================
    # CREATE / UPDATE / AWARENESS
    # ==========================================================

    @classmethod
    @transaction.atomic
    def create_event(cls, *, user, validated_data):
        notify_participants = validated_data.pop("notify_participants", True)
        case_id = validated_data.pop("case_id")
        case = cls.scoped_cases(user).get(id=case_id)
        cls.ensure_can_manage(user, case)
        if validated_data.get("event_type") in cls.COURT_EVENT_TYPES:
            validated_data.setdefault(
                "hearing_mode",
                getattr(settings, "DEFAULT_COURT_HEARING_MODE", CaseEvent.HearingMode.VIRTUAL),
            )
        validated_data.setdefault("court_stage_before", case.court_stage)
        validated_data.setdefault("matter_status_before", case.matter_status)
        event = CaseEvent.objects.create(case=case, created_by=user, **validated_data)
        cls.awareness_for_event(event)

        # Sync case next court date
        cls.sync_case_next_court_date(case)

        if notify_participants:
            cls.notify_event(event, actor=user, reason="scheduled")
        return event

    @classmethod
    @transaction.atomic
    def update_event(cls, *, user, event_id, validated_data):
        notify_participants = validated_data.pop("notify_participants", True)
        event = cls.scoped_events(user).select_for_update(of=("self",)).get(id=event_id)
        cls.ensure_can_manage(user, event.case)
        for field, value in validated_data.items():
            setattr(event, field, value)
        event.save()
        cls.awareness_for_event(event)

        # Sync case next court date
        cls.sync_case_next_court_date(event.case)

        if notify_participants:
            cls.notify_event(event, actor=user, reason="updated")
        return event

    @classmethod
    @transaction.atomic
    def update_awareness(cls, *, user, event_id, validated_data):
        event = cls.scoped_events(user).select_for_update(of=("self",)).get(id=event_id)
        cls.ensure_can_manage(user, event.case)
        awareness = cls.awareness_for_event(event)
        awareness.status = validated_data["status"]
        awareness.confirmation_channel = validated_data.get("confirmation_channel", awareness.confirmation_channel)
        awareness.notes = validated_data.get("notes", awareness.notes)
        awareness.updated_by = user
        if awareness.status == EventClientAwareness.AwarenessStatus.CONFIRMED and awareness.confirmed_at is None:
            awareness.confirmed_at = timezone.now()
        awareness.save()
        return awareness
