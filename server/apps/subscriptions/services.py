import calendar
import re
from datetime import timedelta
from decimal import ROUND_HALF_UP, Decimal

from django.conf import settings
from django.db import connection, transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import APIException, ValidationError

from apps.subscriptions.catalog import PLANS_BY_CODE, PRO, Feature, Limit
from apps.subscriptions.models import FirmSubscription, Plan, SubscriptionInvoice

CENT = Decimal("0.01")
MPESA_RECEIPT_PATTERN = re.compile(r"^[A-Z0-9]{10}$")


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
    def check_staff_seat(cls, staff):
        """Reactivating an inactive advocate or staff member takes a seat again."""
        from apps.staff.models import Lawyer

        if staff.is_active:
            return
        resource = Limit.ADVOCATES if isinstance(staff, Lawyer) else Limit.SUPPORT_STAFF
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
        price = subscription.plan.price_for(subscription.billing_cycle)
        return (price * remaining / total).quantize(CENT, rounding=ROUND_HALF_UP)

    @classmethod
    @transaction.atomic
    def issue_invoice(cls, *, firm, plan_code, billing_cycle, user):
        plan = Plan.objects.filter(code=plan_code, is_active=True).first()
        if plan is None:
            raise ValidationError({"plan_code": "Choose an available plan."})
        if billing_cycle not in FirmSubscription.BillingCycle.values:
            raise ValidationError({"billing_cycle": "Choose monthly or annual billing."})
        problems = cls.overages(firm, plan)
        if problems:
            raise ValidationError({"plan_code": ["Reduce usage before moving to this plan."] + problems})

        subscription = cls.get(firm, lock=True)
        SubscriptionInvoice.objects.filter(firm=firm, status=SubscriptionInvoice.Status.ISSUED).update(
            status=SubscriptionInvoice.Status.VOID,
        )

        now = timezone.now()
        list_price = plan.price_for(billing_cycle)
        changing = plan.id != subscription.plan_id or billing_cycle != subscription.billing_cycle
        credit = min(cls.proration_credit(subscription, now), list_price) if changing else Decimal("0.00")
        amount = (list_price - credit).quantize(CENT)
        vat_rate = Decimal(str(settings.SUBSCRIPTION_VAT_RATE))
        vat = (amount * vat_rate / 100).quantize(CENT, rounding=ROUND_HALF_UP)
        return SubscriptionInvoice.objects.create(
            number=cls._next_invoice_number(now),
            firm=firm,
            plan=plan,
            billing_cycle=billing_cycle,
            list_price=list_price,
            proration_credit=credit,
            amount_excl_vat=amount,
            vat_rate=vat_rate,
            vat_amount=vat,
            total=amount + vat,
            issued_by=user,
        )

    @staticmethod
    @transaction.atomic
    def submit_payment(*, invoice, mpesa_receipt, user, payer_phone=""):
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
        invoice = SubscriptionInvoice.objects.select_for_update().select_related("plan").get(pk=invoice.pk)
        if invoice.status not in {SubscriptionInvoice.Status.ISSUED, SubscriptionInvoice.Status.PAYMENT_SUBMITTED}:
            raise ValidationError({"invoice": "Only an unpaid invoice can be confirmed."})
        problems = cls.overages(invoice.firm, invoice.plan)
        if problems:
            raise ValidationError({"invoice": problems})

        now = now or timezone.now()
        subscription = cls.get(invoice.firm, lock=True)
        same_terms = (
            subscription.status == FirmSubscription.Status.ACTIVE
            and subscription.plan_id == invoice.plan_id
            and subscription.billing_cycle == invoice.billing_cycle
            and subscription.current_period_end
            and subscription.current_period_end > now
        )
        start = subscription.current_period_end if same_terms else now
        months = 12 if invoice.billing_cycle == FirmSubscription.BillingCycle.ANNUAL else 1

        subscription.plan = invoice.plan
        subscription.billing_cycle = invoice.billing_cycle
        subscription.status = FirmSubscription.Status.ACTIVE
        subscription.trial_ends_at = None
        if not same_terms:
            subscription.current_period_start = start
        subscription.current_period_end = add_months(start, months)
        subscription.save()

        invoice.status = SubscriptionInvoice.Status.PAID
        invoice.confirmed_by = confirmed_by
        invoice.confirmed_at = now
        invoice.save()
        return invoice

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
