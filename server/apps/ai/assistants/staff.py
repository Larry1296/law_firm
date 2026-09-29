from datetime import timedelta

from django.db.models import Prefetch
from django.utils import timezone

from apps.ai.assistants.base import DashboardAssistant, Unavailable, text, when
from apps.ai.models import AssistantUsage, CourtPreparationBrief
from apps.ai.services.court_preparation_playbooks import KIND_BY_EVENT_TYPE
from apps.ai.services.court_preparation_service import CourtPreparationService
from apps.ai.services.knowledge_retrieval_service import KnowledgeRetrievalService
from apps.billing.models import Invoice
from apps.cases.models import Case, CaseEvent, MatterDeadline
from apps.common.choices import UserRole
from apps.firm.models import LawFirmMember
from apps.staff.models import LawyerPermission

OPEN_EVENT_STATUSES = [CaseEvent.EventStatus.SCHEDULED, CaseEvent.EventStatus.CONFIRMED]
OPEN_TASK_STATUSES = ["PENDING", "IN_PROGRESS", "BLOCKED", "OVERDUE"]
UNPAID_INVOICE_STATUSES = ["ISSUED", "PARTIALLY_PAID", "OVERDUE", "DISPUTED"]
LOOKAHEAD_DAYS = 30
PREPARATION_DAYS = 14
MAX_MATTERS = 40

STAFF_RULES = """
Working style:
- Be a sharp, practical colleague. Lead with what needs attention soonest: sittings in the next few days, preparation gaps, overdue tasks and deadlines.
- For an upcoming sitting, use its readiness and outstanding checks in RECORDS to suggest concrete preparation steps (papers to file or serve, bundles, witnesses, authorities to confirm, client briefing, virtual link).
- When drafting (a checklist, a client update, a short note), base it only on RECORDS and mark anything that must be confirmed from the file.
- Remind the user to verify facts and authorities against the file where it matters. Your output is a draft for a qualified advocate, not legal advice."""


def matter_view(case, now, *, briefs, with_billing):
    """One matter as its advocates may see it, trimmed to what helps them act."""
    events = sorted(
        (event for event in case.events.all() if event.starts_at and event.status in OPEN_EVENT_STATUSES
         and now - timedelta(hours=3) <= event.starts_at <= now + timedelta(days=LOOKAHEAD_DAYS)),
        key=lambda event: event.starts_at,
    )
    last = max(
        (event for event in case.events.all() if event.starts_at and event.starts_at < now - timedelta(hours=3)),
        key=lambda event: event.starts_at, default=None,
    )
    view = {
        "matter_number": case.case_number,
        "title": case.title,
        "client": case.client.full_name,
        "practice_area": case.get_practice_area_display() or None,
        "status": case.get_matter_status_display(),
        "court_stage": case.get_court_stage_display() or None,
        "court": case.court_name or case.court_station or None,
        "court_case_number": case.official_court_case_number or None,
        "responsible_advocate": case.assigned_lawyer.user.full_name if case.assigned_lawyer_id else "Unassigned",
        "priority": case.get_priority_display() if case.priority else None,
        "limitation_date": when(case.limitation_date),
        "next_action": text(case.next_action, 300) or None,
        "upcoming": [],
        "last_sitting": {
            "what": last.get_event_type_display(), "date": when(last.starts_at), "status": last.get_status_display(),
            "orders_or_directions": text(last.orders_directions, 400) or None, "next_date": when(last.next_date),
        } if last else None,
        "open_tasks": [
            {"task": task.title, "due": when(task.due_at), "status": task.get_status_display(),
             "overdue": bool(task.due_at and task.due_at < now)}
            for task in case.tasks.all() if task.status in OPEN_TASK_STATUSES
        ][:10],
        "open_deadlines": [
            {"deadline": deadline.get_deadline_type_display(), "due": when(deadline.due_at),
             "overdue": deadline.due_at < now, "note": text(deadline.description, 200) or None}
            for deadline in case.deadlines_for_assistant
        ][:8],
    }
    for event in events[:5]:
        item = {
            "what": event.get_event_type_display(), "title": event.title, "when": when(event.starts_at),
            "where": event.court_station or event.court or event.physical_venue or None,
            "judicial_officer": event.judicial_officer or None, "attendance": event.get_hearing_mode_display(),
        }
        if event.event_type in KIND_BY_EVENT_TYPE and event.starts_at <= now + timedelta(days=PREPARATION_DAYS):
            checks = CourtPreparationService.advocate_checks(event)
            item["readiness_percent"] = round(100 * sum(check["passed"] for check in checks) / len(checks)) if checks else 100
            item["outstanding_preparation"] = [check["label"] for check in checks if not check["passed"]]
            brief = briefs.get(event.id)
            if brief and brief.tailored:
                item["ai_preparation_notes"] = {key: brief.tailored.get(key) for key in ("focus", "risks")}
        view["upcoming"].append(item)
    if with_billing:
        view["unpaid_fee_notes"] = [
            {"number": invoice.invoice_number, "balance": f"{invoice.currency} {invoice.balance}",
             "due": when(invoice.due_date), "status": invoice.get_status_display()}
            for invoice in case.unpaid_invoices_for_assistant
        ]
    return view


