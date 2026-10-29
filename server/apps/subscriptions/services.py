import calendar
import re
from datetime import timedelta
from decimal import ROUND_HALF_UP, Decimal

from django.conf import settings
from django.core.mail import send_mail
from django.db import connection, transaction
from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.exceptions import APIException, ValidationError

from apps.subscriptions.catalog import PLANS_BY_CODE, PRO, SOLE_PRACTICE_SUPPORT_NOTE, Feature, Limit, is_sole_practice
from apps.subscriptions.models import FirmSubscription, Plan, SubscriptionInvoice
from apps.firm.models import LawFirm

CENT = Decimal("0.01")
MPESA_RECEIPT_PATTERN = re.compile(r"^[A-Z0-9]{10}$")
# Days before the end of a paid period, and of a free trial, that the owner is reminded.
RENEWAL_REMINDER_DAYS = (14, 7, 1)
TRIAL_REMINDER_DAYS = (3, 1)


class SubscriptionInactive(APIException):
    status_code = status.HTTP_402_PAYMENT_REQUIRED
    default_detail = (
        "Your firm's subscription has lapsed. Records remain available to view, "
        "but changes are paused until the subscription is renewed."
    )
    default_code = "subscription_inactive"
    error_code = "subscription_inactive"


class FirmSuspended(APIException):
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = "Your firm's account has been suspended. Please contact the platform administrator."
    default_code = "firm_suspended"
    error_code = "firm_suspended"


class FeatureNotInPlan(APIException):
    status_code = status.HTTP_403_FORBIDDEN
    default_code = "plan_upgrade_required"
    error_code = "plan_upgrade_required"

    def __init__(self, feature):
        super().__init__(f"{Feature.LABELS.get(feature, feature)} is not included in your firm's plan.")
        self.feature = feature


class PlanLimitReached(APIException):
    status_code = status.HTTP_403_FORBIDDEN
    default_code = "plan_limit_reached"
    error_code = "plan_limit_reached"


def add_months(value, months):
    month_index = value.month - 1 + months
    year = value.year + month_index // 12
    month = month_index % 12 + 1
    day = min(value.day, calendar.monthrange(year, month)[1])
    return value.replace(year=year, month=month, day=day)


def firm_for_user(user):
    """The firm a user works for or is a client of, without raising."""
    owned = getattr(user, "owned_firm", None)
    if owned is not None:
        return owned
    membership = user.firm_memberships.filter(is_active=True).select_related("firm").first()
    if membership:
        return membership.firm
    client = getattr(user, "client_profile", None)
    return client.firm if client is not None else None


