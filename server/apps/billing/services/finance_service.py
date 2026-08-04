from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.billing.models import (
    FinancialAccount, Invoice, InvoiceLine, LedgerTransaction, MatterClientLedger,
    PaymentInstruction, Receipt, ReceiptAllocation,
)
from apps.cases.models import Case
from apps.cases.services.case_service import CaseService
from apps.common.choices import UserRole
from apps.staff.models import AccountantPermission


class FinanceAccess:
    @staticmethod
    def firm(user):
        return CaseService.get_user_firm(user)

    @classmethod
    def require(cls, user, code):
        firm = cls.firm(user)
        if user.role == UserRole.ADMIN and firm.owner_id == user.id:
            return firm
        profile = getattr(user, "accountant_profile", None)
        if not profile or profile.law_firm_id != firm.id or not profile.is_active or not profile.has_permission(code):
            raise PermissionDenied(f"Financial permission {code} is required.")
        return firm


class InvoiceService:
    @staticmethod
    def _totals(lines):
        totals = {kind: Decimal("0") for kind, _ in InvoiceLine.LineType.choices}
        for line in lines:
            amount = Decimal(str(line["quantity"])) * Decimal(str(line["unit_price"]))
            totals[line["line_type"]] += amount
        professional = totals[InvoiceLine.LineType.PROFESSIONAL_FEE]
        tax = totals[InvoiceLine.LineType.TAX]
        disbursements = totals[InvoiceLine.LineType.DISBURSEMENT]
        adjustment = totals[InvoiceLine.LineType.ADJUSTMENT] - totals[InvoiceLine.LineType.DISCOUNT]
        total = professional + tax + disbursements + adjustment
        if total < 0:
            raise ValidationError({"line_items": "Invoice total cannot be negative."})
        return professional, tax, disbursements, adjustment, total

    @classmethod
    @transaction.atomic
    def create(cls, *, user, data, lines):
        firm = FinanceAccess.require(user, AccountantPermission.MANAGE_INVOICES)
        matter = Case.objects.select_for_update().filter(id=data["matter"].id, firm=firm).first()
        if not matter or matter.client_id != data["client"].id:
            raise ValidationError({"matter": "Matter and client must belong to your firm."})
        if not lines:
            raise ValidationError({"line_items": "At least one invoice line is required."})
        professional, tax, disbursements, adjustment, total = cls._totals(lines)
        invoice = Invoice(
            firm=firm, created_by=user, professional_fees=professional, tax_amount=tax,
            disbursements_total=disbursements, discount_adjustment=adjustment,
            total_amount=total, balance=total, **data,
        )
        invoice.full_clean()
        invoice.save()
        for item in lines:
            amount = Decimal(str(item["quantity"])) * Decimal(str(item["unit_price"]))
            InvoiceLine.objects.create(invoice=invoice, amount=amount, **item)
        return invoice

    @classmethod
    @transaction.atomic
    def submit(cls, *, user, invoice_id):
        firm = FinanceAccess.require(user, AccountantPermission.MANAGE_INVOICES)
        invoice = Invoice.objects.select_for_update().get(id=invoice_id, firm=firm)
        if invoice.status != Invoice.Status.DRAFT:
            raise ValidationError({"status": "Only draft invoices may be submitted."})
        invoice.status = Invoice.Status.PENDING_APPROVAL
        invoice.save(update_fields=["status", "updated_at"])
        return invoice

    @classmethod
    @transaction.atomic
    def approve(cls, *, user, invoice_id):
        firm = FinanceAccess.require(user, AccountantPermission.APPROVE_INVOICES)
        invoice = Invoice.objects.select_for_update().get(id=invoice_id, firm=firm)
        if invoice.status != Invoice.Status.PENDING_APPROVAL:
            raise ValidationError({"status": "Only pending invoices may be approved."})
        if invoice.created_by_id == user.id:
            raise PermissionDenied("The invoice maker cannot approve their own invoice.")
        invoice.status = Invoice.Status.APPROVED
        invoice.approved_by = user
        invoice.approved_at = timezone.now()
        invoice.save(update_fields=["status", "approved_by", "approved_at", "updated_at"])
        return invoice

    @classmethod
    @transaction.atomic
    def issue(cls, *, user, invoice_id):
        firm = FinanceAccess.require(user, AccountantPermission.MANAGE_INVOICES)
        invoice = Invoice.objects.select_for_update().get(id=invoice_id, firm=firm)
        if invoice.status != Invoice.Status.APPROVED:
            raise ValidationError({"status": "Only approved invoices may be issued."})
        invoice.status = Invoice.Status.ISSUED
        invoice.issued_at = timezone.now()
        invoice.save(update_fields=["status", "issued_at", "updated_at"])
        return invoice