def load_matters(queryset, now):
    queryset = queryset.select_related("client", "assigned_lawyer__user").prefetch_related(
        "events", "tasks",
        Prefetch("deadlines", queryset=MatterDeadline.objects.filter(status="OPEN").order_by("due_at"), to_attr="deadlines_for_assistant"),
        Prefetch("invoices", queryset=Invoice.objects.filter(status__in=UNPAID_INVOICE_STATUSES), to_attr="unpaid_invoices_for_assistant"),
    )
    cases = list(queryset.filter(is_active=True))

    def urgency(case):
        dates = [event.starts_at for event in case.events.all() if event.starts_at and event.starts_at >= now - timedelta(hours=3) and event.status in OPEN_EVENT_STATUSES]
        return (min(dates) if dates else now + timedelta(days=3650), -case.updated_at.timestamp())

    cases.sort(key=urgency)
    return cases


def current_briefs(cases):
    """Stored advocate briefs only: reading them never triggers a new AI call."""
    return {
        brief.event_id: brief
        for brief in CourtPreparationBrief.objects.filter(
            case__in=cases, audience=CourtPreparationBrief.Audience.ADVOCATE, is_current=True,
        )
    }


def staff_records_answer(records, who):
    now_lines = [f"Here is what needs your attention across {who}, from the records."]
    sittings = [(matter, event) for matter in records["matters"] for event in matter["upcoming"]]
    if sittings:
        now_lines.append("\n**Coming up**")
        for matter, event in sittings[:8]:
            readiness = f" · readiness {event['readiness_percent']}%" if "readiness_percent" in event else ""
            now_lines.append(f"- {event['when']}: {event['what']} in {matter['matter_number']} ({matter['title']}){readiness}")
            for gap in event.get("outstanding_preparation", [])[:3]:
                now_lines.append(f"  - To do: {gap}")
    overdue = [(matter, task) for matter in records["matters"] for task in matter["open_tasks"] if task["overdue"]]
    if overdue:
        now_lines.append("\n**Overdue tasks**")
        now_lines += [f"- {matter['matter_number']}: {task['task']} (due {task['due']})" for matter, task in overdue[:8]]
    deadlines = [(matter, item) for matter in records["matters"] for item in matter["open_deadlines"]]
    if deadlines:
        now_lines.append("\n**Open deadlines**")
        now_lines += [
            f"- {matter['matter_number']}: {item['deadline']} due {item['due']}" + (" (overdue)" if item["overdue"] else "")
            for matter, item in deadlines[:8]
        ]
    if len(now_lines) == 1:
        now_lines.append("Nothing is scheduled or overdue right now.")
    now_lines.append("\n_The AI service is not available, so this is a summary rather than an answer to your question._")
    return "\n".join(now_lines)


