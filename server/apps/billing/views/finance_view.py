from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.billing.models import AccountReconciliation, ClientFundsLedger, CreditNote, Disbursement, FinancialAccount, Invoice, MatterClientLedger, PaymentInstruction, TaxConfiguration, TimeEntry
from apps.clients.models import Client, ClientMatterConflictCheck, EngagementRecord
from apps.billing.serializers.finance_serializer import (
    AccountReconciliationSerializer, ClientMoneyReceiptSerializer, DisbursementSerializer,
    CreditNoteSerializer, FinancialAccountSerializer, InvoiceBillableItemsSerializer,
    InvoiceCancellationSerializer, InvoiceSerializer,
    LedgerTransactionSerializer, MatterClientLedgerSerializer, OfficeTransferSerializer,
    OfficeMoneyReceiptSerializer, PaymentInstructionSerializer, PaymentRequestSerializer,
    PreMatterRetainerReceiptSerializer, ReversalSerializer, TaxConfigurationSerializer, TimeEntrySerializer,
)
from apps.billing.services.finance_service import ClientMoneyService, CreditNoteService, FinanceAccess, InvoiceService, OperationalFinanceService
from apps.staff.models import AccountantPermission


class FinancialAccountListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        firm = FinanceAccess.require(request.user, AccountantPermission.MANAGE_CLIENT_MONEY)
        return Response({"accounts": FinancialAccountSerializer(FinancialAccount.objects.filter(firm=firm), many=True).data})

    def post(self, request):
        firm = FinanceAccess.require(request.user, AccountantPermission.MANAGE_CLIENT_MONEY)
        serializer = FinancialAccountSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        account = serializer.save(firm=firm)
        return Response({"account": FinancialAccountSerializer(account).data}, status=status.HTTP_201_CREATED)


class TaxConfigurationListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        firm = FinanceAccess.require(request.user, AccountantPermission.MANAGE_TAX_RECORDS)
        return Response({"tax_configurations": TaxConfigurationSerializer(TaxConfiguration.objects.filter(firm=firm), many=True).data})

    def post(self, request):
        firm = FinanceAccess.require(request.user, AccountantPermission.MANAGE_TAX_RECORDS)
        serializer = TaxConfigurationSerializer(data=request.data, context={"firm": firm})
        serializer.is_valid(raise_exception=True)
        record = serializer.save(firm=firm)
        return Response({"tax_configuration": TaxConfigurationSerializer(record).data}, status=status.HTTP_201_CREATED)


class InvoiceListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        firm = FinanceAccess.require(request.user, AccountantPermission.MANAGE_INVOICES)
        invoices = Invoice.objects.filter(firm=firm).prefetch_related("line_items")
        if request.query_params.get("client"):
            invoices = invoices.filter(client_id=request.query_params["client"])
        if request.query_params.get("matter"):
            invoices = invoices.filter(matter_id=request.query_params["matter"])
        return Response({"invoices": InvoiceSerializer(invoices, many=True).data})

    def post(self, request):
        serializer = InvoiceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = dict(serializer.validated_data)
        lines = data.pop("line_items", [])
        invoice = InvoiceService.create(user=request.user, data=data, lines=lines)
        return Response({"invoice": InvoiceSerializer(invoice).data}, status=status.HTTP_201_CREATED)


class InvoiceActionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, invoice_id, action):
        if action == "cancel":
            serializer = InvoiceCancellationSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            invoice = InvoiceService.cancel(user=request.user, invoice_id=invoice_id, **serializer.validated_data)
            return Response({"invoice": InvoiceSerializer(invoice).data})
        command = {"submit": InvoiceService.submit, "approve": InvoiceService.approve, "issue": InvoiceService.issue}.get(action)
        if not command:
            return Response({"detail": "Unknown invoice action."}, status=status.HTTP_404_NOT_FOUND)
        invoice = command(user=request.user, invoice_id=invoice_id)
        return Response({"invoice": InvoiceSerializer(invoice).data})


class InvoiceBillableItemsView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, invoice_id):
        serializer = InvoiceBillableItemsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        invoice = InvoiceService.add_billables(
            user=request.user, invoice_id=invoice_id, **serializer.validated_data
        )
        return Response({"invoice": InvoiceSerializer(invoice).data})


class CreditNoteListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        firm = FinanceAccess.require(request.user, AccountantPermission.MANAGE_INVOICES)
        records = CreditNote.objects.filter(firm=firm)
        if request.query_params.get("invoice"):
            records = records.filter(invoice_id=request.query_params["invoice"])
        return Response({"credit_notes": CreditNoteSerializer(records, many=True).data})

    def post(self, request):
        serializer = CreditNoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        record = CreditNoteService.create(user=request.user, data=serializer.validated_data)
        return Response({"credit_note": CreditNoteSerializer(record).data}, status=status.HTTP_201_CREATED)


class CreditNoteActionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, credit_note_id, action):
        command = {"approve": CreditNoteService.approve, "issue": CreditNoteService.issue}.get(action)
        if not command:
            return Response({"detail": "Unknown credit-note action."}, status=status.HTTP_404_NOT_FOUND)
        record = command(user=request.user, credit_note_id=credit_note_id)
        return Response({"credit_note": CreditNoteSerializer(record).data})


class ClientMoneyReceiptView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ClientMoneyReceiptSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = dict(serializer.validated_data)
        matter_id, account_id = data.pop("matter"), data.pop("account")
        receipt, entry = ClientMoneyService.receive(
            user=request.user, matter_id=matter_id, account_id=account_id, receipt_data=data
        )
        return Response({"receipt_id": receipt.id, "transaction": LedgerTransactionSerializer(entry).data}, status=status.HTTP_201_CREATED)


class PreMatterRetainerReceiptView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PreMatterRetainerReceiptSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = dict(serializer.validated_data)
        data.pop("matter", None)
        firm = FinanceAccess.require(request.user, AccountantPermission.RECORD_RECEIPTS)
        client_id = data.pop("client")
        proposed_id = data.pop("proposed_matter")
        engagement_id = data.pop("engagement")
        account_id = data.pop("account")
        try:
            client = Client.objects.get(id=client_id, firm=firm)
            proposed = ClientMatterConflictCheck.objects.get(id=proposed_id, firm=firm, client=client)
            engagement = EngagementRecord.objects.get(id=engagement_id, firm=firm, client=client, proposed_matter=proposed)
        except (Client.DoesNotExist, ClientMatterConflictCheck.DoesNotExist, EngagementRecord.DoesNotExist):
            from rest_framework.exceptions import ValidationError
            raise ValidationError({"retainer": "Client, proposed matter and engagement must belong to your firm."})
        receipt, entry = ClientMoneyService.receive_retainer(
            user=request.user, client=client, proposed_matter=proposed,
            engagement=engagement, account_id=account_id, receipt_data=data,
        )
        return Response({"receipt_id": receipt.id, "transaction": LedgerTransactionSerializer(entry).data}, status=status.HTTP_201_CREATED)


class ClientUnallocatedFundsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, client_id):
        firm = FinanceAccess.require(request.user, AccountantPermission.MANAGE_CLIENT_MONEY)
        ledger = ClientFundsLedger.objects.filter(firm=firm, client_id=client_id).prefetch_related("transactions").first()
        if not ledger:
            return Response({"ledger": None})
        return Response({"ledger": {
            "id": ledger.id, "client": ledger.client_id, "currency": ledger.currency,
            "cleared_balance": ledger.cleared_balance,
            "transactions": LedgerTransactionSerializer(ledger.transactions.all(), many=True).data,
        }})


class PaymentInstructionListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        firm = FinanceAccess.require(request.user, AccountantPermission.MANAGE_CLIENT_MONEY)
        records = PaymentInstruction.objects.filter(firm=firm).select_related("matter", "ledger", "account")
        return Response({"payment_instructions": PaymentInstructionSerializer(records, many=True).data})

    def post(self, request):
        serializer = PaymentRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = dict(serializer.validated_data)
        matter_id, account_id = data.pop("matter"), data.pop("account")
        instruction = ClientMoneyService.request_payment(
            user=request.user, matter_id=matter_id, account_id=account_id, data=data
        )
        return Response({"payment_instruction": PaymentInstructionSerializer(instruction).data}, status=status.HTTP_201_CREATED)


class PaymentInstructionApproveView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, instruction_id):
        instruction = ClientMoneyService.approve_payment(user=request.user, instruction_id=instruction_id)
        return Response({"payment_instruction": PaymentInstructionSerializer(instruction).data})


class OfficeTransferView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = OfficeTransferSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        entry = ClientMoneyService.transfer_to_office(
            user=request.user, invoice_id=data["invoice"], client_account_id=data["client_account"],
            office_account_id=data["office_account"], amount=data["amount"], basis=data["basis"],
        )
        return Response({"transaction": LedgerTransactionSerializer(entry).data}, status=status.HTTP_201_CREATED)


class TransactionReversalView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, transaction_id):
        serializer = ReversalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        entry = ClientMoneyService.reverse(user=request.user, transaction_id=transaction_id, **serializer.validated_data)
        return Response({"transaction": LedgerTransactionSerializer(entry).data}, status=status.HTTP_201_CREATED)


class MatterLedgerView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, matter_id):
        firm = FinanceAccess.require(request.user, AccountantPermission.MANAGE_CLIENT_MONEY)
        ledger = MatterClientLedger.objects.filter(firm=firm, matter_id=matter_id).prefetch_related("transactions").first()
        if not ledger:
            return Response({"detail": "No client-money ledger exists for this matter."}, status=status.HTTP_404_NOT_FOUND)
        return Response({"ledger": MatterClientLedgerSerializer(ledger).data})


class TimeEntryListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        firm = FinanceAccess.firm(request.user)
        return Response({"time_entries": TimeEntrySerializer(TimeEntry.objects.filter(firm=firm), many=True).data})

    def post(self, request):
        serializer = TimeEntrySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        record = OperationalFinanceService.create_time_entry(user=request.user, data=serializer.validated_data)
        return Response({"time_entry": TimeEntrySerializer(record).data}, status=status.HTTP_201_CREATED)


class TimeEntryApproveView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, entry_id):
        record = OperationalFinanceService.approve_time_entry(user=request.user, entry_id=entry_id)
        return Response({"time_entry": TimeEntrySerializer(record).data})


class DisbursementListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        firm = FinanceAccess.require(request.user, AccountantPermission.MANAGE_EXPENSES)
        return Response({"disbursements": DisbursementSerializer(Disbursement.objects.filter(firm=firm), many=True).data})

    def post(self, request):
        serializer = DisbursementSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        record = OperationalFinanceService.create_disbursement(user=request.user, data=serializer.validated_data)
        return Response({"disbursement": DisbursementSerializer(record).data}, status=status.HTTP_201_CREATED)


class DisbursementApproveView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, disbursement_id):
        record = OperationalFinanceService.approve_disbursement(user=request.user, disbursement_id=disbursement_id)
        return Response({"disbursement": DisbursementSerializer(record).data})


class OfficeMoneyReceiptView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = OfficeMoneyReceiptSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = dict(serializer.validated_data)
        allocations = data.pop("allocations")
        matter_id, account_id = data.pop("matter"), data.pop("account")
        receipt = OperationalFinanceService.receive_office_money(
            user=request.user, matter_id=matter_id, account_id=account_id,
            receipt_data=data, allocations=allocations,
        )
        return Response({"receipt_id": receipt.id}, status=status.HTTP_201_CREATED)


class ReconciliationListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        firm = FinanceAccess.require(request.user, AccountantPermission.RECONCILE_ACCOUNTS)
        return Response({"reconciliations": AccountReconciliationSerializer(AccountReconciliation.objects.filter(firm=firm), many=True).data})

    def post(self, request):
        serializer = AccountReconciliationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        record = OperationalFinanceService.create_reconciliation(user=request.user, data=serializer.validated_data)
        return Response({"reconciliation": AccountReconciliationSerializer(record).data}, status=status.HTTP_201_CREATED)


class ReconciliationApproveView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, reconciliation_id):
        record = OperationalFinanceService.approve_reconciliation(user=request.user, reconciliation_id=reconciliation_id)
        return Response({"reconciliation": AccountReconciliationSerializer(record).data})


class FinanceRegisterView(APIView):
    """Matters, clients and fee earners for finance pickers, so nobody types record identifiers."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from rest_framework.exceptions import PermissionDenied

        from apps.cases.models import Case
        from apps.staff.models import Lawyer

        firm = FinanceAccess.firm(request.user)
        is_owner = firm.owner_id == request.user.id
        profile = getattr(request.user, "accountant_profile", None)
        if not is_owner and not (profile and profile.law_firm_id == firm.id and profile.is_active):
            raise PermissionDenied("Finance access is required.")

        matters = (
            Case.objects.filter(firm=firm)
            .exclude(matter_status__in=[Case.MatterStatus.ARCHIVED, Case.MatterStatus.CANCELLED])
            .select_related("client")
            .order_by("-created_at")
        )
        clients = Client.objects.filter(firm=firm, is_active=True).order_by("full_name")
        fee_earners = Lawyer.objects.filter(law_firm=firm, is_active=True).select_related("user").order_by("user__first_name")
        retainer_targets = []
        for check in (
            ClientMatterConflictCheck.objects.filter(firm=firm, acceptance_decision="ACCEPTED", created_case__isnull=True)
            .select_related("client").order_by("-created_at")
        ):
            engagement = (
                EngagementRecord.objects.filter(proposed_matter=check)
                .exclude(status__in=["SUPERSEDED", "CANCELLED"]).order_by("-created_at").first()
            )
            if engagement:
                retainer_targets.append({
                    "client_id": str(check.client_id), "client_name": check.client.full_name,
                    "proposed_matter_id": str(check.id), "engagement_id": str(engagement.id),
                    "label": f"{check.client.full_name} — {check.proposed_matter_title} ({check.reference_number})",
                })
        return Response({
            "matters": [
                {
                    "id": str(matter.id), "case_number": matter.case_number, "title": matter.title,
                    "client_id": str(matter.client_id), "client_name": matter.client.full_name,
                    "matter_status": matter.get_matter_status_display(),
                }
                for matter in matters
            ],
            "clients": [
                {"id": str(client.id), "full_name": client.full_name, "lifecycle_status": client.lifecycle_status}
                for client in clients
            ],
            "retainer_targets": retainer_targets,
            "fee_earners": [
                {"user_id": str(lawyer.user_id), "full_name": lawyer.user.full_name, "staff_number": lawyer.staff_number}
                for lawyer in fee_earners
            ],
        })
