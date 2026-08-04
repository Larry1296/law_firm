import uuid
from decimal import Decimal

from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.billing.models import (
    AccountReconciliation, ClientFundsLedger, CreditNote, Disbursement, FinancialAccount, Invoice, InvoiceLine,
    LedgerTransaction, MatterClientLedger, PaymentInstruction, Receipt,
    ReceiptAllocation, ReceiptReversal, TimeEntry,
)
from apps.audit_logs.services import AuditService
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

    @staticmethod
    def _recalculate(invoice):
        totals = {kind: Decimal("0") for kind, _ in InvoiceLine.LineType.choices}
        for line in invoice.line_items.all():
            totals[line.line_type] += line.amount
        invoice.professional_fees = totals[InvoiceLine.LineType.PROFESSIONAL_FEE]
        invoice.tax_amount = totals[InvoiceLine.LineType.TAX]
        invoice.disbursements_total = totals[InvoiceLine.LineType.DISBURSEMENT]
        invoice.discount_adjustment = totals[InvoiceLine.LineType.ADJUSTMENT] - totals[InvoiceLine.LineType.DISCOUNT]
        invoice.total_amount = invoice.professional_fees + invoice.tax_amount + invoice.disbursements_total + invoice.discount_adjustment
        invoice.balance = invoice.total_amount - invoice.amount_paid - invoice.credited_amount
        if invoice.total_amount < 0 or invoice.balance < 0:
            raise ValidationError({"invoice": "Billable additions would make invoice totals invalid."})
        invoice.save(update_fields=[
            "professional_fees", "tax_amount", "disbursements_total", "discount_adjustment",
            "total_amount", "balance", "updated_at",
        ])

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
        AuditService.record(firm=firm, user=user, action="INVOICE_CREATED", obj=invoice, new={"status": invoice.status, "total_amount": invoice.total_amount})
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
        AuditService.record(firm=firm, user=user, action="INVOICE_SUBMITTED", obj=invoice, previous={"status": Invoice.Status.DRAFT}, new={"status": invoice.status})
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
        AuditService.record(firm=firm, user=user, action="INVOICE_APPROVED", obj=invoice, previous={"status": Invoice.Status.PENDING_APPROVAL}, new={"status": invoice.status, "approved_by": user.id})
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
        AuditService.record(firm=firm, user=user, action="INVOICE_ISSUED", obj=invoice, previous={"status": Invoice.Status.APPROVED}, new={"status": invoice.status})
        return invoice

    @classmethod
    @transaction.atomic
    def add_billables(cls, *, user, invoice_id, time_entry_ids, disbursement_ids):
        firm = FinanceAccess.require(user, AccountantPermission.MANAGE_INVOICES)
        invoice = Invoice.objects.select_for_update().get(id=invoice_id, firm=firm)
        if invoice.status != Invoice.Status.DRAFT:
            raise ValidationError({"invoice": "Billable items may only be linked while the invoice is a draft."})
        time_ids = set(time_entry_ids)
        disbursement_ids = set(disbursement_ids)
        entries = list(TimeEntry.objects.select_for_update().filter(id__in=time_ids, firm=firm, matter=invoice.matter))
        expenses = list(Disbursement.objects.select_for_update().filter(id__in=disbursement_ids, firm=firm, matter=invoice.matter))
        if len(entries) != len(time_ids):
            raise ValidationError({"time_entry_ids": "Every time entry must belong to this invoice's firm and matter."})
        if len(expenses) != len(disbursement_ids):
            raise ValidationError({"disbursement_ids": "Every disbursement must belong to this invoice's firm and matter."})
        for entry in entries:
            if entry.approval_status != TimeEntry.ApprovalStatus.APPROVED or entry.invoice_id:
                raise ValidationError({"time_entry_ids": "Time entries must be approved and not already invoiced."})
            quantity = (Decimal(entry.duration_minutes) / Decimal("60")).quantize(Decimal("0.01"))
            InvoiceLine.objects.create(
                invoice=invoice, line_type=InvoiceLine.LineType.PROFESSIONAL_FEE,
                description=entry.narrative or entry.activity, quantity=quantity,
                unit_price=entry.hourly_rate, amount=quantity * entry.hourly_rate, time_entry=entry,
            )
            entry.invoice = invoice
            entry.save(update_fields=["invoice", "updated_at"])
        for expense in expenses:
            if expense.approval_status != Disbursement.ApprovalStatus.APPROVED or expense.invoice_id:
                raise ValidationError({"disbursement_ids": "Disbursements must be approved and not already invoiced."})
            InvoiceLine.objects.create(
                invoice=invoice, line_type=InvoiceLine.LineType.DISBURSEMENT,
                description=expense.description, quantity=1, unit_price=expense.amount,
                amount=expense.amount, disbursement=expense,
            )
            expense.invoice = invoice
            expense.save(update_fields=["invoice", "updated_at"])
        cls._recalculate(invoice)
        AuditService.record(
            firm=firm, user=user, action="INVOICE_BILLABLE_ITEMS_LINKED", obj=invoice,
            new={"time_entries": list(time_ids), "disbursements": list(disbursement_ids),
                 "total_amount": invoice.total_amount},
        )
        return invoice

    @classmethod
    @transaction.atomic
    def cancel(cls, *, user, invoice_id, reason):
        firm = FinanceAccess.require(user, AccountantPermission.MANAGE_INVOICES)
        if not reason.strip():
            raise ValidationError({"reason": "A cancellation reason is required."})
        invoice = Invoice.objects.select_for_update().get(id=invoice_id, firm=firm)
        if invoice.status not in {Invoice.Status.DRAFT, Invoice.Status.PENDING_APPROVAL, Invoice.Status.APPROVED}:
            raise ValidationError({"status": "An issued invoice must be corrected through an approved credit note."})
        if invoice.amount_paid or invoice.credited_amount:
            raise ValidationError({"invoice": "An allocated invoice cannot be cancelled."})
        previous = invoice.status
        invoice.status = Invoice.Status.CANCELLED
        invoice.cancellation_reason = reason.strip()
        invoice.save(update_fields=["status", "cancellation_reason", "updated_at"])
        AuditService.record(firm=firm, user=user, action="INVOICE_CANCELLED", obj=invoice,
                            previous={"status": previous}, new={"status": invoice.status}, reason=reason)
        return invoice