class ClientMoneyService:
    @staticmethod
    def _matter(firm, matter_id):
        try:
            return Case.objects.select_for_update().select_related("client").get(id=matter_id, firm=firm)
        except Case.DoesNotExist:
            raise ValidationError({"matter": "Matter does not belong to your firm."})

    @staticmethod
    def _account(firm, account_id, required_type):
        try:
            return FinancialAccount.objects.get(id=account_id, firm=firm, account_type=required_type, is_active=True)
        except FinancialAccount.DoesNotExist:
            raise ValidationError({"account": f"An active {required_type.lower()} account in your firm is required."})

    @classmethod
    def _ledger(cls, matter):
        ledger, _ = MatterClientLedger.objects.select_for_update().get_or_create(
            matter=matter, defaults={"firm": matter.firm, "client": matter.client, "currency": "KES"}
        )
        return ledger

    @classmethod
    @transaction.atomic
    def receive(cls, *, user, matter_id, account_id, receipt_data):
        firm = FinanceAccess.require(user, AccountantPermission.RECORD_RECEIPTS)
        matter = cls._matter(firm, matter_id)
        account = cls._account(firm, account_id, FinancialAccount.AccountType.CLIENT)
        amount = Decimal(str(receipt_data["amount_received"]))
        if amount <= 0:
            raise ValidationError({"amount_received": "Amount must be positive."})
        ledger = cls._ledger(matter)
        receipt = Receipt.objects.create(
            firm=firm, client=matter.client, matter=matter, account=account, recorded_by=user, **receipt_data
        )
        ReceiptAllocation.objects.create(
            receipt=receipt, allocation_type=ReceiptAllocation.AllocationType.CLIENT_MONEY, amount=amount
        )
        entry = LedgerTransaction.objects.create(
            firm=firm, account=account, ledger=ledger, matter=matter, client=matter.client,
            transaction_type=LedgerTransaction.TransactionType.CLIENT_RECEIPT,
            direction=LedgerTransaction.Direction.CREDIT, amount=amount, currency=receipt.currency,
            narrative=f"Client money receipt {receipt.receipt_number}",
            bank_reference=receipt.bank_transaction_reference, posted_by=user,
        )
        ledger.cleared_balance += amount
        ledger.save(update_fields=["cleared_balance", "updated_at"])
        return receipt, entry

    @classmethod
    @transaction.atomic
    def request_payment(cls, *, user, matter_id, account_id, data):
        firm = FinanceAccess.require(user, AccountantPermission.MANAGE_CLIENT_MONEY)
        matter = cls._matter(firm, matter_id)
        account = cls._account(firm, account_id, FinancialAccount.AccountType.CLIENT)
        ledger = cls._ledger(matter)
        amount = Decimal(str(data["amount"]))
        if amount <= 0 or amount > ledger.cleared_balance:
            raise ValidationError({"amount": "Sufficient cleared client funds are required."})
        instruction = PaymentInstruction(
            firm=firm, matter=matter, ledger=ledger, account=account, maker=user, **data
        )
        instruction.full_clean()
        instruction.save()
        return instruction

    @classmethod
    @transaction.atomic
    def approve_payment(cls, *, user, instruction_id):
        firm = FinanceAccess.require(user, AccountantPermission.APPROVE_CLIENT_MONEY_PAYMENTS)
        instruction = PaymentInstruction.objects.select_for_update().select_related("matter").get(
            id=instruction_id, firm=firm
        )
        if instruction.status != PaymentInstruction.Status.PENDING_APPROVAL:
            raise ValidationError({"status": "Only pending payment instructions may be approved."})
        if instruction.maker_id == user.id:
            raise PermissionDenied("The payment maker cannot approve their own instruction.")
        ledger = MatterClientLedger.objects.select_for_update().get(id=instruction.ledger_id, firm=firm)
        if ledger.cleared_balance < instruction.amount:
            raise ValidationError({"amount": "The client ledger has insufficient cleared funds."})
        entry = LedgerTransaction.objects.create(
            firm=firm, account=instruction.account, ledger=ledger, matter=instruction.matter,
            client=instruction.matter.client, transaction_type=LedgerTransaction.TransactionType.CLIENT_PAYMENT,
            direction=LedgerTransaction.Direction.DEBIT, amount=instruction.amount,
            currency=instruction.currency, narrative=instruction.purpose, basis=instruction.payment_basis,
            posted_by=user,
        )
        ledger.cleared_balance -= instruction.amount
        ledger.save(update_fields=["cleared_balance", "updated_at"])
        instruction.status = PaymentInstruction.Status.POSTED
        instruction.checker = user
        instruction.approved_at = timezone.now()
        instruction.posted_transaction = entry
        instruction.save(update_fields=["status", "checker", "approved_at", "posted_transaction", "updated_at"])
        return instruction

    @classmethod
    @transaction.atomic
    def transfer_to_office(cls, *, user, invoice_id, client_account_id, office_account_id, amount, basis):
        firm = FinanceAccess.require(user, AccountantPermission.APPROVE_CLIENT_MONEY_PAYMENTS)
        invoice = Invoice.objects.select_for_update().select_related("matter", "client").get(id=invoice_id, firm=firm)
        if invoice.status not in {Invoice.Status.ISSUED, Invoice.Status.PARTIALLY_PAID}:
            raise ValidationError({"invoice": "An issued, unpaid approved invoice is required."})
        if not basis.strip():
            raise ValidationError({"basis": "The legal and contractual transfer basis is required."})
        amount = Decimal(str(amount))
        if amount <= 0 or amount > invoice.balance:
            raise ValidationError({"amount": "Transfer must be positive and cannot exceed the invoice balance."})
        client_account = cls._account(firm, client_account_id, FinancialAccount.AccountType.CLIENT)
        office_account = cls._account(firm, office_account_id, FinancialAccount.AccountType.OFFICE)
        ledger = cls._ledger(invoice.matter)
        if ledger.cleared_balance < amount:
            raise ValidationError({"amount": "The matter has insufficient cleared client funds."})
        debit = LedgerTransaction.objects.create(
            firm=firm, account=client_account, ledger=ledger, matter=invoice.matter, client=invoice.client,
            transaction_type=LedgerTransaction.TransactionType.TRANSFER_TO_OFFICE,
            direction=LedgerTransaction.Direction.DEBIT, amount=amount, currency=invoice.currency,
            narrative=f"Transfer against invoice {invoice.invoice_number}", basis=basis, posted_by=user,
        )
        LedgerTransaction.objects.create(
            firm=firm, account=office_account, matter=invoice.matter, client=invoice.client,
            transaction_type=LedgerTransaction.TransactionType.OFFICE_RECEIPT,
            direction=LedgerTransaction.Direction.CREDIT, amount=amount, currency=invoice.currency,
            narrative=f"Office receipt against invoice {invoice.invoice_number}", basis=basis,
            correlation_id=debit.correlation_id, posted_by=user,
        )
        ledger.cleared_balance -= amount
        ledger.save(update_fields=["cleared_balance", "updated_at"])
        invoice.amount_paid += amount
        invoice.balance -= amount
        invoice.status = Invoice.Status.PAID if invoice.balance == 0 else Invoice.Status.PARTIALLY_PAID
        invoice.save(update_fields=["amount_paid", "balance", "status", "updated_at"])
        return debit

    @classmethod
    @transaction.atomic
    def reverse(cls, *, user, transaction_id, reason):
        firm = FinanceAccess.require(user, AccountantPermission.APPROVE_CLIENT_MONEY_PAYMENTS)
        if not reason.strip():
            raise ValidationError({"reason": "A reversal reason is required."})
        original = LedgerTransaction.objects.select_for_update().get(id=transaction_id, firm=firm)
        if original.reversal_entries.exists():
            raise ValidationError({"transaction": "This transaction has already been reversed."})
        ledger = None
        direction = LedgerTransaction.Direction.DEBIT if original.direction == LedgerTransaction.Direction.CREDIT else LedgerTransaction.Direction.CREDIT
        if original.ledger_id:
            ledger = MatterClientLedger.objects.select_for_update().get(id=original.ledger_id)
            new_balance = ledger.cleared_balance - original.amount if direction == LedgerTransaction.Direction.DEBIT else ledger.cleared_balance + original.amount
            if new_balance < 0:
                raise ValidationError({"transaction": "Reversal would create a negative client balance."})
            ledger.cleared_balance = new_balance
            ledger.save(update_fields=["cleared_balance", "updated_at"])
        return LedgerTransaction.objects.create(
            firm=firm, account=original.account, ledger=ledger, matter=original.matter, client=original.client,
            transaction_type=LedgerTransaction.TransactionType.REVERSAL, direction=direction,
            amount=original.amount, currency=original.currency, narrative=f"Reversal: {reason}",
            basis=reason, original_transaction=original, correlation_id=original.correlation_id, posted_by=user,
        )
