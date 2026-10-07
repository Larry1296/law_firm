from django.db.models import Count

from apps.ai.assistants.base import DashboardAssistant, Unavailable, when
from apps.ai.models import AssistantUsage
from apps.common.choices import UserRole
from apps.firm.models import LawFirm
from apps.platform_admin.services.platform_monitoring_service import PlatformMonitoringService
from apps.subscriptions.catalog import Feature
from apps.subscriptions.models import Plan, SubscriptionInvoice

MAX_FIRMS = 150

# How the console works, so the assistant can walk an administrator through a task.
CONSOLE_GUIDE = {
    "overview": "Overview (/platform/overview): platform-wide figures, trials ending soon, recent firms and activity.",
    "users": "Users (/platform/users): firm owners and platform administrators.",
    "law_firms": "Law firms (/platform/firms): every registered firm. Open one for its details, owner and subscription.",
    "register_a_firm": "Firms → Register a firm. Six steps: firm details (BRS registration number, KRA PIN), contact and location, practice areas, the owner (the managing advocate, who receives a password link), plan and start (free trial or active), then review. The owner then signs in and adds their own staff and clients.",
    "onboarding_requests": "Firms → Onboarding requests lists firms that asked to join from the homepage. Mark a request Contacted, then register the firm from it so the details carry over; the request is marked Registered.",
    "payments": "Billing → Payments lists subscription invoices. When a firm submits an M-Pesa receipt, check it against the Paybill statement, then Confirm payment; this extends the firm's paid period. Void only unpaid invoices raised in error.",
    "plans": "Billing → Plans. Edit prices, limits (advocates, support staff, active matters, branches) and features. A plan in use cannot be deleted; deactivate it so it is no longer offered. A firm cannot be moved to a plan whose limits it exceeds.",
    "subscriptions": "Open a firm from Law firms, then use the Subscription panel to change plan or billing cycle, extend a trial, record a paid period, set the grace period or add notes.",
    "suspend_a_firm": "Open the firm and choose Suspend firm, giving a reason. Its members cannot sign in until you Reactivate it. Records are kept.",
    "owner_password_link": "Open the firm and choose Send a new password link in the Firm owner panel; the link works once.",
    "users": "Users lists firm owners and platform administrators. Deactivating an account stops that person signing in. A firm's staff and clients are managed by the firm's owner and are not visible to the platform.",
    "privacy": "The platform sees a firm's account, owner and subscription only. It never sees a firm's staff, clients, matters or usage figures.",
}


def firm_directory():
    """Each firm's account as the Law firms console already shows it: never its staff, clients or matters."""
    firms = LawFirm.objects.select_related("owner", "subscription__plan").order_by("name")
    awaiting = dict(
        SubscriptionInvoice.objects.filter(status=SubscriptionInvoice.Status.PAYMENT_SUBMITTED)
        .values_list("firm").annotate(count=Count("id")).order_by()
    )
    directory = []
    for firm in firms[:MAX_FIRMS]:
        row = PlatformMonitoringService.firm_row(firm)
        directory.append({
            "name": row["name"],
            "location": ", ".join(part for part in (row["town"], row["county"]) if part) or None,
            "account": "Active" if row["is_active"] else "Suspended",
            "owner": row["owner_name"],
            "owner_email": row["owner_email"],
            "plan": row["plan_name"],
            "subscription_status": row["subscription_status"],
            "trial_ends": when(row["trial_ends_at"]),
            "paid_until": when(row["current_period_end"]),
            "registered": when(row["created_at"]),
            "payments_awaiting_confirmation": awaiting.get(firm.id, 0),
        })
    return directory


