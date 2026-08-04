from django.urls import path

from apps.billing.views.finance_view import (
    ClientMoneyReceiptView, CreditNoteActionView, CreditNoteListCreateView,
    DisbursementApproveView, DisbursementListCreateView,
    FinancialAccountListCreateView, InvoiceActionView, InvoiceBillableItemsView, InvoiceListCreateView,
    ClientUnallocatedFundsView, MatterLedgerView, OfficeMoneyReceiptView, OfficeTransferView,
    PaymentInstructionApproveView, PaymentInstructionListCreateView,
    PreMatterRetainerReceiptView, ReconciliationApproveView, ReconciliationListCreateView, TimeEntryApproveView,
    TimeEntryListCreateView, TransactionReversalView,
)

urlpatterns = [
    path("accounts/", FinancialAccountListCreateView.as_view(), name="financial-accounts"),
    path("invoices/", InvoiceListCreateView.as_view(), name="finance-invoices"),
    path("invoices/<uuid:invoice_id>/billable-items/", InvoiceBillableItemsView.as_view(), name="finance-invoice-billable-items"),
    path("invoices/<uuid:invoice_id>/<str:action>/", InvoiceActionView.as_view(), name="finance-invoice-action"),
    path("credit-notes/", CreditNoteListCreateView.as_view(), name="finance-credit-notes"),
    path("credit-notes/<uuid:credit_note_id>/<str:action>/", CreditNoteActionView.as_view(), name="finance-credit-note-action"),
    path("client-money/receipts/", ClientMoneyReceiptView.as_view(), name="client-money-receipt"),
    path("client-money/retainers/", PreMatterRetainerReceiptView.as_view(), name="pre-matter-retainer-receipt"),
    path("clients/<uuid:client_id>/unallocated-funds/", ClientUnallocatedFundsView.as_view(), name="client-unallocated-funds"),
    path("client-money/payments/", PaymentInstructionListCreateView.as_view(), name="client-money-payments"),
    path("client-money/payments/<uuid:instruction_id>/approve/", PaymentInstructionApproveView.as_view(), name="client-money-payment-approve"),
    path("client-money/transfers/", OfficeTransferView.as_view(), name="client-money-office-transfer"),
    path("transactions/<uuid:transaction_id>/reverse/", TransactionReversalView.as_view(), name="financial-transaction-reverse"),
    path("matters/<uuid:matter_id>/client-ledger/", MatterLedgerView.as_view(), name="matter-client-ledger"),
    path("time-entries/", TimeEntryListCreateView.as_view(), name="time-entries"),
    path("time-entries/<uuid:entry_id>/approve/", TimeEntryApproveView.as_view(), name="time-entry-approve"),
    path("disbursements/", DisbursementListCreateView.as_view(), name="disbursements"),
    path("disbursements/<uuid:disbursement_id>/approve/", DisbursementApproveView.as_view(), name="disbursement-approve"),
    path("office-money/receipts/", OfficeMoneyReceiptView.as_view(), name="office-money-receipts"),
    path("reconciliations/", ReconciliationListCreateView.as_view(), name="account-reconciliations"),
    path("reconciliations/<uuid:reconciliation_id>/approve/", ReconciliationApproveView.as_view(), name="account-reconciliation-approve"),
]
