from datetime import timedelta

from django.utils import timezone

from apps.ai.assistants.base import DashboardAssistant, Unavailable, text, when
from apps.ai.assistants.records_room import client_records_room_view
from apps.ai.models import AssistantUsage
from apps.ai.services.court_preparation_playbooks import KIND_BY_EVENT_TYPE
from apps.ai.services.court_preparation_service import CourtPreparationService
from apps.authentication.portal_access import portal_access_allowed
from apps.billing.models import Invoice
from apps.cases.models import Case, CaseEvent
from apps.subscriptions.catalog import Feature
from apps.subscriptions.services import SubscriptionService

OPEN_EVENT_STATUSES = [CaseEvent.EventStatus.SCHEDULED, CaseEvent.EventStatus.CONFIRMED]
OPEN_TASK_STATUSES = ["PENDING", "IN_PROGRESS", "BLOCKED", "OVERDUE"]
# The fee notes a client already sees on their statement.
CLIENT_VISIBLE_INVOICE_STATUSES = ["ISSUED", "PARTIALLY_PAID", "PAID", "OVERDUE", "DISPUTED", "CREDITED"]
PREPARATION_DAYS = 14


class ClientAssistant(DashboardAssistant):
    """The client's own guide to their matters with the firm.

    It sees only what the client portal already shows this client: their own
    matters, the events, tasks, documents, notes and filings the firm has
    marked visible to them, and their own fee notes. Nothing about other
    clients, the firm's staff (beyond their advocate's name), its finances or
    its internal notes and strategy is ever sent to the model.
    """

    audience = AssistantUsage.Audience.CLIENT
    plan_feature = Feature.AI_CASE_ANALYSIS
    title = "Your matter assistant"
    subtitle = "Answers from your own matters with the firm"
    welcome = (
        "Hello! I can explain where your matters stand, what is coming up next and how to prepare for "
        "court dates. I only see what the firm has shared with you. For advice on your case, "
        "your advocate is the right person to ask."
    )
    instructions = """You are the personal assistant inside a Kenyan law firm's client portal. You speak to ONE client about THEIR OWN matters.
Help the client understand where each matter stands, what happens next, what the firm has asked of them, and how to prepare for upcoming court dates and meetings (use the preparation guidance in RECORDS: what to bring, how to dress, how to join a virtual court, how to behave in court).
Boundaries:
- Only discuss this client's matters in RECORDS. Never discuss other clients, the firm's staff other than the client's own advocate, the firm's finances or internal workings.
- Do not give legal advice or opinions on strategy, merits or likely outcome. For those, encourage the client to ask their advocate and say how to reach the firm (contact details are in RECORDS).
- If the client says something urgent (arrest, a missed court date, a deadline today), tell them to contact their advocate or the firm immediately.
- Be reassuring and practical. Explain legal terms simply.
Being proactive:
- When the question is general ("what's next?", "any updates?"), lead with the nearest upcoming court date or meeting, then how to prepare for it, then anything the firm has asked of them or a fee note that is due.
- For any upcoming event, walk the client through its how_to_prepare and checklist in RECORDS: what to bring, when to arrive, how to attend, and what is still to do.
Your papers:
- The firm keeps paper documents, not files, so there is nothing to upload. When the firm asks for a document, the client says in Documents how and when they will bring or send the paper; the firm files it on arrival and gives it a reference.
- Answer "where is my ID?" or "did you get my documents?" from your_papers in RECORDS: the document's reference (for example KYC-2026-039/D1), the file it is in, and its status (awaiting delivery, filed, checked out, released). The firm does not share which cabinet or drawer holds it.
- To get an original back, the client asks their advocate; the firm releases originals through its own controlled process."""

    app_guide = {
        "dashboard": "Dashboard (/client/dashboard): your next court date, what the firm needs from you and recent updates.",
        "matters": "Cases (/client/cases): each of your matters, its stage, your advocate, its events, court papers and notes from the firm.",
        "calendar": "Calendar (/client/calendar): all your upcoming court dates and meetings.",
        "documents": "Documents (/client/documents): documents the firm needs from you, and the papers it holds for you with their references. For each requested document, say how and when you will bring or send the paper; nothing is uploaded.",
        "fees": "Fees & Client Account (/client/billing): your fee notes, what is paid and what is still due.",
        "notifications": "Notifications (/client/notifications): reminders and updates from the firm.",
        "profile": "Profile (/client/profile): your contact details and password.",
        "contacting_the_firm": "Use the firm's phone number or email in RECORDS. Your advocate answers questions about your case.",
    }

    def check_access(self, user):
        client = getattr(user, "client_profile", None)
        if client is None:
            raise Unavailable("The matter assistant is for clients.")
        if not portal_access_allowed(user):
            raise Unavailable("The assistant opens once the firm has accepted your instructions.")

    def firm_for(self, user):
        return user.client_profile.firm

    def records(self, user):
        client = user.client_profile
        firm = client.firm
        now = timezone.now()
        # Court preparation guidance comes with AI case analysis in the firm's plan.
        prepare = SubscriptionService.has_feature(firm, Feature.AI_CASE_ANALYSIS)
        cases = (
            Case.objects.filter(client=client, firm=firm)
            .select_related("assigned_lawyer__user")
            .prefetch_related("events", "tasks", "attachments", "notes", "filings")
            .order_by("-is_active", "-updated_at")
        )
        matters = []
        for case in cases[:25]:
            visible_events = [event for event in case.events.all() if event.is_client_visible]
            upcoming = sorted(
                (event for event in visible_events if event.starts_at and event.starts_at >= now - timedelta(hours=3)
                 and event.status in OPEN_EVENT_STATUSES),
                key=lambda event: event.starts_at,
            )
            past = sorted(
                (event for event in visible_events if event.starts_at and event.starts_at < now - timedelta(hours=3)),
                key=lambda event: event.starts_at, reverse=True,
            )
            matters.append({
                "matter_number": case.case_number,
                "title": case.title,
                "status": case.get_matter_status_display(),
                "court_stage": case.get_court_stage_display() or None,
                "court": case.court_name or case.court_station or None,
                "court_case_number": case.official_court_case_number or None,
                "your_advocate": case.assigned_lawyer.user.full_name if case.assigned_lawyer_id else "Not yet assigned",
                "next_court_date": when(case.next_court_date),
                "upcoming": [self._event(event, now, prepare=prepare) for event in upcoming[:5]],
                "recent": [
                    {"what": event.get_event_type_display(), "date": when(event.starts_at), "status": event.get_status_display(),
                     "next_date": when(event.next_date)}
                    for event in past[:3]
                ],
                "asked_of_you": [
                    {"task": task.title, "due": when(task.due_at), "status": task.get_status_display()}
                    for task in case.tasks.all() if task.is_client_visible and task.status in OPEN_TASK_STATUSES
                ],
                "documents_shared_with_you": [
                    item.title or item.file_name for item in case.attachments.all()
                    if item.is_client_visible and not item.is_confidential
                ][:15],
                "court_papers": [
                    {"paper": filing.get_filing_type_display(), "status": filing.get_status_display(), "filed": when(filing.filed_at)}
                    for filing in case.filings.all() if filing.is_client_visible
                ][:10],
                "notes_from_the_firm": [
                    {"title": note.title, "note": text(note.body, 500)}
                    for note in case.notes.all() if note.is_client_visible
                ][:5],
            })
        invoices = Invoice.objects.filter(firm=firm, client=client, status__in=CLIENT_VISIBLE_INVOICE_STATUSES).select_related("matter")
        return {
            "client_name": client.full_name,
            "firm": {"name": firm.name, "email": firm.email or None, "phone": firm.phone_number or None},
            "matters": matters,
            "fee_notes": [
                {"number": invoice.invoice_number, "matter": invoice.matter.case_number if invoice.matter_id else None,
                 "total": f"{invoice.currency} {invoice.total_amount}", "balance": f"{invoice.currency} {invoice.balance}",
                 "due": when(invoice.due_date), "status": invoice.get_status_display()}
                for invoice in invoices.order_by("-invoice_date")[:10]
            ],
            "your_papers": client_records_room_view(client),
        }

    @staticmethod
    def _event(event, now, *, prepare):
        item = {
            "what": event.get_event_type_display(),
            "title": event.title,
            "when": when(event.starts_at),
            "where": event.court_station or event.court or event.physical_venue or None,
            "courtroom": event.courtroom or None,
            "attendance": event.get_hearing_mode_display(),
        }
        if prepare and event.event_type in KIND_BY_EVENT_TYPE and event.starts_at <= now + timedelta(days=PREPARATION_DAYS):
            guidance = CourtPreparationService.client_guidance(event)
            item["how_to_prepare"] = {key: guidance[key] for key in ("purpose", "your_role", "before", "in_court", "if_you_give_evidence", "after")}
            item["checklist"] = [check["label"] + (" (done)" if check["passed"] else " (still to do)") for check in CourtPreparationService.client_checks(event)]
        return item

    def suggestions(self, user, records):
        questions = []
        if any(matter["upcoming"] for matter in records["matters"]):
            questions += ["When is my next court date?", "How should I prepare for my next court date?"]
        if any(matter["asked_of_you"] for matter in records["matters"]):
            questions.append("What does the firm need from me?")
        questions.append("Where does my matter stand?")
        if records["fee_notes"]:
            questions.append("Do I have any fee notes to pay?")
        return questions

    def records_answer(self, records):
        lines = ["Here is a summary from your records with the firm."]
        upcoming = [(matter, event) for matter in records["matters"] for event in matter["upcoming"]]
        if upcoming:
            lines.append("\n**Coming up**")
            for matter, event in upcoming[:5]:
                where = f" at {event['where']}" if event["where"] else ""
                lines.append(f"- {event['what']} for *{matter['title']}* on {event['when']}{where} ({event['attendance']}).")
                for tip in event.get("how_to_prepare", {}).get("before", [])[:2]:
                    lines.append(f"  - {tip}")
        tasks = [(matter, task) for matter in records["matters"] for task in matter["asked_of_you"]]
        if tasks:
            lines.append("\n**The firm has asked you to**")
            lines += [f"- {task['task']}" + (f" (due {task['due']})" if task["due"] else "") for _, task in tasks[:5]]
        unpaid = [note for note in records["fee_notes"] if note["status"] in {"Issued", "Partially paid", "Overdue"}]
        if unpaid:
            lines.append("\n**Fee notes awaiting payment**")
            lines += [f"- {note['number']}: balance {note['balance']}" for note in unpaid[:5]]
        if len(lines) == 1:
            lines.append("You have nothing coming up and nothing outstanding right now.")
        firm = records["firm"]
        contact = " or ".join(item for item in (firm["phone"], firm["email"]) if item)
        lines.append(f"\nFor anything else, please contact {firm['name']}" + (f" on {contact}." if contact else "."))
        return "\n".join(lines)
