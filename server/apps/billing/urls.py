from django.urls import path

from apps.billing.views.finance_view import (
    ClientMoneyReceiptView, FinancialAccountListCreateView, InvoiceActionView,
    InvoiceListCreateView, MatterLedgerView, OfficeTransferView,
    PaymentInstructionApproveView, PaymentInstructionListCreateView,
    TransactionReversalView,
)

urlpatterns = [
    path("accounts/", FinancialAccountListCreateView.as_view(), name="financial-accounts"),
    path("invoices/", InvoiceListCreateView.as_view(), name="finance-invoices"),
    path("invoices/<uuid:invoice_id>/<str:action>/", InvoiceActionView.as_view(), name="finance-invoice-action"),
    path("client-money/receipts/", ClientMoneyReceiptView.as_view(), name="client-money-receipt"),
    path("client-money/payments/", PaymentInstructionListCreateView.as_view(), name="client-money-payments"),
    path("client-money/payments/<uuid:instruction_id>/approve/", PaymentInstructionApproveView.as_view(), name="client-money-payment-approve"),
    path("client-money/transfers/", OfficeTransferView.as_view(), name="client-money-office-transfer"),
    path("transactions/<uuid:transaction_id>/reverse/", TransactionReversalView.as_view(), name="financial-transaction-reverse"),
    path("matters/<uuid:matter_id>/client-ledger/", MatterLedgerView.as_view(), name="matter-client-ledger"),
]