class PlatformAssistant(DashboardAssistant):
    """Helps platform administrators run Sheria Master and look after its registered firms.

    It sees each firm's account (name, location, owner, plan, subscription and
    pending payments), as the Law firms console does, and never a firm's staff,
    clients, matters or usage.
    """

    audience = AssistantUsage.Audience.PLATFORM
    title = "Platform assistant"
    subtitle = "Running the platform, from platform-wide figures"
    welcome = (
        "I can tell you about the registered firms (their owners, plans, subscriptions and payments), "
        "summarise platform-wide figures and walk you through any task in the console, step by step."
    )
    instructions = """You are the assistant for administrators of Sheria Master, a platform that Kenyan law firms subscribe to. The administrator may not be a lawyer, so explain plainly.
Help them run the platform and look after the registered firms:
- Answer questions about a particular firm from firms in RECORDS: its owner and how to reach them, plan, subscription status, trial or paid-until date and payments awaiting confirmation.
- Point out what needs action: payments to confirm, trials ending soon, expired or grace-period subscriptions, suspended firms and new onboarding requests, naming the firms concerned and the console step for each.
- Explain how to do any task in the console, step by step, using CONSOLE_GUIDE in RECORDS.
- Summarise and interpret the platform-wide totals in RECORDS.
Boundaries:
- You never see a firm's staff, clients, matters or usage, and neither does the platform. If asked, say so, and that only the firm's owner can see them.
- If a firm is not in RECORDS, say you cannot find it and suggest searching Law firms in the console.
- Never guess or invent a figure; use only the totals in RECORDS.
- Do not give legal advice."""

    def check_access(self, user):
        if user.role != UserRole.PLATFORM_ADMIN:
            raise Unavailable("The platform assistant is for platform administrators.")

    def records(self, user):
        overview = PlatformMonitoringService.overview()
        return {
            "platform_totals": {
                "firms": overview["firms"],
                "subscriptions_by_status": overview["subscriptions"]["by_status"],
                "firms_by_plan": overview["subscriptions"]["by_plan"],
                "monthly_recurring_revenue_kes_excl_vat": overview["subscriptions"]["monthly_recurring_revenue"],
                "firm_owners": overview["owners"],
                "new_firms_by_month": [{"month": row["label"], "count": row["count"]} for row in overview["new_firms_by_month"]],
                "payments_waiting_confirmation": overview["pending_payments"],
                "new_onboarding_requests": overview["new_onboarding_requests"],
                "trials_ending_within_7_days": len(overview["trials_ending_soon"]),
            },
            "plans": [
                {
                    "name": plan.name, "code": plan.code, "offered": plan.is_active,
                    "monthly_price_kes": str(plan.monthly_price), "annual_price_kes": str(plan.annual_price),
                    "limits": {
                        "advocates": plan.max_advocates, "support_staff": plan.max_support_staff,
                        "active_matters": plan.max_active_matters, "branches": plan.max_branches,
                    },
                    "features": [Feature.LABELS.get(code, code) for code in plan.features or []],
                }
                for plan in Plan.objects.order_by("sort_order", "monthly_price")
            ],
            "firms": firm_directory(),
            "firms_listed": f"{min(overview['firms']['total'], MAX_FIRMS)} of {overview['firms']['total']}",
            "CONSOLE_GUIDE": CONSOLE_GUIDE,
        }

    def matters_in(self, records):
        return 0

    def suggestions(self, user, records):
        return [
            "Which firms need my attention?",
            "How are subscriptions doing this month?",
            "How do I confirm an M-Pesa payment?",
            "How do I register a new firm?",
            "What is the difference between the plans?",
        ]

    def records_answer(self, records):
        totals = records["platform_totals"]
        firms = totals["firms"]
        lines = [
            "Here are the platform-wide figures.",
            f"- **Firms:** {firms['total']} ({firms['active']} active, {firms['suspended']} suspended, {firms['new_this_month']} new this month)",
            f"- **Monthly recurring revenue:** KES {totals['monthly_recurring_revenue_kes_excl_vat']} excluding VAT",
            f"- **Payments waiting for confirmation:** {totals['payments_waiting_confirmation']}",
            f"- **New onboarding requests:** {totals['new_onboarding_requests']}",
            f"- **Trials ending within 7 days:** {totals['trials_ending_within_7_days']}",
        ]
        attention = [
            firm for firm in records["firms"]
            if firm["payments_awaiting_confirmation"] or firm["subscription_status"] in {"GRACE", "EXPIRED", "SUSPENDED"}
        ]
        if attention:
            lines.append("\n**Firms that need attention**")
            lines += [
                f"- {firm['name']}: {firm['subscription_status'].title()}"
                + (f", {firm['payments_awaiting_confirmation']} payment(s) to confirm" if firm["payments_awaiting_confirmation"] else "")
                for firm in attention[:10]
            ]
        lines += [
            "\n_The AI service is not available, so this is a summary rather than an answer to your question. "
            "Step-by-step help for each task is on its page in the console._",
        ]
        return "\n".join(lines)