class SubscriptionService:

    # -----------------------------------------------------------------
    # Plans and subscription rows
    # -----------------------------------------------------------------

    @staticmethod
    def ensure_plan(code):
        """The active plan with this code; a retired or unknown code falls back to Pro."""
        plan = Plan.objects.filter(code=code, is_active=True).first()
        if plan:
            return plan
        if code not in PLANS_BY_CODE or Plan.objects.filter(code=code).exists():
            code = PRO
            plan = Plan.objects.filter(code=code).first()
            if plan:
                return plan
        return Plan.objects.create(**PLANS_BY_CODE[code])

    @classmethod
    def start_trial(cls, firm, plan_code=None):
        plan = cls.ensure_plan(plan_code or settings.SUBSCRIPTION_TRIAL_PLAN)
        now = timezone.now()
        subscription, _ = FirmSubscription.objects.update_or_create(
            firm=firm,
            defaults={
                "plan": plan,
                "status": FirmSubscription.Status.TRIALING,
                "trial_ends_at": now + timedelta(days=settings.SUBSCRIPTION_TRIAL_DAYS),
                "current_period_start": now,
                "current_period_end": None,
            },
        )
        return subscription

    @classmethod
    def get(cls, firm, *, lock=False):
        queryset = FirmSubscription.objects.select_related("plan")
        if lock and connection.in_atomic_block:
            queryset = queryset.select_for_update()
        subscription = queryset.filter(firm=firm).first()
        if subscription is None:
            subscription = cls.start_trial(firm)
        return subscription

    @classmethod
    def price_for(cls, subscription, billing_cycle=None, plan=None):
        """Firm overrides are totals per billing period, never per-seat rates."""
        plan = plan or subscription.plan
        cycle = billing_cycle or subscription.billing_cycle
        if subscription.is_complimentary:
            return Decimal("0.00")
        custom = (subscription.custom_annual_price if cycle == FirmSubscription.BillingCycle.ANNUAL
                  else subscription.custom_monthly_price)
        if custom is not None:
            return custom
        quantity = max(1, cls.usage(subscription.firm)[Limit.ADVOCATES]) if plan.pricing_basis == Plan.PricingBasis.ADVOCATE else 1
        return (plan.price_for(cycle) * quantity).quantize(CENT)

    # -----------------------------------------------------------------
    # State
    # -----------------------------------------------------------------

    @staticmethod
    def effective_status(subscription, now=None):
        """TRIALING, ACTIVE, GRACE, EXPIRED, SUSPENDED or CANCELLED."""
        now = now or timezone.now()
        status_ = subscription.status
        if status_ in {FirmSubscription.Status.SUSPENDED, FirmSubscription.Status.CANCELLED}:
            return status_
        if status_ == FirmSubscription.Status.TRIALING:
            if subscription.trial_ends_at and now > subscription.trial_ends_at:
                return "EXPIRED"
            return status_
        end = subscription.current_period_end
        if end is None or now <= end:
            return FirmSubscription.Status.ACTIVE
        if now <= end + timedelta(days=subscription.grace_period_days):
            return "GRACE"
        return "EXPIRED"

    @classmethod
    def is_writable(cls, subscription, now=None):
        return cls.effective_status(subscription, now) in {
            FirmSubscription.Status.TRIALING, FirmSubscription.Status.ACTIVE, "GRACE",
        }

    @classmethod
    def has_feature(cls, firm, feature):
        return feature in (cls.get(firm).plan.features or [])

    @classmethod
    def require_feature(cls, firm, feature):
        if not cls.has_feature(firm, feature):
            raise FeatureNotInPlan(feature)

    # -----------------------------------------------------------------
    # Usage and limits
    # -----------------------------------------------------------------

    @staticmethod
    def usage(firm):
        from apps.cases.models import Case
        from apps.staff.models import HR, IT, Accountant, Lawyer, Secretary

        closed = [Case.MatterStatus.CLOSED, Case.MatterStatus.ARCHIVED, Case.MatterStatus.CANCELLED]
        return {
            Limit.ADVOCATES: Lawyer.objects.filter(law_firm=firm, is_active=True).count(),
            Limit.SUPPORT_STAFF: sum(
                model.objects.filter(law_firm=firm, is_active=True).count()
                for model in (Secretary, Accountant, HR, IT)
            ),
            Limit.ACTIVE_MATTERS: Case.objects.filter(firm=firm).exclude(matter_status__in=closed).count(),
            Limit.BRANCHES: firm.branches.filter(is_active=True).count(),
        }

    @staticmethod
    def limit_for(plan, resource):
        return getattr(plan, Limit.FIELDS[resource])

    @classmethod
    def check_limit(cls, firm, resource, *, adding=1):
        """Refuse an addition that would exceed the plan. Locks the row inside a transaction."""
        subscription = cls.get(firm, lock=True)
        limit = cls.limit_for(subscription.plan, resource)
        if limit is None:
            return
        current = cls.usage(firm)[resource]
        if current + adding > limit:
            raise PlanLimitReached(
                f"Your {subscription.plan.name} plan allows {limit} {Limit.LABELS[resource].lower()} "
                f"and you have {current}. Upgrade the plan to add more."
            )

    @classmethod
    def check_support_role(cls, firm, model):
        """On a sole-practice plan the only staff account is a secretary."""
        from apps.staff.models import Lawyer, Secretary

        if model in (Lawyer, Secretary):
            return
        plan = cls.get(firm).plan
        if is_sole_practice(plan):
            raise PlanLimitReached(SOLE_PRACTICE_SUPPORT_NOTE.format(plan=plan.name))

    @classmethod
    def check_staff_seat(cls, staff):
        """Reactivating an inactive advocate or staff member takes a seat again."""
        from apps.staff.models import Lawyer

        if staff.is_active:
            return
        resource = Limit.ADVOCATES if isinstance(staff, Lawyer) else Limit.SUPPORT_STAFF
        cls.check_support_role(staff.law_firm, type(staff))
        cls.check_limit(staff.law_firm, resource)

    @classmethod
    def overages(cls, firm, plan):
        usage = cls.usage(firm)
        problems = []
        for resource in Limit.FIELDS:
            limit = cls.limit_for(plan, resource)
            if limit is not None and usage[resource] > limit:
                problems.append(
                    f"{Limit.LABELS[resource]}: {usage[resource]} in use, {plan.name} allows {limit}."
                )
        return problems

    # -----------------------------------------------------------------
    # Invoices and M-Pesa payments
    # -----------------------------------------------------------------

    @staticmethod
    def _next_invoice_number(now):
        prefix = f"SUB-{now:%Y}-"
        last = (
            SubscriptionInvoice.objects.select_for_update()
            .filter(number__startswith=prefix)
            .order_by("-number")
            .values_list("number", flat=True)
            .first()
        )
        sequence = int(last.rsplit("-", 1)[1]) + 1 if last else 1
        return f"{prefix}{sequence:05d}"

    @classmethod
    def proration_credit(cls, subscription, now=None):
        """Unused value of the current paid period, credited when changing plan."""
        now = now or timezone.now()
        start, end = subscription.current_period_start, subscription.current_period_end
        if (
            subscription.status != FirmSubscription.Status.ACTIVE
            or not start or not end or end <= now
        ):
            return Decimal("0.00")
        remaining = Decimal((end - now).total_seconds())
        total = Decimal((end - start).total_seconds()) or Decimal(1)
        if subscription.is_complimentary:
            return Decimal("0.00")
        paid = SubscriptionInvoice.objects.filter(
            firm=subscription.firm, plan=subscription.plan, billing_cycle=subscription.billing_cycle,
            status=SubscriptionInvoice.Status.PAID,
        ).order_by("-confirmed_at", "-created_at").first()
        price = paid.list_price if paid else cls.price_for(subscription)
        return (price * remaining / total).quantize(CENT, rounding=ROUND_HALF_UP)

    @staticmethod
    def is_paid_up(subscription, now=None):
        """A paid period is running now (not a trial, complimentary access or a lapsed period)."""
        now = now or timezone.now()
        return bool(
            subscription.status == FirmSubscription.Status.ACTIVE and not subscription.is_complimentary
            and subscription.current_period_end and subscription.current_period_end > now
        )

    @staticmethod
    def in_grace(subscription, now=None):
        """The paid period has ended but its grace period has not."""
        now = now or timezone.now()
        end = subscription.current_period_end
        return bool(
            subscription.status == FirmSubscription.Status.ACTIVE and not subscription.is_complimentary
            and end and end <= now <= end + timedelta(days=subscription.grace_period_days)
        )

    @classmethod
    def change_kind(cls, subscription, plan, billing_cycle, now=None):
        """SUBSCRIBE when no paid period is running or in grace; otherwise RENEWAL, CYCLE_CHANGE, UPGRADE or DOWNGRADE."""
        if not (cls.is_paid_up(subscription, now) or cls.in_grace(subscription, now)):
            return "SUBSCRIBE"
        current = subscription.plan
        if plan.id == current.id:
            return "RENEWAL" if billing_cycle == subscription.billing_cycle else "CYCLE_CHANGE"
        higher = (plan.sort_order, plan.monthly_price) > (current.sort_order, current.monthly_price)
        return "UPGRADE" if higher else "DOWNGRADE"

    @classmethod
    def limit_blockers(cls, firm, plan):
        """The plan limits a firm is over, named without its usage figures, which stay private to the firm."""
        usage = cls.usage(firm)
        blockers = []
        for resource in Limit.FIELDS:
            limit = cls.limit_for(plan, resource)
            if limit is not None and usage[resource] > limit:
                blockers.append(
                    f"{Limit.LABELS[resource]}: the firm has more than {plan.name} allows ({limit}). "
                    "Its owner must reduce this first."
                )
        return blockers

    @classmethod
    def new_period(cls, subscription, plan, billing_cycle, now=None):
        """
        The period a paid invoice buys. A renewal follows on from the current end,
        and so does anything paid in the grace period, so late payment buys no
        free days; any other change starts at once.
        """
        now = now or timezone.now()
        renewal = cls.change_kind(subscription, plan, billing_cycle, now) == "RENEWAL"
        start = subscription.current_period_end if renewal or cls.in_grace(subscription, now) else now
        months = 12 if billing_cycle == FirmSubscription.BillingCycle.ANNUAL else 1
        return start, add_months(start, months)

    @classmethod
    def quote(cls, firm, plan, billing_cycle, now=None):
        """
        What moving to this plan and billing cycle costs now. The unused value of
        the current paid period and any credit balance come off the new period's
        price; whatever is left over is kept as credit for the next invoice.
        """
        now = now or timezone.now()
        subscription = cls.get(firm)
        kind = cls.change_kind(subscription, plan, billing_cycle, now)
        list_price = cls.price_for(subscription, billing_cycle, plan)
        unused = cls.proration_credit(subscription, now) if kind in {"UPGRADE", "DOWNGRADE", "CYCLE_CHANGE"} else Decimal("0.00")
        balance = subscription.credit_balance or Decimal("0.00")
        applied = min(unused + balance, list_price)
        amount = (list_price - applied).quantize(CENT)
        vat_rate = Decimal(str(settings.SUBSCRIPTION_VAT_RATE))
        vat = (amount * vat_rate / 100).quantize(CENT, rounding=ROUND_HALF_UP)
        starts, ends = cls.new_period(subscription, plan, billing_cycle, now)
        return {
            "kind": kind,
            "list_price": list_price,
            "unused_value": unused,
            "credit_balance_used": min(balance, list_price - min(unused, list_price)),
            "credit_applied": applied,
            "credit_carried_forward": (unused + balance - applied).quantize(CENT),
            "amount_excl_vat": amount,
            "vat_rate": vat_rate,
            "vat_amount": vat,
            "total": amount + vat,
            "period_start": starts,
            "period_end": ends,
        }

    @classmethod
    @transaction.atomic
    def issue_invoice(cls, *, firm, plan_code, billing_cycle, user):
        get_object_or_404(LawFirm.objects.select_for_update(), pk=firm.pk)
        plan = Plan.objects.filter(code=plan_code, is_active=True).first()
        if plan is None:
            raise ValidationError({"plan_code": "Choose an available plan."})
        if billing_cycle not in FirmSubscription.BillingCycle.values:
            raise ValidationError({"billing_cycle": "Choose monthly or annual billing."})
        problems = cls.overages(firm, plan)
        if problems:
            raise ValidationError({"plan_code": ["Reduce usage before moving to this plan."] + problems})

        subscription = cls.get(firm, lock=True)
        if subscription.is_complimentary:
            raise ValidationError({"subscription": "This firm has complimentary access. Contact the platform administrator to change its billing terms."})
        if SubscriptionInvoice.objects.filter(firm=firm, status=SubscriptionInvoice.Status.PAYMENT_SUBMITTED).exists():
            raise ValidationError({"invoice": "A payment is awaiting confirmation. Confirm or void it before issuing another invoice."})
        SubscriptionInvoice.objects.filter(firm=firm, status=SubscriptionInvoice.Status.ISSUED).update(
            status=SubscriptionInvoice.Status.VOID,
        )

        now = timezone.now()
        quote = cls.quote(firm, plan, billing_cycle, now)
        return SubscriptionInvoice.objects.create(
            number=cls._next_invoice_number(now),
            firm=firm,
            plan=plan,
            billing_cycle=billing_cycle,
            list_price=quote["list_price"],
            proration_credit=quote["credit_applied"],
            unused_value=quote["unused_value"],
            credit_balance_used=quote["credit_balance_used"],
            credit_carried_forward=quote["credit_carried_forward"],
            amount_excl_vat=quote["amount_excl_vat"],
            vat_rate=quote["vat_rate"],
            vat_amount=quote["vat_amount"],
            total=quote["total"],
            issued_by=user,
        )

    @staticmethod
    @transaction.atomic
    def submit_payment(*, invoice, mpesa_receipt, user, payer_phone=""):
        get_object_or_404(LawFirm.objects.select_for_update(), pk=invoice.firm_id)
        invoice = SubscriptionInvoice.objects.select_for_update().get(pk=invoice.pk)
        if invoice.status != SubscriptionInvoice.Status.ISSUED:
            raise ValidationError({"invoice": "This invoice is not awaiting payment."})
        receipt = (mpesa_receipt or "").strip().upper()
        if not MPESA_RECEIPT_PATTERN.match(receipt):
            raise ValidationError({"mpesa_receipt": "Enter the 10-character M-Pesa confirmation code, e.g. SIB7XK2LQ9."})
        if SubscriptionInvoice.objects.filter(mpesa_receipt=receipt).exclude(pk=invoice.pk).exists():
            raise ValidationError({"mpesa_receipt": "This M-Pesa code has already been used."})
        invoice.mpesa_receipt = receipt
        invoice.payer_phone = (payer_phone or "").strip()
        invoice.payment_submitted_by = user
        invoice.payment_submitted_at = timezone.now()
        invoice.status = SubscriptionInvoice.Status.PAYMENT_SUBMITTED
        invoice.save()
        return invoice

    @classmethod
    @transaction.atomic
    def confirm_payment(cls, *, invoice, confirmed_by, now=None):
        """Platform finance confirms the M-Pesa receipt against the Paybill statement."""
        get_object_or_404(LawFirm.objects.select_for_update(), pk=invoice.firm_id)
        invoice = SubscriptionInvoice.objects.select_for_update().select_related("plan").get(pk=invoice.pk)
        if invoice.status not in {SubscriptionInvoice.Status.ISSUED, SubscriptionInvoice.Status.PAYMENT_SUBMITTED}:
            raise ValidationError({"invoice": "Only an unpaid invoice can be confirmed."})
        problems = cls.limit_blockers(invoice.firm, invoice.plan)
        if problems:
            raise ValidationError({"invoice": problems})

        now = now or timezone.now()
        subscription = cls.get(invoice.firm, lock=True)
        renewal = cls.change_kind(subscription, invoice.plan, invoice.billing_cycle, now) == "RENEWAL"
        start, end = cls.new_period(subscription, invoice.plan, invoice.billing_cycle, now)

        subscription.plan = invoice.plan
        subscription.billing_cycle = invoice.billing_cycle
        subscription.status = FirmSubscription.Status.ACTIVE
        subscription.trial_ends_at = None
        if not renewal:
            subscription.current_period_start = start
        subscription.current_period_end = end
        # Credit the invoice did not use is kept for the next one.
        subscription.credit_balance = invoice.credit_carried_forward
        subscription.save()

        invoice.status = SubscriptionInvoice.Status.PAID
        invoice.confirmed_by = confirmed_by
        invoice.confirmed_at = now
        invoice.save()
        return invoice

    # -----------------------------------------------------------------
    # Renewal reminders
    # -----------------------------------------------------------------

    @classmethod
    def reminder_for(cls, subscription, now):
        """(event key, title, message) for the reminder due today, if any."""
        firm, today = subscription.firm, timezone.localdate(now)
        status_ = cls.effective_status(subscription, now)
        if subscription.status == FirmSubscription.Status.TRIALING and subscription.trial_ends_at:
            ends = timezone.localdate(subscription.trial_ends_at)
            days = (ends - today).days
            if status_ == "EXPIRED":
                return (
                    f"SUBSCRIPTION_LAPSED:{subscription.id}:{ends}",
                    "Free trial ended: the firm is view-only",
                    f"{firm.name}'s free trial ended on {ends:%d %b %Y}. Records can still be viewed, but changes "
                    "are paused until you choose a plan and pay from your Subscription page.",
                )
            if days in TRIAL_REMINDER_DAYS:
                return (
                    f"SUBSCRIPTION_TRIAL_ENDING:{subscription.id}:{ends}:{days}d",
                    f"Free trial ends in {days} day{'s' if days != 1 else ''}",
                    f"{firm.name}'s free trial of {subscription.plan.name} ends on {ends:%d %b %Y}. "
                    "Choose a plan and pay by M-Pesa to keep making changes.",
                )
            return None
        if subscription.is_complimentary or not subscription.current_period_end:
            return None
        end = subscription.current_period_end
        ends = timezone.localdate(end)
        if status_ == FirmSubscription.Status.ACTIVE:
            days = (ends - today).days
            if days in RENEWAL_REMINDER_DAYS:
                return (
                    f"SUBSCRIPTION_RENEWAL_DUE:{subscription.id}:{ends}:{days}d",
                    f"Subscription renews in {days} day{'s' if days != 1 else ''}",
                    f"{firm.name}'s {subscription.plan.name} subscription is paid until {ends:%d %b %Y}. "
                    "Renew by M-Pesa from your Subscription page to keep working without interruption.",
                )
        elif status_ == "GRACE":
            grace_ends = timezone.localdate(end + timedelta(days=subscription.grace_period_days))
            return (
                f"SUBSCRIPTION_GRACE:{subscription.id}:{ends}",
                "Subscription period has ended",
                f"{firm.name}'s paid period ended on {ends:%d %b %Y}. Renew by {grace_ends:%d %b %Y}, "
                "or the firm becomes view-only until it is renewed.",
            )
        elif status_ == "EXPIRED":
            return (
                f"SUBSCRIPTION_LAPSED:{subscription.id}:{ends}",
                "Subscription lapsed: the firm is view-only",
                f"{firm.name}'s subscription has lapsed. Records can still be viewed, but changes are paused "
                "until you renew from your Subscription page.",
            )
        return None

    @classmethod
    def send_renewal_reminders(cls, now=None):
        """Daily: remind each owner before the trial or paid period ends, when it ends and when the firm lapses."""
        from apps.notifications.models import Notification
        from apps.notifications.services import NotificationService

        now = now or timezone.now()
        sent = 0
        subscriptions = FirmSubscription.objects.filter(
            firm__is_active=True, status__in=[FirmSubscription.Status.TRIALING, FirmSubscription.Status.ACTIVE],
        ).select_related("firm__owner", "plan")
        for subscription in subscriptions:
            reminder = cls.reminder_for(subscription, now)
            owner = subscription.firm.owner
            if reminder is None or not owner or not owner.is_active:
                continue
            event_key, title, message = reminder
            if Notification.objects.filter(recipient=owner, event_key=event_key).exists():
                continue
            NotificationService.notify_firm_owner(
                firm=subscription.firm, title=title, message=message,
                action_url="/admin/subscription", event_key=event_key,
            )
            send_mail(
                subject=f"Sheria Master: {title}", message=f"{message}\n\nSign in and open Subscription to renew.",
                from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None), recipient_list=[owner.email],
                fail_silently=True,
            )
            sent += 1
        return sent

    # -----------------------------------------------------------------
    # API payloads
    # -----------------------------------------------------------------

    @staticmethod
    def plan_payload(plan):
        return {
            "code": plan.code,
            "name": plan.name,
            "tagline": plan.tagline,
            "monthly_price": str(plan.monthly_price),
            "annual_price": str(plan.annual_price),
            "pricing_basis": plan.pricing_basis,
            "limits": {resource: getattr(plan, field) for resource, field in Limit.FIELDS.items()},
            "features": [
                {"code": code, "label": label, "included": code in (plan.features or [])}
                for code, label in Feature.LABELS.items()
            ],
        }

    @classmethod
    def summary(cls, firm):
        subscription = cls.get(firm)
        effective = cls.effective_status(subscription)
        return {
            "plan": cls.plan_payload(subscription.plan),
            "status": subscription.status,
            "effective_status": effective,
            "writable": cls.is_writable(subscription),
            "billing_cycle": subscription.billing_cycle,
            "is_complimentary": subscription.is_complimentary,
            "owner_name": firm.owner.full_name if firm.owner_id else "",
            "credit_balance": str(subscription.credit_balance),
            "custom_monthly_price": str(subscription.custom_monthly_price) if subscription.custom_monthly_price is not None else None,
            "custom_annual_price": str(subscription.custom_annual_price) if subscription.custom_annual_price is not None else None,
            "effective_monthly_price": str(cls.price_for(subscription, FirmSubscription.BillingCycle.MONTHLY)),
            "effective_annual_price": str(cls.price_for(subscription, FirmSubscription.BillingCycle.ANNUAL)),
            "trial_ends_at": subscription.trial_ends_at,
            "current_period_end": subscription.current_period_end,
            "grace_ends_at": (
                subscription.current_period_end + timedelta(days=subscription.grace_period_days)
                if subscription.current_period_end else None
            ),
            "features": list(subscription.plan.features or []),
            "usage": cls.usage(firm),
            "payment_instructions": {
                "method": "M-Pesa Paybill",
                "paybill": settings.SUBSCRIPTION_MPESA_PAYBILL,
                "account_reference": "Use the invoice number",
                "vat_rate": str(settings.SUBSCRIPTION_VAT_RATE),
            },
        }
