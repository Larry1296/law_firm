from datetime import date
from decimal import Decimal

from django.core.exceptions import ValidationError as DjangoValidationError
from django.test import TestCase
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.billing.models import (
    CreditNote, Disbursement, FinancialAccount, Invoice, LedgerTransaction,
    ClientFundsLedger, MatterClientLedger, ReceiptReversal, TimeEntry,
)
from apps.billing.services.finance_service import ClientMoneyService, CreditNoteService, InvoiceService
from apps.billing.serializers.finance_serializer import PreMatterRetainerReceiptSerializer
from apps.cases.models import Case
from apps.clients.models import Client, ClientMatterConflictCheck, EngagementRecord
from apps.common.choices import UserRole
from apps.firm.models import LawFirm
from apps.staff.models import Accountant, AccountantPermission, AccountantPermissionGrant, Lawyer
from apps.users.models import User


class FinancialControlTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            email="finance-owner@example.com", password="pass", first_name="Finance", last_name="Owner",
            phone_number="+254700820001", national_id_number="FINOWNER1", role=UserRole.ADMIN,
        )
        self.firm = LawFirm.objects.create(name="Finance Test Firm", registration_number="FIN-FIRM", owner=self.owner)
        self.lawyer = Lawyer.objects.create(
            user=self.owner, law_firm=self.firm, staff_number="FIN-ADV-1",
            admission_number="FIN-ADV-1", date_hired=date(2026, 1, 1),
        )
        self.client = Client.objects.create(
            firm=self.firm, created_by=self.owner, full_name="Finance Client",
            client_type=Client.ClientType.INDIVIDUAL, national_id="FINCLIENT1",
        )
        self.matter = Case.objects.create(
            firm=self.firm, client=self.client, created_by=self.owner, case_number="MAT-FIN-001",
            title="Commercial advisory", case_type=Case.CaseType.COMMERCIAL,
        )
        self.client_account = FinancialAccount.objects.create(
            firm=self.firm, name="Client Account", account_type=FinancialAccount.AccountType.CLIENT,
            account_reference="CLIENT-001",
        )
        self.office_account = FinancialAccount.objects.create(
            firm=self.firm, name="Office Account", account_type=FinancialAccount.AccountType.OFFICE,
            account_reference="OFFICE-001",
        )
        self.checker_user = User.objects.create_user(
            email="finance-checker@example.com", password="pass", first_name="Finance", last_name="Checker",
            phone_number="+254700820002", national_id_number="FINCHECK2", role=UserRole.STAFF,
        )
        self.checker = Accountant.objects.create(
            user=self.checker_user, law_firm=self.firm, staff_number="ACC-001", date_hired=date(2026, 1, 1),
        )
        for code in (
            AccountantPermission.APPROVE_CLIENT_MONEY_PAYMENTS,
            AccountantPermission.APPROVE_INVOICES,
            AccountantPermission.MANAGE_INVOICES,
            AccountantPermission.MANAGE_EXPENSES,
        ):
            AccountantPermissionGrant.objects.create(accountant=self.checker, code=code, granted_by=self.owner)

    def receive(self, amount="1000.00"):
        return ClientMoneyService.receive(
            user=self.owner, matter_id=self.matter.id, account_id=self.client_account.id,
            receipt_data={
                "receipt_number": f"RCT-{amount}", "amount_received": Decimal(amount), "currency": "KES",
                "payment_date": date(2026, 8, 4), "payment_method": "BANK_TRANSFER",
                "bank_transaction_reference": f"BANK-{amount}",
            },
        )

    def test_office_and_client_money_are_separate_and_ledger_cannot_go_negative(self):
        self.receive()
        ledger = MatterClientLedger.objects.get(matter=self.matter)
        self.assertEqual(ledger.cleared_balance, Decimal("1000.00"))
        self.assertEqual(ledger.transactions.get().account.account_type, FinancialAccount.AccountType.CLIENT)
        with self.assertRaises(ValidationError):
            ClientMoneyService.request_payment(
                user=self.owner, matter_id=self.matter.id, account_id=self.client_account.id,
                data={"beneficiary_name": "Supplier", "beneficiary_details": {}, "amount": Decimal("1000.01"),
                      "currency": "KES", "purpose": "Search fee", "payment_basis": "Client instruction"},
            )

    def test_payment_requires_independent_checker_and_sufficient_funds(self):
        self.receive()
        instruction = ClientMoneyService.request_payment(
            user=self.owner, matter_id=self.matter.id, account_id=self.client_account.id,
            data={"beneficiary_name": "Registry", "beneficiary_details": {"account": "REG-001"}, "amount": Decimal("400"),
                  "currency": "KES", "purpose": "Filing", "payment_basis": "Written instruction"},
        )
        with self.assertRaises(PermissionDenied):
            ClientMoneyService.approve_payment(user=self.owner, instruction_id=instruction.id)
        ClientMoneyService.approve_payment(user=self.checker_user, instruction_id=instruction.id)
        self.assertEqual(MatterClientLedger.objects.get(matter=self.matter).cleared_balance, Decimal("600"))

    def test_posted_transaction_is_immutable_and_reversal_preserves_original(self):
        _, original = self.receive()
        original.narrative = "silently changed"
        with self.assertRaises(DjangoValidationError):
            original.save()
        with self.assertRaises(DjangoValidationError):
            original.delete()
        reversal = ClientMoneyService.reverse(
            user=self.checker_user, transaction_id=original.id, reason="Bank reversed the deposit."
        )
        self.assertEqual(reversal.original_transaction, original)
        self.assertTrue(LedgerTransaction.objects.filter(id=original.id).exists())
        self.assertEqual(MatterClientLedger.objects.get(matter=self.matter).cleared_balance, 0)
        self.assertTrue(ReceiptReversal.objects.filter(
            original_transaction=original, reversal_transaction=reversal,
        ).exists())

    def test_transfer_to_office_requires_issued_invoice_and_valid_basis(self):
        self.receive()
        invoice = InvoiceService.create(
            user=self.owner,
            data={"client": self.client, "matter": self.matter, "invoice_number": "INV-001",
                  "invoice_date": date(2026, 8, 4), "due_date": date(2026, 8, 11), "currency": "KES"},
            lines=[{"line_type": "PROFESSIONAL_FEE", "description": "Advice", "quantity": Decimal("1"),
                    "unit_price": Decimal("500")}],
        )
        with self.assertRaises(ValidationError):
            ClientMoneyService.transfer_to_office(
                user=self.checker_user, invoice_id=invoice.id, client_account_id=self.client_account.id,
                office_account_id=self.office_account.id, amount=Decimal("500"), basis="Fee agreement",
            )
        InvoiceService.submit(user=self.owner, invoice_id=invoice.id)
        InvoiceService.approve(user=self.checker_user, invoice_id=invoice.id)
        InvoiceService.issue(user=self.owner, invoice_id=invoice.id)
        entry = ClientMoneyService.transfer_to_office(
            user=self.checker_user, invoice_id=invoice.id, client_account_id=self.client_account.id,
            office_account_id=self.office_account.id, amount=Decimal("500"), basis="Signed fee agreement and INV-001",
        )
        self.assertEqual(entry.account.account_type, FinancialAccount.AccountType.CLIENT)
        invoice.refresh_from_db()
        self.assertEqual(invoice.status, Invoice.Status.PAID)

    def test_cross_firm_financial_access_is_blocked(self):
        other_owner = User.objects.create_user(
            email="other-finance@example.com", password="pass", first_name="Other", last_name="Owner",
            phone_number="+254700820003", national_id_number="FINOTHER3", role=UserRole.ADMIN,
        )
        LawFirm.objects.create(name="Other Finance Firm", registration_number="FIN-OTHER", owner=other_owner)
        with self.assertRaises(ValidationError):
            ClientMoneyService.receive(
                user=other_owner, matter_id=self.matter.id, account_id=self.client_account.id,
                receipt_data={"receipt_number": "X", "amount_received": Decimal("10"), "currency": "KES",
                              "payment_date": date.today(), "payment_method": "CASH",
                              "bank_transaction_reference": "X"},
            )

    def test_issued_invoice_is_corrected_by_independently_approved_credit_note(self):
        invoice = InvoiceService.create(
            user=self.owner,
            data={"client": self.client, "matter": self.matter, "invoice_number": "INV-CREDIT-001",
                  "invoice_date": date(2026, 8, 4), "due_date": date(2026, 8, 11), "currency": "KES"},
            lines=[{"line_type": "PROFESSIONAL_FEE", "description": "Advice", "quantity": Decimal("1"),
                    "unit_price": Decimal("500")}],
        )
        InvoiceService.submit(user=self.owner, invoice_id=invoice.id)
        InvoiceService.approve(user=self.checker_user, invoice_id=invoice.id)
        InvoiceService.issue(user=self.owner, invoice_id=invoice.id)
        with self.assertRaises(ValidationError):
            InvoiceService.cancel(user=self.owner, invoice_id=invoice.id, reason="Wrong scope")
        note = CreditNoteService.create(
            user=self.owner,
            data={"invoice": invoice, "credit_note_number": "CN-001", "credit_date": date(2026, 8, 4),
                  "amount": Decimal("200"), "reason": "Approved scope adjustment"},
        )
        with self.assertRaises(PermissionDenied):
            CreditNoteService.approve(user=self.owner, credit_note_id=note.id)
        CreditNoteService.approve(user=self.checker_user, credit_note_id=note.id)
        CreditNoteService.issue(user=self.owner, credit_note_id=note.id)
        invoice.refresh_from_db()
        note.refresh_from_db()
        self.assertEqual(note.status, CreditNote.Status.ISSUED)
        self.assertEqual(invoice.credited_amount, Decimal("200"))
        self.assertEqual(invoice.balance, Decimal("300"))

    def test_approved_time_and_disbursement_link_to_draft_invoice_once(self):
        invoice = InvoiceService.create(
            user=self.owner,
            data={"client": self.client, "matter": self.matter, "invoice_number": "INV-BILLABLE-001",
                  "invoice_date": date(2026, 8, 4), "due_date": date(2026, 8, 11), "currency": "KES"},
            lines=[{"line_type": "PROFESSIONAL_FEE", "description": "Initial fee", "quantity": Decimal("1"),
                    "unit_price": Decimal("100")}],
        )
        time_entry = TimeEntry.objects.create(
            firm=self.firm, matter=self.matter, staff_member=self.owner, activity="Research",
            entry_date=date(2026, 8, 4), duration_minutes=120, hourly_rate=Decimal("200"),
            billable=True, narrative="Research Kenyan authorities", approval_status=TimeEntry.ApprovalStatus.APPROVED,
            approved_by=self.checker_user,
        )
        disbursement = Disbursement.objects.create(
            firm=self.firm, matter=self.matter, disbursement_type="SEARCH", description="Company search",
            supplier_payee="Business Registration Service", amount=Decimal("50"), currency="KES",
            date_incurred=date(2026, 8, 4), funding_source=Disbursement.FundingSource.FIRM,
            recoverable_from_client=True, approval_status=Disbursement.ApprovalStatus.APPROVED,
            created_by=self.owner, approved_by=self.checker_user,
        )
        InvoiceService.add_billables(
            user=self.owner, invoice_id=invoice.id,
            time_entry_ids=[time_entry.id], disbursement_ids=[disbursement.id],
        )
        invoice.refresh_from_db(); time_entry.refresh_from_db(); disbursement.refresh_from_db()
        self.assertEqual(invoice.total_amount, Decimal("550"))
        self.assertEqual(time_entry.invoice, invoice)
        self.assertEqual(disbursement.invoice, invoice)
        with self.assertRaises(ValidationError):
            InvoiceService.add_billables(
                user=self.owner, invoice_id=invoice.id,
                time_entry_ids=[time_entry.id], disbursement_ids=[],
            )

    def test_pre_matter_retainer_moves_from_unallocated_funds_to_opened_matter_atomically(self):
        proposal = ClientMatterConflictCheck.objects.create(
            firm=self.firm, client=self.client, reference_number="RET/2026/0001",
            proposed_matter_title="Retainer instruction", proposed_instructions="Provide advice",
            responsible_lawyer=self.lawyer, created_by=self.owner,
        )
        engagement = EngagementRecord.objects.create(
            firm=self.firm, client=self.client, proposed_matter=proposal,
            responsible_advocate=self.lawyer, scope_of_work="Advice",
            fee_arrangement_type=EngagementRecord.FeeArrangement.FIXED,
            fee_arrangement_description="KES 750 retainer", required_retainer=Decimal("750"),
            status=EngagementRecord.Status.RETAINER_PENDING, created_by=self.owner,
        )
        receipt, entry = ClientMoneyService.receive_retainer(
            user=self.owner, client=self.client, proposed_matter=proposal, engagement=engagement,
            account_id=self.client_account.id,
            receipt_data={"receipt_number": "RET-001", "amount_received": Decimal("750"),
                          "currency": "KES", "payment_date": date(2026, 8, 4),
                          "payment_method": "BANK_TRANSFER", "bank_transaction_reference": "BANK-RET-001"},
        )
        engagement.refresh_from_db()
        self.assertTrue(engagement.retainer_received)
        self.assertIsNone(receipt.matter_id)
        self.assertEqual(entry.transaction_type, LedgerTransaction.TransactionType.RETAINER_RECEIPT)
        self.assertEqual(ClientFundsLedger.objects.get(client=self.client).cleared_balance, Decimal("750"))

        ClientMoneyService.allocate_retainer_to_matter(
            engagement=engagement, matter=self.matter, actor=self.owner,
        )
        engagement.refresh_from_db()
        self.assertEqual(engagement.matter, self.matter)
        self.assertEqual(ClientFundsLedger.objects.get(client=self.client).cleared_balance, 0)
        self.assertEqual(MatterClientLedger.objects.get(matter=self.matter).cleared_balance, Decimal("750"))
        self.assertEqual(LedgerTransaction.objects.filter(
            engagement=engagement, transaction_type=LedgerTransaction.TransactionType.RETAINER_ALLOCATION,
        ).count(), 2)

    def test_pre_matter_retainer_api_payload_does_not_require_an_open_matter(self):
        serializer = PreMatterRetainerReceiptSerializer(data={
            "client": self.client.id, "proposed_matter": self.client.id,
            "engagement": self.client.id, "account": self.client_account.id,
            "receipt_number": "RET-API-001", "amount_received": "100.00", "currency": "KES",
            "payment_date": "2026-08-04", "payment_method": "BANK_TRANSFER",
            "bank_transaction_reference": "BANK-RET-API-001",
        })
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertNotIn("matter", serializer.validated_data)
