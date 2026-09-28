from datetime import timedelta
from decimal import Decimal

from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncMonth
from django.utils import timezone

from apps.billing.models import ClientFundsLedger, Invoice, MatterClientLedger
from apps.cases.models import Case, CaseEvent, MatterDeadline
from apps.staff.models import Lawyer

CENT = Decimal("0.01")


def _money(value):
    return str((value or Decimal("0")).quantize(CENT))


CLOSED = [Case.MatterStatus.CLOSED, Case.MatterStatus.ARCHIVED, Case.MatterStatus.CANCELLED]


def _breakdown(queryset, field, choices):
    labels = dict(choices)
    return [
        {"key": row[field] or "NOT_SET", "label": labels.get(row[field], "Not set"), "count": row["count"]}
        for row in queryset.values(field).annotate(count=Count("id")).order_by("-count")
    ]


class FirmReportService:
    """Firm-wide management report built only from recorded matters, deadlines, hearings and ledgers."""

    @staticmethod
    def build(firm):
        now = timezone.now()
        today = timezone.localdate()
        matters = Case.objects.filter(firm=firm)
        active = matters.exclude(matter_status__in=CLOSED)

        year_ago = (today.replace(day=1) - timedelta(days=335)).replace(day=1)
        intake = {
            row["month"].strftime("%Y-%m"): row["count"]
            for row in matters.filter(created_at__date__gte=year_ago)
            .annotate(month=TruncMonth("created_at")).values("month").annotate(count=Count("id"))
        }
        months, cursor = [], year_ago
        while cursor <= today:
            months.append({"month": cursor.strftime("%b %Y"), "count": intake.get(cursor.strftime("%Y-%m"), 0)})
            cursor = (cursor.replace(day=28) + timedelta(days=4)).replace(day=1)

        advocates = []
        for lawyer in Lawyer.objects.filter(law_firm=firm, is_active=True).select_related("user"):
            advocates.append({
                "name": lawyer.user.full_name,
                "active_matters": active.filter(assigned_lawyer=lawyer).count(),
                "closed_matters": matters.filter(assigned_lawyer=lawyer, matter_status__in=CLOSED).count(),
                "hearings_next_30_days": CaseEvent.objects.filter(
                    case__assigned_lawyer=lawyer, starts_at__range=(now, now + timedelta(days=30)),
                ).count(),
                "overdue_deadlines": MatterDeadline.objects.filter(
                    matter__assigned_lawyer=lawyer, status=MatterDeadline.Status.OPEN, due_at__lt=now,
                ).count(),
            })
        advocates.sort(key=lambda row: -row["active_matters"])

        top_clients = [
            {"name": row["client__full_name"], "matters": row["count"]}
            for row in matters.values("client__full_name").annotate(count=Count("id")).order_by("-count")[:10]
        ]

        open_deadlines = MatterDeadline.objects.filter(firm=firm, status=MatterDeadline.Status.OPEN)
        invoices = Invoice.objects.filter(firm=firm).exclude(status__in=["CANCELLED", "DRAFT"])
        money = invoices.aggregate(
            invoiced=Sum("total_amount"), collected=Sum("amount_paid"), outstanding=Sum("balance"),
        )
        overdue_invoices = invoices.filter(due_date__lt=today, balance__gt=0)
        client_money = (
            (MatterClientLedger.objects.filter(firm=firm).aggregate(total=Sum("cleared_balance"))["total"] or Decimal("0"))
            + (ClientFundsLedger.objects.filter(firm=firm).aggregate(total=Sum("cleared_balance"))["total"] or Decimal("0"))
        )

        return {
            "generated_at": now,
            "matters": {
                "total": matters.count(),
                "active": active.count(),
                "closed": matters.filter(matter_status__in=CLOSED).count(),
                "opened_this_month": matters.filter(created_at__date__gte=today.replace(day=1)).count(),
                "by_status": _breakdown(matters, "matter_status", Case.MatterStatus.choices),
                "by_type": _breakdown(matters, "case_type", Case.CaseType.choices),
                "by_court_stage": _breakdown(active, "court_stage", Case.CourtStage.choices),
                "by_court": _breakdown(active, "court_type", Case.CourtType.choices),
                "monthly_intake": months,
            },
            "deadlines": {
                "open": open_deadlines.count(),
                "overdue": open_deadlines.filter(due_at__lt=now).count(),
                "due_next_7_days": open_deadlines.filter(due_at__range=(now, now + timedelta(days=7))).count(),
            },
            "hearings_next_30_days": CaseEvent.objects.filter(
                case__firm=firm, starts_at__range=(now, now + timedelta(days=30)),
            ).count(),
            "advocates": advocates,
            "top_clients": top_clients,
            "finance": {
                "currency": "KES",
                "invoiced": _money(money["invoiced"]),
                "collected": _money(money["collected"]),
                "outstanding": _money(money["outstanding"]),
                "overdue_invoices": overdue_invoices.count(),
                "overdue_amount": _money(overdue_invoices.aggregate(total=Sum("balance"))["total"]),
                "client_money_held": _money(client_money),
            },
        }