class CreditNoteService:
    @classmethod
    @transaction.atomic
    def create(cls, *, user, data):
        firm = FinanceAccess.require(user, AccountantPermission.MANAGE_INVOICES)
        data = dict(data)
        invoice_value = data.pop("invoice")
        invoice = Invoice.objects.select_for_update().get(id=invoice_value.id, firm=firm)
        if invoice.status not in {Invoice.Status.ISSUED, Invoice.Status.PARTIALLY_PAID, Invoice.Status.DISPUTED}:
            raise ValidationError({"invoice": "Only an issued or disputed invoice may receive a credit note."})
        amount = Decimal(str(data["amount"]))
        if amount <= 0 or amount > invoice.balance:
            raise ValidationError({"amount": "Credit must be positive and cannot exceed the invoice balance."})
        note = CreditNote(
            firm=firm, invoice=invoice, client=invoice.client, matter=invoice.matter,
            created_by=user, **data,
        )
        note.full_clean()
        note.save()
        AuditService.record(firm=firm, user=user, action="CREDIT_NOTE_CREATED", obj=note,
                            new={"invoice": invoice.id, "amount": amount, "status": note.status}, reason=note.reason)
        return note

    @classmethod
    @transaction.atomic
    def approve(cls, *, user, credit_note_id):
        firm = FinanceAccess.require(user, AccountantPermission.APPROVE_INVOICES)
        note = CreditNote.objects.select_for_update().get(id=credit_note_id, firm=firm)
        if note.status != CreditNote.Status.PENDING_APPROVAL:
            raise ValidationError({"status": "Only pending credit notes may be approved."})
        if note.created_by_id == user.id:
            raise PermissionDenied("The credit-note maker cannot approve their own credit note.")
        note.status = CreditNote.Status.APPROVED
        note.approved_by = user
        note.approved_at = timezone.now()
        note.save(update_fields=["status", "approved_by", "approved_at", "updated_at"])
        AuditService.record(firm=firm, user=user, action="CREDIT_NOTE_APPROVED", obj=note,
                            new={"status": note.status, "approved_by": user.id})
        return note

    @classmethod
    @transaction.atomic
    def issue(cls, *, user, credit_note_id):
        firm = FinanceAccess.require(user, AccountantPermission.MANAGE_INVOICES)
        note = CreditNote.objects.select_for_update().select_related("invoice").get(id=credit_note_id, firm=firm)
        if note.status != CreditNote.Status.APPROVED:
            raise ValidationError({"status": "Only an approved credit note may be issued."})
        invoice = Invoice.objects.select_for_update().get(id=note.invoice_id, firm=firm)
        if note.amount > invoice.balance:
            raise ValidationError({"amount": "The invoice balance changed and no longer supports this credit."})
        previous_balance = invoice.balance
        invoice.credited_amount += note.amount
        invoice.balance -= note.amount
        invoice.status = Invoice.Status.CREDITED if invoice.balance == 0 else Invoice.Status.ISSUED
        invoice.save(update_fields=["credited_amount", "balance", "status", "updated_at"])
        note.status = CreditNote.Status.ISSUED
        note.issued_at = timezone.now()
        note.save(update_fields=["status", "issued_at", "updated_at"])
        AuditService.record(firm=firm, user=user, action="CREDIT_NOTE_ISSUED", obj=note,
                            previous={"invoice_balance": previous_balance},
                            new={"invoice_balance": invoice.balance, "invoice_status": invoice.status})
        return note


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
    def receive_retainer(cls, *, user, client, proposed_matter, engagement, account_id, receipt_data):
        firm = FinanceAccess.require(user, AccountantPermission.RECORD_RECEIPTS)
        if client.firm_id != firm.id:
            raise ValidationError({"client": "Client belongs to another firm."})
        if proposed_matter.firm_id != firm.id or proposed_matter.client_id != client.id:
            raise ValidationError({"proposed_matter": "Proposed matter belongs to another firm or client."})
        if engagement.firm_id != firm.id or engagement.client_id != client.id or engagement.proposed_matter_id != proposed_matter.id:
            raise ValidationError({"engagement": "Engagement does not belong to this proposed matter."})
        if engagement.matter_id or proposed_matter.created_case_id:
            raise ValidationError({"engagement": "Use the opened matter's client ledger for later receipts."})
        account = cls._account(firm, account_id, FinancialAccount.AccountType.CLIENT)
        amount = Decimal(str(receipt_data["amount_received"]))
        if amount <= 0:
            raise ValidationError({"amount_received": "Amount must be positive."})
        proof = receipt_data.get("supporting_proof")
        if proof and (proof.firm_id != firm.id or proof.client_id != client.id):
            raise ValidationError({"supporting_proof": "Supporting proof belongs to another firm or client."})
        holding, _ = ClientFundsLedger.objects.select_for_update().get_or_create(
            firm=firm, client=client, defaults={"currency": receipt_data.get("currency", "KES")}
        )
        if holding.currency != receipt_data.get("currency", "KES"):
            raise ValidationError({"currency": "Retainer currency must match the client's unallocated-funds ledger."})
        receipt = Receipt.objects.create(
            firm=firm, client=client, proposed_matter=proposed_matter, engagement=engagement,
            account=account, recorded_by=user, **receipt_data,
        )
        ReceiptAllocation.objects.create(
            receipt=receipt, allocation_type=ReceiptAllocation.AllocationType.RETAINER,
            amount=amount, engagement=engagement,
        )
        entry = LedgerTransaction.objects.create(
            firm=firm, account=account, client_funds_ledger=holding, client=client,
            engagement=engagement, transaction_type=LedgerTransaction.TransactionType.RETAINER_RECEIPT,
            direction=LedgerTransaction.Direction.CREDIT, amount=amount, currency=receipt.currency,
            narrative=f"Pre-matter retainer receipt {receipt.receipt_number}",
            bank_reference=receipt.bank_transaction_reference, receipt=receipt, posted_by=user,
        )
        holding.cleared_balance += amount
        holding.save(update_fields=["cleared_balance", "updated_at"])
        received_total = engagement.receipt_allocations.aggregate(total=Sum("amount"))["total"] or Decimal("0")
        if engagement.required_retainer and received_total >= engagement.required_retainer:
            engagement.retainer_received = True
            engagement.save(update_fields=["retainer_received", "updated_at"])
        AuditService.record(
            firm=firm, user=user, action="PRE_MATTER_RETAINER_RECEIVED", obj=entry,
            new={"amount": amount, "engagement": engagement.id, "unallocated_balance": holding.cleared_balance},
            correlation_id=entry.correlation_id,
        )
        return receipt, entry

    @classmethod
    def allocate_retainer_to_matter(cls, *, engagement, matter, actor):
        """Called inside the matter-opening transaction after the matter row exists."""
        if LedgerTransaction.objects.filter(
            engagement=engagement, matter=matter,
            transaction_type=LedgerTransaction.TransactionType.RETAINER_ALLOCATION,
            direction=LedgerTransaction.Direction.CREDIT,
        ).exists():
            return
        allocations = list(ReceiptAllocation.objects.select_for_update().filter(
            engagement=engagement, allocation_type=ReceiptAllocation.AllocationType.RETAINER,
        ).select_related("receipt", "receipt__account"))
        if not allocations:
            engagement.matter = matter
            engagement.save(update_fields=["matter", "updated_at"])
            return
        holding = ClientFundsLedger.objects.select_for_update().get(firm=matter.firm, client=matter.client)
        total = sum((item.amount for item in allocations), Decimal("0"))
        if holding.cleared_balance < total:
            raise ValidationError({"retainer": "Unallocated retainer balance is insufficient for matter allocation."})
        ledger = cls._ledger(matter)
        for allocation in allocations:
            correlation_id = uuid.uuid4()
            LedgerTransaction.objects.create(
                firm=matter.firm, account=allocation.receipt.account, client_funds_ledger=holding,
                matter=matter, client=matter.client, engagement=engagement,
                transaction_type=LedgerTransaction.TransactionType.RETAINER_ALLOCATION,
                direction=LedgerTransaction.Direction.DEBIT, amount=allocation.amount,
                currency=allocation.receipt.currency, narrative="Allocate pre-matter retainer from unallocated client funds",
                basis=f"Engagement {engagement.id}", correlation_id=correlation_id, posted_by=actor,
            )
            LedgerTransaction.objects.create(
                firm=matter.firm, account=allocation.receipt.account, ledger=ledger,
                matter=matter, client=matter.client, engagement=engagement,
                transaction_type=LedgerTransaction.TransactionType.RETAINER_ALLOCATION,
                direction=LedgerTransaction.Direction.CREDIT, amount=allocation.amount,
                currency=allocation.receipt.currency, narrative="Allocate pre-matter retainer to matter ledger",
                basis=f"Engagement {engagement.id}", correlation_id=correlation_id, posted_by=actor,
            )
        holding.cleared_balance -= total
        holding.save(update_fields=["cleared_balance", "updated_at"])
        ledger.cleared_balance += total
        ledger.save(update_fields=["cleared_balance", "updated_at"])
        engagement.matter = matter
        engagement.save(update_fields=["matter", "updated_at"])
        AuditService.record(
            firm=matter.firm, user=actor, action="RETAINER_ALLOCATED_TO_OPENED_MATTER", obj=engagement,
            new={"matter": matter.id, "amount": total, "matter_ledger_balance": ledger.cleared_balance},
        )

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
        proof = receipt_data.get("supporting_proof")
        if proof and (proof.firm_id != firm.id or proof.client_id != matter.client_id):
            raise ValidationError({"supporting_proof": "Supporting proof belongs to another firm or client."})
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
            bank_reference=receipt.bank_transaction_reference, receipt=receipt, posted_by=user,
        )
        ledger.cleared_balance += amount
        ledger.save(update_fields=["cleared_balance", "updated_at"])
        AuditService.record(firm=firm, user=user, action="CLIENT_MONEY_RECEIVED", obj=entry, new={"amount": amount, "ledger_balance": ledger.cleared_balance, "receipt": receipt.id}, correlation_id=entry.correlation_id)
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
        AuditService.record(firm=firm, user=user, action="CLIENT_MONEY_PAYMENT_REQUESTED", obj=instruction, new={"amount": amount, "beneficiary": instruction.beneficiary_name, "status": instruction.status})
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
        AuditService.record(firm=firm, user=user, action="CLIENT_MONEY_PAYMENT_APPROVED_AND_POSTED", obj=instruction, previous={"status": PaymentInstruction.Status.PENDING_APPROVAL, "ledger_balance": ledger.cleared_balance + instruction.amount}, new={"status": instruction.status, "ledger_balance": ledger.cleared_balance, "transaction": entry.id}, correlation_id=entry.correlation_id)
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
            invoice=invoice,
        )
        LedgerTransaction.objects.create(
            firm=firm, account=office_account, matter=invoice.matter, client=invoice.client,
            transaction_type=LedgerTransaction.TransactionType.OFFICE_RECEIPT,
            direction=LedgerTransaction.Direction.CREDIT, amount=amount, currency=invoice.currency,
            narrative=f"Office receipt against invoice {invoice.invoice_number}", basis=basis,
            correlation_id=debit.correlation_id, invoice=invoice, posted_by=user,
        )
        ledger.cleared_balance -= amount
        ledger.save(update_fields=["cleared_balance", "updated_at"])
        invoice.amount_paid += amount
        invoice.balance -= amount
        invoice.status = Invoice.Status.PAID if invoice.balance == 0 else Invoice.Status.PARTIALLY_PAID
        invoice.save(update_fields=["amount_paid", "balance", "status", "updated_at"])
        AuditService.record(firm=firm, user=user, action="CLIENT_MONEY_TRANSFERRED_TO_OFFICE", obj=debit, previous={"invoice_balance": invoice.balance + amount, "ledger_balance": ledger.cleared_balance + amount}, new={"invoice_balance": invoice.balance, "ledger_balance": ledger.cleared_balance, "office_account": office_account.id}, reason=basis, correlation_id=debit.correlation_id)
        return debit

    @classmethod
    @transaction.atomic
    def reverse(cls, *, user, transaction_id, reason):
        firm = FinanceAccess.require(user, AccountantPermission.APPROVE_CLIENT_MONEY_PAYMENTS)
        if not reason.strip():
            raise ValidationError({"reason": "A reversal reason is required."})
        original = LedgerTransaction.objects.select_for_update().get(id=transaction_id, firm=firm)
        if original.transaction_type == LedgerTransaction.TransactionType.OFFICE_RECEIPT and not original.receipt_id:
            raise ValidationError({"transaction": "Reverse the linked client-to-office transfer entry; its paired office entry will reverse atomically."})
        if original.transaction_type == LedgerTransaction.TransactionType.RETAINER_ALLOCATION and not original.ledger_id:
            raise ValidationError({"transaction": "Reverse the matter-ledger retainer allocation; the paired holding entry will reverse atomically."})
        if original.reversal_entries.exists():
            raise ValidationError({"transaction": "This transaction has already been reversed."})
        ledger = None
        client_funds_ledger = None
        direction = LedgerTransaction.Direction.DEBIT if original.direction == LedgerTransaction.Direction.CREDIT else LedgerTransaction.Direction.CREDIT
        if original.ledger_id:
            ledger = MatterClientLedger.objects.select_for_update().get(id=original.ledger_id)
            new_balance = ledger.cleared_balance - original.amount if direction == LedgerTransaction.Direction.DEBIT else ledger.cleared_balance + original.amount
            if new_balance < 0:
                raise ValidationError({"transaction": "Reversal would create a negative client balance."})
            ledger.cleared_balance = new_balance
            ledger.save(update_fields=["cleared_balance", "updated_at"])
        if original.client_funds_ledger_id:
            client_funds_ledger = ClientFundsLedger.objects.select_for_update().get(id=original.client_funds_ledger_id)
            new_balance = (
                client_funds_ledger.cleared_balance - original.amount
                if direction == LedgerTransaction.Direction.DEBIT
                else client_funds_ledger.cleared_balance + original.amount
            )
            if new_balance < 0:
                raise ValidationError({"transaction": "Reversal would create a negative unallocated client-funds balance."})
            client_funds_ledger.cleared_balance = new_balance
            client_funds_ledger.save(update_fields=["cleared_balance", "updated_at"])
        reversal = LedgerTransaction.objects.create(
            firm=firm, account=original.account, ledger=ledger, client_funds_ledger=client_funds_ledger,
            matter=original.matter, client=original.client, engagement=original.engagement,
            transaction_type=LedgerTransaction.TransactionType.REVERSAL, direction=direction,
            amount=original.amount, currency=original.currency, narrative=f"Reversal: {reason}",
            basis=reason, original_transaction=original, correlation_id=original.correlation_id,
            receipt=original.receipt, invoice=original.invoice, posted_by=user,
        )
        if original.receipt_id:
            ReceiptReversal.objects.create(
                firm=firm, original_receipt=original.receipt, original_transaction=original,
                reversal_transaction=reversal, reason=reason, reversed_by=user,
            )
        invoice = None
        if original.invoice_id:
            invoice = Invoice.objects.select_for_update().get(id=original.invoice_id, firm=firm)
            invoice.amount_paid -= original.amount
            invoice.balance += original.amount
            if invoice.amount_paid < 0 or invoice.balance > invoice.total_amount:
                raise ValidationError({"transaction": "Reversal would make invoice allocation totals invalid."})
            invoice.status = Invoice.Status.ISSUED if invoice.amount_paid == 0 else Invoice.Status.PARTIALLY_PAID
            invoice.save(update_fields=["amount_paid", "balance", "status", "updated_at"])
        if original.transaction_type == LedgerTransaction.TransactionType.TRANSFER_TO_OFFICE:
            paired = LedgerTransaction.objects.select_for_update().filter(
                firm=firm, correlation_id=original.correlation_id,
                transaction_type=LedgerTransaction.TransactionType.OFFICE_RECEIPT,
                direction=LedgerTransaction.Direction.CREDIT,
            ).exclude(id=original.id).first()
            if not paired:
                raise ValidationError({"transaction": "The paired office entry is missing; escalate for controlled adjustment."})
            LedgerTransaction.objects.create(
                firm=firm, account=paired.account, matter=paired.matter, client=paired.client,
                transaction_type=LedgerTransaction.TransactionType.REVERSAL,
                direction=LedgerTransaction.Direction.DEBIT, amount=paired.amount,
                currency=paired.currency, narrative=f"Paired office reversal: {reason}", basis=reason,
                original_transaction=paired, correlation_id=paired.correlation_id,
                invoice=paired.invoice, posted_by=user,
            )
        if original.transaction_type == LedgerTransaction.TransactionType.RETAINER_ALLOCATION:
            paired = LedgerTransaction.objects.select_for_update().filter(
                firm=firm, correlation_id=original.correlation_id,
                transaction_type=LedgerTransaction.TransactionType.RETAINER_ALLOCATION,
                direction=LedgerTransaction.Direction.DEBIT, client_funds_ledger__isnull=False,
            ).exclude(id=original.id).first()
            if not paired:
                raise ValidationError({"transaction": "The paired unallocated-funds entry is missing."})
            holding = ClientFundsLedger.objects.select_for_update().get(id=paired.client_funds_ledger_id)
            holding.cleared_balance += paired.amount
            holding.save(update_fields=["cleared_balance", "updated_at"])
            LedgerTransaction.objects.create(
                firm=firm, account=paired.account, client_funds_ledger=holding,
                matter=paired.matter, client=paired.client, engagement=paired.engagement,
                transaction_type=LedgerTransaction.TransactionType.REVERSAL,
                direction=LedgerTransaction.Direction.CREDIT, amount=paired.amount,
                currency=paired.currency, narrative=f"Paired retainer-allocation reversal: {reason}",
                basis=reason, original_transaction=paired, correlation_id=paired.correlation_id,
                posted_by=user,
            )
        if original.transaction_type == LedgerTransaction.TransactionType.RETAINER_RECEIPT and original.engagement_id:
            engagement = original.engagement
            live_total = LedgerTransaction.objects.filter(
                firm=firm, engagement=engagement,
                transaction_type=LedgerTransaction.TransactionType.RETAINER_RECEIPT,
                direction=LedgerTransaction.Direction.CREDIT, reversal_entries__isnull=True,
            ).aggregate(total=Sum("amount"))["total"] or Decimal("0")
            engagement.retainer_received = bool(engagement.required_retainer and live_total >= engagement.required_retainer)
            engagement.save(update_fields=["retainer_received", "updated_at"])
        AuditService.record(firm=firm, user=user, action="FINANCIAL_TRANSACTION_REVERSED", obj=reversal, previous={"original_transaction": original.id}, new={"direction": reversal.direction, "amount": reversal.amount}, reason=reason, correlation_id=original.correlation_id)
        return reversal


