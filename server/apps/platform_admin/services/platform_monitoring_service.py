from collections import Counter
from datetime import timedelta
from decimal import Decimal

from django.db.models import Count, Q
from django.db.models.functions import TruncMonth
from django.utils import timezone

from apps.common.choices import UserRole
from apps.firm.models import LawFirm
from apps.platform_admin.models import FirmOnboardingRequest, PlatformActivity
from apps.subscriptions.models import FirmSubscription, SubscriptionInvoice
from apps.subscriptions.services import SubscriptionService, add_months
from apps.users.models import User

# Effective subscription states, in the order the console shows them.
SUBSCRIPTION_STATES = ["TRIALING", "ACTIVE", "GRACE", "EXPIRED", "SUSPENDED", "CANCELLED"]
PAYING_STATES = {"ACTIVE", "GRACE"}


def monthly_value(subscription):
    """What a subscription earns per month, excluding VAT."""
    plan = subscription.plan
    if subscription.billing_cycle == FirmSubscription.BillingCycle.ANNUAL:
        return (plan.annual_price / 12).quantize(Decimal("0.01"))
    return plan.monthly_price


class PlatformMonitoringService:

    @staticmethod
    def firm_row(firm, subscription=None):
        subscription = subscription or SubscriptionService.get(firm)
        return {
            "id": firm.id,
            "name": firm.name,
            "county": firm.county,
            "town": firm.town,
            "is_active": firm.is_active,
            "owner_name": firm.owner.full_name,
            "owner_email": firm.owner.email,
            "plan_code": subscription.plan.code,
            "plan_name": subscription.plan.name,
            "subscription_status": SubscriptionService.effective_status(subscription),
            "trial_ends_at": subscription.trial_ends_at,
            "current_period_end": subscription.current_period_end,
            "created_at": firm.created_at,
        }

    @classmethod
    def overview(cls):
        now = timezone.now()
        firms = list(LawFirm.objects.select_related("owner", "subscription__plan"))
        subscriptions = {firm.id: SubscriptionService.get(firm) for firm in firms}
        statuses = {firm_id: SubscriptionService.effective_status(sub, now) for firm_id, sub in subscriptions.items()}

        status_counts = Counter(statuses.values())
        plan_counts = Counter(sub.plan.name for sub in subscriptions.values())
        mrr = sum(
            (monthly_value(sub) for firm_id, sub in subscriptions.items() if statuses[firm_id] in PAYING_STATES),
            Decimal("0.00"),
        )

        first_month = add_months(now.replace(day=1, hour=0, minute=0, second=0, microsecond=0), -11)
        monthly = {
            row["month"].strftime("%Y-%m"): row["count"]
            for row in LawFirm.objects.filter(created_at__gte=first_month)
            .annotate(month=TruncMonth("created_at")).values("month").annotate(count=Count("id"))
        }
        new_firms_by_month = []
        for offset in range(12):
            month = add_months(first_month, offset)
            new_firms_by_month.append({
                "month": month.strftime("%Y-%m"),
                "label": month.strftime("%b %Y"),
                "count": monthly.get(month.strftime("%Y-%m"), 0),
            })

        owners = User.objects.filter(owned_firm__isnull=False)
        trials_ending = sorted(
            (
                cls.firm_row(firm, subscriptions[firm.id]) for firm in firms
                if statuses[firm.id] == "TRIALING"
                and subscriptions[firm.id].trial_ends_at
                and subscriptions[firm.id].trial_ends_at <= now + timedelta(days=7)
            ),
            key=lambda row: row["trial_ends_at"],
        )
        recent_firms = sorted(firms, key=lambda firm: firm.created_at, reverse=True)[:5]

        return {
            "firms": {
                "total": len(firms),
                "active": sum(1 for firm in firms if firm.is_active),
                "suspended": sum(1 for firm in firms if not firm.is_active),
                "new_this_month": sum(1 for firm in firms if firm.created_at >= now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)),
            },
            "subscriptions": {
                "by_status": [{"status": state, "count": status_counts.get(state, 0)} for state in SUBSCRIPTION_STATES],
                "by_plan": [{"plan": name, "count": count} for name, count in plan_counts.most_common()],
                "monthly_recurring_revenue": str(mrr),
            },
            # Firm owners are the only firm people the platform sees.
            "owners": {
                "total": owners.count(),
                "active": owners.filter(is_active=True).count(),
                "signed_in_last_30_days": owners.filter(last_login__gte=now - timedelta(days=30)).count(),
            },
            "new_firms_by_month": new_firms_by_month,
            "pending_payments": SubscriptionInvoice.objects.filter(
                status=SubscriptionInvoice.Status.PAYMENT_SUBMITTED,
            ).count(),
            "new_onboarding_requests": FirmOnboardingRequest.objects.filter(
                status=FirmOnboardingRequest.Status.NEW,
            ).count(),
            "trials_ending_soon": trials_ending[:8],
            "recent_firms": [cls.firm_row(firm, subscriptions[firm.id]) for firm in recent_firms],
            "recent_activity": [
                {
                    "id": item.id,
                    "action": item.action,
                    "action_label": item.get_action_display(),
                    "summary": item.summary,
                    "actor": item.actor.full_name if item.actor else None,
                    "firm_id": item.firm_id,
                    "created_at": item.created_at,
                }
                for item in PlatformActivity.objects.select_related("actor")[:10]
            ],
        }

    @staticmethod
    def firms_queryset(*, search="", plan="", status="", active=""):
        queryset = LawFirm.objects.select_related("owner", "subscription__plan").order_by("-created_at")
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | Q(registration_number__icontains=search)
                | Q(owner__email__icontains=search) | Q(owner__first_name__icontains=search)
                | Q(owner__last_name__icontains=search) | Q(county__icontains=search)
            )
        if plan:
            queryset = queryset.filter(subscription__plan__code=plan)
        if active in {"true", "false"}:
            queryset = queryset.filter(is_active=active == "true")
        firms = list(queryset)
        if status:
            firms = [
                firm for firm in firms
                if SubscriptionService.effective_status(SubscriptionService.get(firm)) == status
            ]
        return firms

    @staticmethod
    def visible_users():
        """Firm owners and platform administrators; a firm's staff and clients stay private to the firm."""
        return User.objects.select_related("owned_firm").filter(
            Q(owned_firm__isnull=False) | Q(role=UserRole.PLATFORM_ADMIN),
        )

    @staticmethod
    def user_row(user):
        firm = getattr(user, "owned_firm", None)
        return {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "phone_number": user.phone_number,
            "role": user.role,
            "role_label": "Firm owner" if firm else user.get_role_display(),
            "is_firm_owner": firm is not None,
            "firm": {"id": firm.id, "name": firm.name} if firm else None,
            "is_active": user.is_active,
            "last_login": user.last_login,
            "created_at": user.created_at,
        }

    @classmethod
    def users_queryset(cls, *, search="", role="", firm="", active=""):
        queryset = cls.visible_users().order_by("-created_at")
        if search:
            queryset = queryset.filter(
                Q(email__icontains=search) | Q(first_name__icontains=search)
                | Q(last_name__icontains=search) | Q(phone_number__icontains=search)
            )
        if role == "FIRM_OWNER":
            queryset = queryset.filter(owned_firm__isnull=False)
        elif role == UserRole.PLATFORM_ADMIN:
            queryset = queryset.filter(role=UserRole.PLATFORM_ADMIN)
        if firm:
            queryset = queryset.filter(owned_firm__id=firm)
        if active in {"true", "false"}:
            queryset = queryset.filter(is_active=active == "true")
        return queryset
