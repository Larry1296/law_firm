from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.billing.models import FinancialAccount, Invoice, MatterClientLedger, PaymentInstruction
from apps.billing.serializers.finance_serializer import (
    ClientMoneyReceiptSerializer, FinancialAccountSerializer, InvoiceSerializer,
    LedgerTransactionSerializer, MatterClientLedgerSerializer, OfficeTransferSerializer,
    PaymentInstructionSerializer, PaymentRequestSerializer, ReversalSerializer,
)
from apps.billing.services.finance_service import ClientMoneyService, FinanceAccess, InvoiceService
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


class InvoiceListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        firm = FinanceAccess.require(request.user, AccountantPermission.MANAGE_INVOICES)
        invoices = Invoice.objects.filter(firm=firm).prefetch_related("line_items")
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
        command = {"submit": InvoiceService.submit, "approve": InvoiceService.approve, "issue": InvoiceService.issue}.get(action)
        if not command:
            return Response({"detail": "Unknown invoice action."}, status=status.HTTP_404_NOT_FOUND)
        invoice = command(user=request.user, invoice_id=invoice_id)
        return Response({"invoice": InvoiceSerializer(invoice).data})


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
        entry = ClientMoneyService.transfer_to_office(user=request.user, **serializer.validated_data)
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