class OperationalFinanceService:
    @classmethod
    @transaction.atomic
    def create_time_entry(cls, *, user, data):
        firm = FinanceAccess.firm(user)
        matter = Case.objects.get(id=data["matter"].id, firm=firm)
        if matter.matter_status == Case.MatterStatus.ARCHIVED:
            raise ValidationError({"matter": "Archived matters are read-only."})
        if data["staff_member"].id != user.id and not (user.role == UserRole.ADMIN and firm.owner_id == user.id):
            raise PermissionDenied("Staff may only record their own time unless they are the firm owner.")
        entry = TimeEntry(firm=firm, approval_status=TimeEntry.ApprovalStatus.PENDING, **data)
        entry.full_clean()
        entry.save()
        AuditService.record(firm=firm, user=user, action="TIME_ENTRY_CREATED", obj=entry, new={"matter": matter.id, "duration_minutes": entry.duration_minutes, "billable": entry.billable})
        return entry

    @classmethod
    @transaction.atomic
    def approve_time_entry(cls, *, user, entry_id):
        firm = FinanceAccess.require(user, AccountantPermission.MANAGE_INVOICES)
        entry = TimeEntry.objects.select_for_update().get(id=entry_id, firm=firm)
        if entry.approval_status != TimeEntry.ApprovalStatus.PENDING:
            raise ValidationError({"status": "Only pending time entries may be approved."})
        if entry.staff_member_id == user.id:
            raise PermissionDenied("A staff member cannot approve their own time entry.")
        entry.approval_status = TimeEntry.ApprovalStatus.APPROVED
        entry.approved_by = user
        entry.save(update_fields=["approval_status", "approved_by", "updated_at"])
        AuditService.record(firm=firm, user=user, action="TIME_ENTRY_APPROVED", obj=entry, new={"approved_by": user.id})
        return entry

    @classmethod
    @transaction.atomic
    def create_disbursement(cls, *, user, data):
        firm = FinanceAccess.require(user, AccountantPermission.MANAGE_EXPENSES)
        matter = Case.objects.get(id=data["matter"].id, firm=firm)
        if matter.matter_status == Case.MatterStatus.ARCHIVED:
            raise ValidationError({"matter": "Archived matters are read-only."})
        evidence = data.get("evidence_document")
        if evidence and (evidence.firm_id != firm.id or evidence.client_id != matter.client_id):
            raise ValidationError({"evidence_document": "Evidence belongs to another firm or client."})
        record = Disbursement(firm=firm, created_by=user, approval_status=Disbursement.ApprovalStatus.PENDING, **data)
        record.full_clean()
        record.save()
        AuditService.record(firm=firm, user=user, action="DISBURSEMENT_CREATED", obj=record, new={"amount": record.amount, "funding_source": record.funding_source})
        return record

    @classmethod
    @transaction.atomic
    def approve_disbursement(cls, *, user, disbursement_id):
        firm = FinanceAccess.require(user, AccountantPermission.MANAGE_EXPENSES)
        record = Disbursement.objects.select_for_update().get(id=disbursement_id, firm=firm)
        if record.approval_status != Disbursement.ApprovalStatus.PENDING:
            raise ValidationError({"status": "Only pending disbursements may be approved."})
        if record.created_by_id == user.id:
            raise PermissionDenied("The disbursement maker cannot approve their own record.")
        record.approval_status = Disbursement.ApprovalStatus.APPROVED
        record.approved_by = user
        record.save(update_fields=["approval_status", "approved_by", "updated_at"])
        AuditService.record(firm=firm, user=user, action="DISBURSEMENT_APPROVED", obj=record, new={"approved_by": user.id})
        return record

    @classmethod
    @transaction.atomic
    def receive_office_money(cls, *, user, matter_id, account_id, receipt_data, allocations):
        firm = FinanceAccess.require(user, AccountantPermission.RECORD_RECEIPTS)
        matter = ClientMoneyService._matter(firm, matter_id)
        account = ClientMoneyService._account(firm, account_id, FinancialAccount.AccountType.OFFICE)
        amount = Decimal(str(receipt_data["amount_received"]))
        if sum((Decimal(str(item["amount"])) for item in allocations), Decimal("0")) != amount:
            raise ValidationError({"allocations": "Allocations must exactly equal the receipt amount."})
        proof = receipt_data.get("supporting_proof")
        if proof and (proof.firm_id != firm.id or proof.client_id != matter.client_id):
            raise ValidationError({"supporting_proof": "Supporting proof belongs to another firm or client."})
        receipt = Receipt.objects.create(firm=firm, client=matter.client, matter=matter, account=account, recorded_by=user, **receipt_data)
        correlation_id = None
        for item in allocations:
            if item["allocation_type"] != ReceiptAllocation.AllocationType.INVOICE or not item.get("invoice"):
                raise ValidationError({"allocations": "Office-money receipts must be allocated to an approved issued invoice."})
            invoice = Invoice.objects.select_for_update().get(id=item["invoice"].id, firm=firm, matter=matter, client=matter.client)
            allocation_amount = Decimal(str(item["amount"]))
            if invoice.status not in {Invoice.Status.ISSUED, Invoice.Status.PARTIALLY_PAID} or allocation_amount > invoice.balance:
                raise ValidationError({"allocations": "Invoice is not issued or the allocation exceeds its balance."})
            allocation = ReceiptAllocation.objects.create(receipt=receipt, allocation_type=item["allocation_type"], amount=allocation_amount, invoice=invoice)
            entry = LedgerTransaction.objects.create(
                firm=firm, account=account, matter=matter, client=matter.client,
                transaction_type=LedgerTransaction.TransactionType.OFFICE_RECEIPT,
                direction=LedgerTransaction.Direction.CREDIT, amount=allocation_amount,
                currency=receipt.currency, narrative=f"Office receipt {receipt.receipt_number} allocated to {invoice.invoice_number}",
                bank_reference=receipt.bank_transaction_reference, receipt=receipt, invoice=invoice,
                correlation_id=correlation_id or uuid.uuid4(), posted_by=user,
            )
            correlation_id = entry.correlation_id
            invoice.amount_paid += allocation_amount
            invoice.balance -= allocation_amount
            invoice.status = Invoice.Status.PAID if invoice.balance == 0 else Invoice.Status.PARTIALLY_PAID
            invoice.save(update_fields=["amount_paid", "balance", "status", "updated_at"])
        AuditService.record(firm=firm, user=user, action="OFFICE_MONEY_RECEIVED_AND_ALLOCATED", obj=receipt, new={"amount": amount, "allocations": allocations}, correlation_id=correlation_id)
        return receipt

    @classmethod
    @transaction.atomic
    def create_reconciliation(cls, *, user, data):
        firm = FinanceAccess.require(user, AccountantPermission.RECONCILE_ACCOUNTS)
        account = data["account"]
        if account.firm_id != firm.id:
            raise ValidationError({"account": "Account belongs to another firm."})
        credits = account.transactions.filter(posted_at__date__lte=data["period_end"], direction=LedgerTransaction.Direction.CREDIT).aggregate(total=Sum("amount"))["total"] or 0
        debits = account.transactions.filter(posted_at__date__lte=data["period_end"], direction=LedgerTransaction.Direction.DEBIT).aggregate(total=Sum("amount"))["total"] or 0
        data["ledger_balance"] = credits - debits
        data["difference"] = data["statement_balance"] - data["ledger_balance"]
        record = AccountReconciliation(firm=firm, prepared_by=user, **data)
        record.full_clean()
        record.save()
        AuditService.record(firm=firm, user=user, action="ACCOUNT_RECONCILIATION_PREPARED", obj=record, new={"period_end": record.period_end, "difference": record.difference})
        return record

    @classmethod
    @transaction.atomic
    def approve_reconciliation(cls, *, user, reconciliation_id):
        firm = FinanceAccess.require(user, AccountantPermission.RECONCILE_ACCOUNTS)
        record = AccountReconciliation.objects.select_for_update().get(id=reconciliation_id, firm=firm)
        if record.status != AccountReconciliation.Status.DRAFT:
            raise ValidationError({"status": "Only draft reconciliations may be approved."})
        if record.prepared_by_id == user.id:
            raise PermissionDenied("The reconciliation preparer cannot approve their own reconciliation.")
        if record.difference != 0:
            raise ValidationError({"difference": "An unexplained reconciliation difference cannot be approved."})
        record.status = AccountReconciliation.Status.APPROVED
        record.approved_by = user
        record.approved_at = timezone.now()
        record.save(update_fields=["status", "approved_by", "approved_at", "updated_at"])
        AuditService.record(firm=firm, user=user, action="ACCOUNT_RECONCILIATION_APPROVED", obj=record, new={"approved_by": user.id, "period_end": record.period_end})
        return record
