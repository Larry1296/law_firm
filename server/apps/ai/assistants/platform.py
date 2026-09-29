from apps.ai.assistants.base import DashboardAssistant, Unavailable
from apps.ai.models import AssistantUsage
from apps.common.choices import UserRole
from apps.platform_admin.services.platform_monitoring_service import PlatformMonitoringService
from apps.subscriptions.catalog import Feature
from apps.subscriptions.models import Plan

# How the console works, so the assistant can walk an administrator through a task.
CONSOLE_GUIDE = {
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


class PlatformAssistant(DashboardAssistant):
    """Helps platform administrators run Sheria Master, from platform-wide totals only.

    It is never given anything about a particular firm (no names, owners,
    subscriptions or activity), so it can only answer in general terms.
    """

    audience = AssistantUsage.Audience.PLATFORM
    title = "Platform assistant"
    subtitle = "Running the platform, from platform-wide figures"
    welcome = (
        "I can explain how to carry out tasks in the console (registering firms, confirming payments, "
        "managing plans and subscriptions) and summarise platform-wide figures. For a particular firm, open it from Law firms."
    )
    instructions = """You are the assistant for administrators of Sheria Master, a platform that Kenyan law firms subscribe to.
Help them run the platform: explain how to do tasks in the console using CONSOLE_GUIDE in RECORDS, and summarise and interpret the platform-wide totals in RECORDS (firms, subscriptions, revenue, plans, pending payments and onboarding requests).
Boundaries:
- You have NO information about any particular firm, its owner, staff, clients, matters, subscription or payments. If asked about a specific firm or person, say you only work with platform-wide figures and that they can open the firm from Law firms in the console.
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
            "CONSOLE_GUIDE": CONSOLE_GUIDE,
        }

    def matters_in(self, records):
        return 0

    def suggestions(self, user, records):
        return [
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
            "\n_The AI service is not available, so this is a summary rather than an answer to your question. "
            "Step-by-step help for each task is on its page in the console._",
        ]
        return "\n".join(lines)