class AdvocateAssistant(DashboardAssistant):
    """An advocate's assistant for the matters assigned to them, within their permissions.

    It needs the USE_AI_TOOLS permission. Fee notes are included only with
    VIEW_BILLING, and Kenyan law passages only with USE_LEGAL_RESEARCH.
    """

    audience = AssistantUsage.Audience.ADVOCATE
    title = "Advocate assistant"
    subtitle = "Your assigned matters, sittings and deadlines"
    welcome = (
        "I can brief you on your assigned matters: upcoming sittings and how ready you are, overdue tasks, "
        "deadlines, and what to prepare. I can also draft checklists and client updates from the records."
    )
    instructions = """You are the assistant for ONE advocate at a Kenyan law firm, inside their dashboard.
You see only the matters assigned to this advocate (in RECORDS) and only the information their permissions allow (listed in RECORDS under permissions).
Boundaries:
- If asked about a matter, client or colleague not in RECORDS, say it is not assigned to them or not available to them, without guessing whether it exists.
- If asked for billing and "view_billing" is false, say their account does not include billing access. If asked about the law and no SOURCES are given, say they need the legal research permission or should check the law directly.
- Never reveal other staff members' work, the firm's finances or firm-wide figures.""" + STAFF_RULES

    def lawyer(self, user):
        return getattr(user, "lawyer_profile", None)

    def check_access(self, user):
        lawyer = self.lawyer(user)
        if lawyer is None or not lawyer.is_active:
            raise Unavailable("The advocate assistant is for advocates.")
        if not lawyer.has_permission(LawyerPermission.USE_AI_TOOLS):
            raise Unavailable("Your account does not include AI tools. Ask your firm administrator to grant the Use AI Tools permission.")

    def firm_for(self, user):
        return self.lawyer(user).law_firm

    def records(self, user):
        lawyer = self.lawyer(user)
        now = timezone.now()
        with_billing = lawyer.has_permission(LawyerPermission.VIEW_BILLING)
        cases = load_matters(Case.objects.filter(firm=lawyer.law_firm, assigned_lawyer=lawyer), now)
        briefs = current_briefs(cases[:MAX_MATTERS])
        return {
            "advocate": user.full_name,
            "firm": lawyer.law_firm.name,
            "permissions": {
                "view_billing": with_billing,
                "legal_research": lawyer.has_permission(LawyerPermission.USE_LEGAL_RESEARCH),
            },
            "assigned_active_matters": len(cases),
            "matters_shown": min(len(cases), MAX_MATTERS),
            "matters": [matter_view(case, now, briefs=briefs, with_billing=with_billing) for case in cases[:MAX_MATTERS]],
        }

    def sources(self, user, question):
        if not self.lawyer(user).has_permission(LawyerPermission.USE_LEGAL_RESEARCH):
            return []
        return KnowledgeRetrievalService.retrieve_law(question)

    def suggestions(self, user, records):
        return [
            "What needs my attention this week?",
            "Am I ready for my next sitting?",
            "Which of my tasks are overdue?",
            "Draft an update for the client on my next hearing",
        ]

    def records_answer(self, records):
        return staff_records_answer(records, "your matters")


class FirmOwnerAssistant(DashboardAssistant):
    """The firm owner's oversight assistant across every matter in their firm."""

    audience = AssistantUsage.Audience.FIRM
    title = "Firm assistant"
    subtitle = "Oversight across your firm's matters"
    welcome = (
        "I can give you a firm-wide view: sittings coming up and how prepared each is, advocates' workloads, "
        "overdue tasks and deadlines, unassigned matters and unpaid fee notes."
    )
    instructions = """You are the oversight assistant for the OWNER of a Kenyan law firm, inside the firm administration dashboard.
You see the firm's active matters, workload by advocate, and billing totals in RECORDS. Help the owner spot risks early: sittings with preparation gaps, overdue work, approaching limitation dates and deadlines, unassigned matters, overloaded advocates and unpaid fee notes, and suggest who should act.
Boundaries: only this firm's RECORDS. Never discuss other firms or the Sheria Master platform's internal matters.""" + STAFF_RULES

    def check_access(self, user):
        if user.role != UserRole.ADMIN or getattr(user, "owned_firm", None) is None:
            raise Unavailable("The firm assistant is for the firm owner.")

    def firm_for(self, user):
        return user.owned_firm

    def records(self, user):
        firm = user.owned_firm
        now = timezone.now()
        cases = load_matters(Case.objects.filter(firm=firm), now)
        briefs = current_briefs(cases[:MAX_MATTERS])
        workload = {}
        for case in cases:
            name = case.assigned_lawyer.user.full_name if case.assigned_lawyer_id else "Unassigned"
            entry = workload.setdefault(name, {"active_matters": 0, "sittings_next_14_days": 0})
            entry["active_matters"] += 1
            entry["sittings_next_14_days"] += sum(
                1 for event in case.events.all()
                if event.starts_at and event.status in OPEN_EVENT_STATUSES and now <= event.starts_at <= now + timedelta(days=14)
            )
        unpaid = Invoice.objects.filter(firm=firm, status__in=UNPAID_INVOICE_STATUSES)
        return {
            "firm": firm.name,
            "active_matters": len(cases),
            "matters_shown": min(len(cases), MAX_MATTERS),
            "team": [
                {"name": member.user.full_name, "role": member.get_role_display()}
                for member in LawFirmMember.objects.filter(firm=firm, is_active=True).select_related("user")
            ],
            "workload_by_advocate": workload,
            "unpaid_fee_notes": {
                "count": unpaid.count(),
                "overdue": unpaid.filter(due_date__lt=timezone.localdate()).count(),
                "outstanding_balance": str(sum((invoice.balance for invoice in unpaid), 0)),
            },
            "matters": [matter_view(case, now, briefs=briefs, with_billing=True) for case in cases[:MAX_MATTERS]],
        }

    def suggestions(self, user, records):
        return [
            "What needs my attention this week?",
            "Which sittings are not fully prepared?",
            "How is work spread across the advocates?",
            "Which fee notes are overdue?",
        ]

    def records_answer(self, records):
        return staff_records_answer(records, "the firm")
