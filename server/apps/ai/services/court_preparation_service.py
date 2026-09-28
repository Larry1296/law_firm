from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.db.models import Max
from django.utils import timezone

from apps.ai.models import CourtPreparationBrief
from apps.ai.services.court_preparation_playbooks import KIND_BY_EVENT_TYPE, form_of_address, playbook_for
from apps.cases.models import CaseEvent, CaseFiling, CaseTask, MatterDeadline
from apps.common.choices import UserRole
from apps.notifications.models import Notification
from apps.notifications.services import NotificationService
from apps.staff.models import LawyerPermission

ADVOCATE_DISCLAIMER = (
    "AI-assisted preparation guidance built from this matter's records. It is not legal advice or a prediction "
    "of the outcome. Readiness measures preparation steps recorded, not the chance of success."
)
CLIENT_DISCLAIMER = (
    "General guidance to help you prepare. It is not legal advice. Follow your advocate's instructions where they differ."
)
OPEN_STATUSES = [CaseEvent.EventStatus.SCHEDULED, CaseEvent.EventStatus.CONFIRMED]
HORIZON_DAYS = 14
NOTIFY_ON_DAYS = {7, 3, 1, 0}
VIRTUAL_MODES = {CaseEvent.HearingMode.VIRTUAL, CaseEvent.HearingMode.HYBRID}


def _check(key, label, passed, detail=""):
    return {"key": key, "label": label, "passed": bool(passed), "detail": detail}


