from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.billing.models import ClientFundsLedger, Invoice, MatterClientLedger

CLIENT_VISIBLE_INVOICE_STATUSES = ["ISSUED", "PARTIALLY_PAID", "PAID", "OVERDUE", "DISPUTED", "CREDITED"]


class ClientFinanceView(APIView):
    """A client's issued fee notes and the money the firm holds for them in the client account."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        client = getattr(request.user, "client_profile", None)
        if client is None:
            raise PermissionDenied("Only clients can view their statement.")

        invoices = (
            Invoice.objects.filter(firm=client.firm, client=client, status__in=CLIENT_VISIBLE_INVOICE_STATUSES)
            .select_related("matter")
            .order_by("-invoice_date")
        )
        ledgers = MatterClientLedger.objects.filter(firm=client.firm, client=client).select_related("matter")
        unallocated = ClientFundsLedger.objects.filter(firm=client.firm, client=client).first()
        return Response({
            "invoices": [
                {
                    "id": str(invoice.id),
                    "invoice_number": invoice.invoice_number,
                    "case_number": invoice.matter.case_number,
                    "matter_title": invoice.matter.title,
                    "invoice_date": invoice.invoice_date,
                    "due_date": invoice.due_date,
                    "currency": invoice.currency,
                    "professional_fees": str(invoice.professional_fees),
                    "disbursements": str(invoice.disbursements_total),
                    "tax": str(invoice.tax_amount),
                    "total": str(invoice.total_amount),
                    "paid": str(invoice.amount_paid),
                    "credited": str(invoice.credited_amount),
                    "balance": str(invoice.balance),
                    "status": invoice.get_status_display(),
                }
                for invoice in invoices
            ],
            "client_account": [
                {
                    "case_number": ledger.matter.case_number,
                    "matter_title": ledger.matter.title,
                    "currency": ledger.currency,
                    "balance": str(ledger.cleared_balance),
                }
                for ledger in ledgers
            ],
            "unallocated_funds": (
                {"currency": unallocated.currency, "balance": str(unallocated.cleared_balance)}
                if unallocated else None
            ),
        })