class CourtPreparationService:
    """Tracks every upcoming court sitting and keeps advocates and clients prepared for it.

    Secretaries are deliberately excluded: preparation briefs go only to the matter's
    advocate (with the AI tools permission) and, in a client-safe form, to the client.
    """

    # ------------------------------------------------------------------ access
    @staticmethod
    def advocate_can_use(user, case):
        if user.role == UserRole.ADMIN and case.firm.owner_id == user.id:
            return True
        lawyer = getattr(user, "lawyer_profile", None)
        return bool(
            lawyer is not None and lawyer.is_active and case.assigned_lawyer_id == lawyer.id
            and lawyer.has_permission(LawyerPermission.USE_AI_TOOLS)
        )

    @staticmethod
    def upcoming_events(*, cases=None, days=HORIZON_DAYS):
        now = timezone.now()
        queryset = CaseEvent.objects.filter(
            starts_at__gte=now - timedelta(hours=3), starts_at__lte=now + timedelta(days=days),
            status__in=OPEN_STATUSES, event_type__in=list(KIND_BY_EVENT_TYPE),
            case__is_active=True,
        ).select_related("case", "case__firm", "case__client", "case__client__user", "case__assigned_lawyer__user")
        if cases is not None:
            queryset = queryset.filter(case__in=cases)
        return queryset.order_by("starts_at")

    # ------------------------------------------------------------------ briefs
    @staticmethod
    def source_state(event):
        case = event.case
        stamps = [event.updated_at, case.updated_at]
        for queryset in (case.filings.all(), case.tasks.all(), case.deadlines.all(), case.document_requests.all(), case.events.all()):
            latest = queryset.aggregate(value=Max("updated_at"))["value"]
            if latest:
                stamps.append(latest)
        session = getattr(event, "courtroom_session", None)
        if session is not None:
            stamps.append(session.updated_at)
        return max(stamps)

    @classmethod
    def current(cls, event, audience):
        brief = event.preparation_briefs.filter(audience=audience, is_current=True).first()
        if brief is None or brief.source_state_at < cls.source_state(event):
            brief = cls.generate(event, audience)
        return brief

    @classmethod
    @transaction.atomic
    def generate(cls, event, audience):
        checks = cls.advocate_checks(event) if audience == CourtPreparationBrief.Audience.ADVOCATE else cls.client_checks(event)
        guidance = cls.advocate_guidance(event) if audience == CourtPreparationBrief.Audience.ADVOCATE else cls.client_guidance(event)
        tailored, provider, model = {}, "structured", ""
        if audience == CourtPreparationBrief.Audience.ADVOCATE and getattr(settings, "AI_PREPARATION_LLM_ENABLED", False):
            from apps.ai.services.court_preparation_llm import CourtPreparationLLM, PreparationProviderUnavailable

            try:
                tailored = CourtPreparationLLM().tailor(cls.minimised_context(event, checks))
                provider, model = "openai", settings.OPENAI_MODEL
            except PreparationProviderUnavailable:
                tailored = {}
        readiness = round(100 * sum(item["passed"] for item in checks) / len(checks)) if checks else 100
        previous = event.preparation_briefs.filter(audience=audience).order_by("-version").first()
        event.preparation_briefs.filter(audience=audience, is_current=True).update(is_current=False)
        return CourtPreparationBrief.objects.create(
            event=event, case=event.case, audience=audience,
            version=(previous.version if previous else 0) + 1,
            readiness=readiness, checks=checks, guidance=guidance, tailored=tailored,
            provider=provider, model=model,
            source_state_at=cls.source_state(event), generated_at=timezone.now(),
        )

    # ------------------------------------------------------------------ checks
    @staticmethod
    def _filed(case, *types):
        return case.filings.filter(filing_type__in=types).exclude(
            status__in=[CaseFiling.FilingStatus.WITHDRAWN, CaseFiling.FilingStatus.REJECTED]
        ).exists()

    @classmethod
    def advocate_checks(cls, event):
        case = event.case
        kind = KIND_BY_EVENT_TYPE.get(event.event_type)
        checks = []
        if event.hearing_mode in VIRTUAL_MODES:
            session = getattr(event, "courtroom_session", None)
            checks.append(_check(
                "court_link", "Virtual court link attached and verified", session is not None and session.link_verified,
                "" if session is not None else "Ask the firm administrator to attach the link from the cause list.",
            ))
        outstanding = [
            *[f"{task.title} (due {timezone.localtime(task.due_at):%d %b})" for task in case.tasks.filter(
                due_at__lte=event.starts_at).exclude(status__in=[CaseTask.TaskStatus.DONE, CaseTask.TaskStatus.CANCELLED])],
            *[f"{deadline.description} (due {timezone.localtime(deadline.due_at):%d %b})" for deadline in case.deadlines.filter(
                due_at__lte=event.starts_at, status=MatterDeadline.Status.OPEN)],
        ]
        checks.append(_check("deadlines", "No deadlines or tasks outstanding before this date", not outstanding, "; ".join(outstanding[:5])))
        pending = list(case.document_requests.exclude(status__in=["ACCEPTED", "CANCELLED"]).values_list("title", flat=True))
        checks.append(_check("client_documents", "Documents requested from the client received and accepted", not pending, "; ".join(pending[:5])))
        if kind == "HEARING" or kind == "PRE_TRIAL":
            checks.append(_check("witness_statements", "Witness statements filed", cls._filed(case, CaseFiling.FilingType.WITNESS_STATEMENT)))
            checks.append(_check("list_of_documents", "List of documents filed", cls._filed(case, CaseFiling.FilingType.LIST_OF_DOCUMENTS)))
        if kind == "APPLICATION":
            checks.append(_check("application_papers", "Application and affidavits on the register", cls._filed(
                case, CaseFiling.FilingType.NOTICE_OF_MOTION, CaseFiling.FilingType.CHAMBER_SUMMONS,
                CaseFiling.FilingType.APPLICATION, CaseFiling.FilingType.AFFIDAVIT)))
        if kind == "SUBMISSIONS":
            checks.append(_check("submissions", "Written submissions filed", cls._filed(case, CaseFiling.FilingType.SUBMISSIONS)))
        if kind == "TAXATION":
            checks.append(_check("bill_of_costs", "Bill of costs filed", cls._filed(case, CaseFiling.FilingType.BILL_OF_COSTS)))
        client_user = case.client.user
        checks.append(_check(
            "client_informed", "Client can see this date on their portal",
            event.is_client_visible and client_user is not None and client_user.is_active,
            "" if client_user else "The client has no portal account. Inform them directly and note it on the file.",
        ))
        return checks

    @classmethod
    def client_checks(cls, event):
        checks = []
        if event.hearing_mode in VIRTUAL_MODES:
            session = getattr(event, "courtroom_session", None)
            checks.append(_check(
                "join_link", "Court link available on your dashboard",
                session is not None and session.client_access_enabled,
                "The firm will add it before the sitting." if session is None else "",
            ))
        pending = list(event.case.document_requests.filter(status__in=["OPEN", "REPLACEMENT_REQUIRED"]).values_list("title", flat=True))
        checks.append(_check("documents", "Documents your advocate asked for have been uploaded", not pending, "; ".join(pending[:5])))
        return checks

    # ------------------------------------------------------------------ guidance
    @staticmethod
    def _last_directions(event):
        previous = event.case.events.filter(starts_at__lt=event.starts_at).exclude(orders_directions="").order_by("-starts_at").first()
        return previous.orders_directions if previous else ""

    @classmethod
    def advocate_guidance(cls, event):
        playbook = playbook_for(event.event_type)
        directions = cls._last_directions(event)
        return {
            "purpose": playbook["purpose"],
            "last_directions": directions,
            "checklist": playbook["checklist"],
            "anticipated_questions": [
                {"from": source, "question": question, "prepare": prepare} for source, question, prepare in playbook["questions"]
            ],
            "form_of_address": form_of_address(event.case.court_type),
            "after_the_sitting": [
                "Record the outcome, orders and next date on the matter the same day, so the client and the diary update.",
                "Diarise every deadline in the orders.",
            ],
            "disclaimer": ADVOCATE_DISCLAIMER,
        }

    @classmethod
    def client_guidance(cls, event):
        playbook = playbook_for(event.event_type)
        virtual = event.hearing_mode in VIRTUAL_MODES
        before = [
            "Join 30 minutes early from your dashboard, using a quiet private room and your full name as your display name."
            if virtual else
            f"Arrive early at {event.court_station or event.court or 'the court'} with your national ID or passport.",
            "Dress as you would for a formal meeting and switch your phone to silent.",
        ]
        in_court = [
            form_of_address(event.case.court_type),
            "Keep your microphone muted until you are asked to speak." if virtual else "Stand when the court addresses you.",
            "Let your advocate speak for you and do not interrupt the court.",
            "Recording the proceedings is not allowed unless the court permits it.",
        ]
        return {
            "purpose": playbook["client_purpose"],
            "your_role": playbook["client_role"],
            "before": before,
            "in_court": in_court,
            "if_you_give_evidence": playbook.get("client_witness", []),
            "after": ["Your advocate will explain what happened, and the next date will appear on your dashboard."],
            "disclaimer": CLIENT_DISCLAIMER,
        }

    @staticmethod
    def minimised_context(event, checks):
        """Only what tailoring needs: no names, identity numbers or contact details."""
        case = event.case
        our_role = case.parties.filter(is_our_client=True).values_list("party_role", flat=True).first() or "not recorded"
        return {
            "sitting": event.get_event_type_display(),
            "court_type": case.get_court_type_display() or "not recorded",
            "matter_type": case.get_case_type_display(),
            "court_stage": case.get_court_stage_display(),
            "our_client_is": our_role,
            "claim_amount_kes": str(case.claim_amount) if case.claim_amount else "not recorded",
            "last_directions": CourtPreparationService._last_directions(event),
            "papers_on_record": sorted({filing.get_filing_type_display() for filing in case.filings.all()}),
            "outstanding_preparation": [item["label"] for item in checks if not item["passed"]],
        }

    # ------------------------------------------------------------------ listings
    @classmethod
    def briefs_for_advocate(cls, user):
        lawyer = getattr(user, "lawyer_profile", None)
        is_owner = user.role == UserRole.ADMIN and hasattr(user, "owned_firm")
        if lawyer is None:
            return []
        if not is_owner and not lawyer.has_permission(LawyerPermission.USE_AI_TOOLS):
            raise PermissionError("The USE_AI_TOOLS permission is required.")
        events = cls.upcoming_events().filter(case__assigned_lawyer=lawyer, case__firm=lawyer.law_firm)
        return [(event, cls.current(event, CourtPreparationBrief.Audience.ADVOCATE)) for event in events]

    @classmethod
    def briefs_for_client(cls, client):
        events = cls.upcoming_events().filter(case__client=client, is_client_visible=True)
        return [(event, cls.current(event, CourtPreparationBrief.Audience.CLIENT)) for event in events]

    # ------------------------------------------------------------------ notifications
    @classmethod
    def process_due(cls):
        """Daily: refresh briefs for every firm's upcoming sittings and notify at 7, 3, 1 and 0 days."""
        today = timezone.localdate()
        sent = 0
        for event in cls.upcoming_events():
            days = (timezone.localdate(event.starts_at) - today).days
            if days not in NOTIFY_ON_DAYS:
                continue
            case = event.case
            when = timezone.localtime(event.starts_at).strftime("%d %b %Y %H:%M")
            advocate_user = case.assigned_lawyer.user if case.assigned_lawyer_id else None
            if advocate_user and advocate_user.is_active and cls.advocate_can_use(advocate_user, case):
                brief = cls.current(event, CourtPreparationBrief.Audience.ADVOCATE)
                gaps = sum(1 for item in brief.checks if not item["passed"])
                sent += cls._notify(
                    firm=case.firm, recipient=advocate_user, case=case,
                    notification_type=Notification.NotificationType.COURT_PREPARATION,
                    title=f"{event.get_event_type_display()} {cls._countdown(days)}: {case.case_number}",
                    message=f"{when}. Preparation readiness {brief.readiness}%" + (f", {gaps} item(s) outstanding." if gaps else "."),
                    action_url=f"/lawyer/court-preparation?event={event.id}",
                    event_key=f"COURT_PREP:{event.id}:ADVOCATE:{days}d",
                )
            client_user = case.client.user
            if event.is_client_visible and client_user and client_user.is_active:
                cls.current(event, CourtPreparationBrief.Audience.CLIENT)
                sent += cls._notify(
                    firm=case.firm, recipient=client_user, case=case,
                    notification_type=Notification.NotificationType.COURT_PREPARATION,
                    title=f"Your court date {cls._countdown(days)}",
                    message=f"{event.get_event_type_display()} on {when}. See how to prepare on your dashboard.",
                    action_url=f"/client/dashboard?prepare={event.id}",
                    event_key=f"COURT_PREP:{event.id}:CLIENT:{days}d",
                )
        return sent

    @staticmethod
    def _notify(*, recipient, event_key, **fields):
        """Send once per key; returns 1 only when a new notification was created."""
        if Notification.objects.filter(recipient=recipient, event_key=event_key).exists():
            return 0
        return 1 if NotificationService.create(recipient=recipient, event_key=event_key, **fields) else 0

    @staticmethod
    def _countdown(days):
        return "today" if days == 0 else "tomorrow" if days == 1 else f"in {days} days"
