import { useEffect, useState } from 'react';
import useAuth from '@/core/hooks/useAuth';
import Swal from '@/core/utils/themedSwal';
import { getApiErrorMessage } from '@/core/utils/errorMessages';
import adminBillingService from '../services/adminBillingService';
import ActionModal from '@/components/ui/ActionModal';

const field = 'w-full rounded-lg border border-border-light bg-surface-light px-3 py-2 text-sm dark:border-border-dark dark:bg-surface-dark';
const button = 'rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50';
const linkButton = 'font-semibold text-brand-primary underline-offset-2 hover:underline dark:text-blue-300';
const today = new Date().toISOString().slice(0, 10);
const money = (currency, value) => `${currency || 'KES'} ${Number(value || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const PAYMENT_METHODS = [
  ['MOBILE_MONEY', 'M-Pesa / mobile money'],
  ['BANK_TRANSFER', 'Bank transfer (EFT/RTGS)'],
  ['CHEQUE', 'Cheque'],
  ['CARD', 'Card'],
  ['CASH', 'Cash'],
];

function Field({ label, children }) {
  return <label className='block text-sm'><span className='mb-1 block font-medium'>{label}</span>{children}</label>;
}

function Input({ label, ...props }) {
  return <Field label={label}><input className={field} required {...props} /></Field>;
}

function Select({ label, options, placeholder = 'Select…', required = true, ...props }) {
  return (
    <Field label={label}>
      <select className={field} required={required} {...props}>
        <option value=''>{placeholder}</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </Field>
  );
}

export default function FinanceWorkspace({ heading = 'Billing, Office Money and Client Money' }) {
  const { user } = useAuth() || {};
  const [registers, setRegisters] = useState({ matters: [], clients: [], fee_earners: [], retainer_targets: [] });
  const [invoices, setInvoices] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [disbursements, setDisbursements] = useState([]);
  const [reconciliations, setReconciliations] = useState([]);
  const [creditNotes, setCreditNotes] = useState([]);
  const [ledger, setLedger] = useState(null);
  const [busy, setBusy] = useState(false);
  const [unavailable, setUnavailable] = useState([]);
  const [invoice, setInvoice] = useState({ matter: '', invoice_number: '', invoice_date: today, due_date: '', currency: 'KES', description: '', amount: '' });
  const [receipt, setReceipt] = useState({ matter: '', account: '', receipt_number: '', amount_received: '', currency: 'KES', payment_date: today, payment_method: 'MOBILE_MONEY', bank_transaction_reference: '' });
  const [retainer, setRetainer] = useState({ target: '', account: '', receipt_number: '', amount_received: '', currency: 'KES', payment_date: today, payment_method: 'MOBILE_MONEY', bank_transaction_reference: '' });
  const [account, setAccount] = useState({ name: '', account_type: 'CLIENT', currency: 'KES', bank_name: '', account_reference: '' });
  const [payment, setPayment] = useState({ matter: '', account: '', beneficiary_name: '', beneficiary_reference: '', amount: '', currency: 'KES', purpose: '', payment_basis: '' });
  const [transfer, setTransfer] = useState({ invoice: '', client_account: '', office_account: '', amount: '', basis: '' });
  const [timeEntry, setTimeEntry] = useState({ matter: '', staff_member: '', activity: '', entry_date: today, duration_minutes: '', hourly_rate: '', billable: true, narrative: '' });
  const [disbursement, setDisbursement] = useState({ matter: '', disbursement_type: 'COURT_FEES', description: '', supplier_payee: '', amount: '', currency: 'KES', date_incurred: today, funding_source: 'FIRM', recoverable_from_client: true });
  const [officeReceipt, setOfficeReceipt] = useState({ account: '', receipt_number: '', amount_received: '', currency: 'KES', payment_date: today, payment_method: 'MOBILE_MONEY', bank_transaction_reference: '', invoice: '' });
  const [reconciliation, setReconciliation] = useState({ account: '', period_end: today, statement_balance: '', reconciliation_data: {} });
  const [credit, setCredit] = useState({ invoice: '', credit_note_number: '', credit_date: today, amount: '', reason: '' });
  const [ledgerMatter, setLedgerMatter] = useState('');
  const [modal, setModal] = useState(null);

  const load = async () => {
    const calls = [
      ['Matter register', adminBillingService.getRegisters()],
      ['Invoices', adminBillingService.getInvoices()],
      ['Accounts', adminBillingService.getAccounts()],
      ['Client-money payments', adminBillingService.getPaymentInstructions()],
      ['Time entries', adminBillingService.getTimeEntries()],
      ['Disbursements', adminBillingService.getDisbursements()],
      ['Reconciliations', adminBillingService.getReconciliations()],
      ['Credit notes', adminBillingService.getCreditNotes()],
    ];
    const results = await Promise.allSettled(calls.map(([, call]) => call));
    const value = (index) => (results[index].status === 'fulfilled' ? results[index].value : {});
    setUnavailable(calls.filter((_, index) => results[index].status === 'rejected').map(([name]) => name));
    setRegisters({ matters: [], clients: [], fee_earners: [], retainer_targets: [], ...value(0) });
    setInvoices(value(1).invoices || []); setAccounts(value(2).accounts || []);
    setPayments(value(3).payment_instructions || []); setTimeEntries(value(4).time_entries || []);
    setDisbursements(value(5).disbursements || []); setReconciliations(value(6).reconciliations || []);
    setCreditNotes(value(7).credit_notes || []);
  };

  // The initial fetch synchronizes this page with the finance API.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, []);

  const update = (setter) => (event) => setter((current) => ({ ...current, [event.target.name]: event.target.value }));
  const run = async (command, message) => {
    setBusy(true);
    try { await command(); await load(); if (message) Swal.fire('Recorded', message, 'success'); }
    catch (error) { Swal.fire('Financial control rejected', getApiErrorMessage(error), 'error'); }
    finally { setBusy(false); }
  };
  const submit = (command, message) => (event) => { event.preventDefault(); return run(command, message); };

  const matterOptions = registers.matters.map((item) => ({ value: item.id, label: `${item.case_number} · ${item.client_name} — ${item.title}` }));
  const retainerOptions = registers.retainer_targets.map((item) => ({ value: item.proposed_matter_id, label: item.label }));
  const feeEarnerOptions = registers.fee_earners.map((item) => ({ value: item.user_id, label: `${item.full_name} (${item.staff_number})` }));
  const accountOptions = (type) => accounts.filter((item) => !type || item.account_type === type).map((item) => ({ value: item.id, label: `${item.name} · ${item.account_reference}` }));
  const invoiceOptions = (statuses) => invoices.filter((item) => statuses.includes(item.status)).map((item) => ({ value: item.id, label: `${item.invoice_number} · ${item.client_name} · balance ${money(item.currency, item.balance)}` }));
  const clientForMatter = (matterId) => registers.matters.find((item) => item.id === matterId)?.client_id || '';
  const matterForInvoice = (invoiceId) => invoices.find((item) => item.id === invoiceId)?.matter || '';

  const createInvoice = submit(() => adminBillingService.createInvoice({
    client: clientForMatter(invoice.matter), matter: invoice.matter, invoice_number: invoice.invoice_number,
    invoice_date: invoice.invoice_date, due_date: invoice.due_date, currency: invoice.currency,
    line_items: [{ line_type: 'PROFESSIONAL_FEE', description: invoice.description, quantity: '1.00', unit_price: invoice.amount }],
  }), 'Draft fee note created. Submit it for independent approval before issue.');

  const action = (id, command) => run(() => adminBillingService.invoiceAction(id, command));
  const cancelInvoice = (id) => setModal({ title: 'Cancel invoice', summary: 'Available only before issue; an audit record is kept.', fields: [{ name: 'reason', label: 'Cancellation reason', type: 'textarea' }], submit: ({ reason }) => run(() => adminBillingService.invoiceAction(id, 'cancel', { reason }), 'Invoice cancelled with reason and audit history.') });
  const linkBillables = (item) => setModal({
    title: `Link approved billables to ${item.invoice_number}`,
    summary: 'Only approved time and disbursements on this matter are listed.',
    fields: [
      { name: 'time_entry_ids', label: 'Approved time entries', type: 'select', multiple: true, required: false, options: timeEntries.filter((entry) => entry.approval_status === 'APPROVED' && !entry.invoice && entry.matter === item.matter).map((entry) => ({ value: entry.id, label: `${entry.entry_date} · ${entry.activity} · ${entry.duration_minutes} min` })) },
      { name: 'disbursement_ids', label: 'Approved disbursements', type: 'select', multiple: true, required: false, options: disbursements.filter((entry) => entry.approval_status === 'APPROVED' && !entry.invoice && entry.matter === item.matter).map((entry) => ({ value: entry.id, label: `${entry.date_incurred} · ${entry.description} · ${money(entry.currency, entry.amount)}` })) },
    ],
    submit: (values) => (values.time_entry_ids?.length || values.disbursement_ids?.length
      ? run(() => adminBillingService.addInvoiceBillables(item.id, values), 'Approved billable records linked to the draft invoice.')
      : Promise.resolve()),
  });
  const inspectLedger = () => run(async () => { const data = await adminBillingService.getMatterLedger(ledgerMatter); setLedger(data.ledger); });

  return <div className='space-y-6 p-4 text-text-primary-light dark:text-text-primary-dark sm:p-6'>
    <ActionModal open={Boolean(modal)} {...modal} busy={busy} onCancel={() => setModal(null)} onSubmit={(values) => Promise.resolve(modal.submit(values)).finally(() => setModal(null))} />
    <div>
      <p className='text-xs font-semibold uppercase tracking-widest text-brand-primary'>Advocates (Accounts) Rules</p>
      <h1 className='text-2xl font-bold'>{heading}</h1>
      <p className='text-sm text-text-muted-light dark:text-text-muted-dark'>Client money and office money are kept apart. Posted entries cannot be edited or deleted; corrections use linked reversals, and approvals must come from someone other than the preparer.</p>
    </div>

    {unavailable.length > 0 && (
      <p role='status' className='rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/60 dark:text-amber-100'>
        Your finance permissions do not cover: {unavailable.join(', ')}. Ask the managing partner to grant them.
      </p>
    )}

    <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
      {[
        ['Outstanding fees', money('KES', invoices.filter((x) => ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'].includes(x.status)).reduce((sum, x) => sum + Number(x.balance || 0), 0))],
        ['Invoices awaiting approval', invoices.filter((x) => x.status === 'PENDING_APPROVAL').length],
        ['Client accounts', accounts.filter((x) => x.account_type === 'CLIENT').length],
        ['Payments awaiting checker', payments.filter((x) => x.status === 'PENDING_APPROVAL').length],
      ].map(([label, value]) => <div key={label} className='rounded-xl border p-4 dark:border-border-dark'><p className='text-sm text-text-muted-light dark:text-text-muted-dark'>{label}</p><p className='text-2xl font-bold'>{value}</p></div>)}
    </div>

    <div className='grid gap-6 xl:grid-cols-2'>
      <form onSubmit={createInvoice} className='space-y-3 rounded-xl border p-5 dark:border-border-dark'>
        <h2 className='font-semibold'>Create fee note / invoice</h2>
        <Select label='Matter' name='matter' value={invoice.matter} onChange={update(setInvoice)} options={matterOptions} placeholder='Select the matter' />
        <div className='grid gap-3 sm:grid-cols-3'>
          <Input label='Invoice number' name='invoice_number' value={invoice.invoice_number} onChange={update(setInvoice)} />
          <Input label='Invoice date' type='date' name='invoice_date' value={invoice.invoice_date} onChange={update(setInvoice)} />
          <Input label='Due date' type='date' name='due_date' value={invoice.due_date} onChange={update(setInvoice)} />
        </div>
        <Input label='Professional fees description' name='description' value={invoice.description} onChange={update(setInvoice)} />
        <Input label='Fee amount (KES, excl. VAT)' type='number' min='0' step='0.01' name='amount' value={invoice.amount} onChange={update(setInvoice)} />
        <p className='text-xs text-text-muted-light dark:text-text-muted-dark'>VAT is added from the firm&apos;s tax configuration. Link approved time and disbursements after creating the draft.</p>
        <button className={button} disabled={busy}>Create draft</button>
      </form>

      <form onSubmit={submit(() => adminBillingService.receiveClientMoney(receipt), 'Client money recorded and the matter ledger credited.')} className='space-y-3 rounded-xl border p-5 dark:border-border-dark'>
        <h2 className='font-semibold'>Record client-money receipt</h2>
        <Select label='Matter' name='matter' value={receipt.matter} onChange={update(setReceipt)} options={matterOptions} placeholder='Select the matter' />
        <Select label='Client account' name='account' value={receipt.account} onChange={update(setReceipt)} options={accountOptions('CLIENT')} placeholder='Select client bank account' />
        <div className='grid gap-3 sm:grid-cols-2'>
          <Input label='Receipt number' name='receipt_number' value={receipt.receipt_number} onChange={update(setReceipt)} />
          <Input label='Amount received' type='number' min='0' step='0.01' name='amount_received' value={receipt.amount_received} onChange={update(setReceipt)} />
          <Input label='Date received' type='date' name='payment_date' value={receipt.payment_date} onChange={update(setReceipt)} />
          <Select label='Method' name='payment_method' value={receipt.payment_method} onChange={update(setReceipt)} options={PAYMENT_METHODS.map(([value, label]) => ({ value, label }))} />
        </div>
        <Input label='M-Pesa code or bank reference' name='bank_transaction_reference' value={receipt.bank_transaction_reference} onChange={update(setReceipt)} />
        <button className={button} disabled={busy}>Credit matter client ledger</button>
      </form>
    </div>

    <section className='overflow-x-auto rounded-xl border dark:border-border-dark'>
      <table className='w-full min-w-[900px] text-left text-sm'>
        <thead><tr className='border-b dark:border-border-dark'>{['Invoice', 'Client', 'Matter', 'Due', 'Total', 'Paid', 'Credited', 'Balance', 'Status', 'Controls'].map((x) => <th className='p-3 font-medium' key={x}>{x}</th>)}</tr></thead>
        <tbody>
          {invoices.length === 0 && <tr><td className='p-3 text-text-muted-light dark:text-text-muted-dark' colSpan={10}>No fee notes yet.</td></tr>}
          {invoices.map((item) => <tr className='border-b dark:border-border-dark' key={item.id}>
            <td className='p-3 font-medium'>{item.invoice_number}</td>
            <td className='p-3'>{item.client_name}</td>
            <td className='p-3'>{item.case_number}</td>
            <td className='p-3'>{item.due_date || '—'}</td>
            <td className='p-3 tabular-nums'>{money(item.currency, item.total_amount)}</td>
            <td className='p-3 tabular-nums'>{money(item.currency, item.amount_paid)}</td>
            <td className='p-3 tabular-nums'>{money(item.currency, item.credited_amount)}</td>
            <td className='p-3 tabular-nums'>{money(item.currency, item.balance)}</td>
            <td className='p-3'>{item.status.replaceAll('_', ' ').toLowerCase()}</td>
            <td className='space-x-3 whitespace-nowrap p-3'>
              {item.status === 'DRAFT' && <><button className={linkButton} onClick={() => linkBillables(item)}>Link billables</button><button className={linkButton} onClick={() => action(item.id, 'submit')}>Submit</button></>}
              {item.status === 'PENDING_APPROVAL' && <button className={linkButton} onClick={() => action(item.id, 'approve')}>Approve</button>}
              {item.status === 'APPROVED' && <button className={linkButton} onClick={() => action(item.id, 'issue')}>Issue</button>}
              {['DRAFT', 'PENDING_APPROVAL', 'APPROVED'].includes(item.status) && <button className={linkButton} onClick={() => cancelInvoice(item.id)}>Cancel</button>}
            </td>
          </tr>)}
        </tbody>
      </table>
    </section>

    <div className='grid gap-5 xl:grid-cols-2'>
      <details className='rounded-xl border p-5 dark:border-border-dark'><summary className='cursor-pointer font-semibold'>Retainer received before the matter is opened</summary>
        <form className='mt-3 space-y-3' onSubmit={submit(() => {
          const { target, ...rest } = retainer;
          const chosen = registers.retainer_targets.find((item) => item.proposed_matter_id === target) || {};
          return adminBillingService.receivePreMatterRetainer({ ...rest, client: chosen.client_id, proposed_matter: chosen.proposed_matter_id, engagement: chosen.engagement_id });
        }, 'Retainer held as unallocated client money until the matter is opened.')}>
          <Select label='Accepted instructions' name='target' value={retainer.target} onChange={update(setRetainer)} options={retainerOptions} placeholder='Select client and proposed matter' />
          <Select label='Client account' name='account' value={retainer.account} onChange={update(setRetainer)} options={accountOptions('CLIENT')} />
          <div className='grid gap-3 sm:grid-cols-2'>
            <Input label='Receipt number' name='receipt_number' value={retainer.receipt_number} onChange={update(setRetainer)} />
            <Input label='Amount' type='number' min='0' step='0.01' name='amount_received' value={retainer.amount_received} onChange={update(setRetainer)} />
            <Input label='Date received' type='date' name='payment_date' value={retainer.payment_date} onChange={update(setRetainer)} />
            <Select label='Method' name='payment_method' value={retainer.payment_method} onChange={update(setRetainer)} options={PAYMENT_METHODS.map(([value, label]) => ({ value, label }))} />
          </div>
          <Input label='M-Pesa code or bank reference' name='bank_transaction_reference' value={retainer.bank_transaction_reference} onChange={update(setRetainer)} />
          <button disabled={busy} className={button}>Record retainer</button>
        </form>
      </details>

      <details className='rounded-xl border p-5 dark:border-border-dark'><summary className='cursor-pointer font-semibold'>Office and client bank accounts</summary>
        <form className='mt-3 space-y-3' onSubmit={submit(() => adminBillingService.createAccount(account), 'Account added to the segregated register.')}>
          <Input label='Account name' name='name' value={account.name} onChange={update(setAccount)} />
          <Input label='Bank' name='bank_name' required={false} value={account.bank_name} onChange={update(setAccount)} />
          <Input label='Account number' name='account_reference' value={account.account_reference} onChange={update(setAccount)} />
          <Select label='Type' name='account_type' value={account.account_type} onChange={update(setAccount)} options={[{ value: 'CLIENT', label: 'Client account' }, { value: 'OFFICE', label: 'Office account' }]} />
          <button disabled={busy} className={button}>Add account</button>
        </form>
        <ul className='mt-3 space-y-1 text-sm'>{accounts.map((item) => <li key={item.id}>{item.account_type === 'CLIENT' ? 'Client' : 'Office'} · {item.name} · {item.account_reference}</li>)}</ul>
      </details>

      <details className='rounded-xl border p-5 dark:border-border-dark'><summary className='cursor-pointer font-semibold'>Client-money payment instruction</summary>
        <form className='mt-3 space-y-3' onSubmit={submit(() => adminBillingService.requestPayment({ ...payment, beneficiary_details: { reference: payment.beneficiary_reference } }), 'Payment instruction sent for independent approval.')}>
          <Select label='Matter' name='matter' value={payment.matter} onChange={update(setPayment)} options={matterOptions} />
          <Select label='Client account' name='account' value={payment.account} onChange={update(setPayment)} options={accountOptions('CLIENT')} />
          <Input label='Pay to' name='beneficiary_name' value={payment.beneficiary_name} onChange={update(setPayment)} />
          <Input label='Beneficiary account / M-Pesa number' name='beneficiary_reference' value={payment.beneficiary_reference} onChange={update(setPayment)} />
          <Input label='Amount' type='number' min='0' step='0.01' name='amount' value={payment.amount} onChange={update(setPayment)} />
          <Input label='Purpose' name='purpose' value={payment.purpose} onChange={update(setPayment)} />
          <Input label='Client instruction or basis' name='payment_basis' value={payment.payment_basis} onChange={update(setPayment)} />
          <button disabled={busy} className={button}>Request payment</button>
        </form>
        <ul className='mt-3 space-y-1 text-sm'>{payments.map((item) => <li key={item.id}>{item.case_number} · {item.beneficiary_name} · {money(item.currency, item.amount)} · {item.status.replaceAll('_', ' ').toLowerCase()} {item.status === 'PENDING_APPROVAL' && <button className={linkButton} onClick={() => run(() => adminBillingService.approvePayment(item.id), 'Payment independently approved and posted.')}>Approve</button>}</li>)}</ul>
      </details>

      <details className='rounded-xl border p-5 dark:border-border-dark'><summary className='cursor-pointer font-semibold'>Transfer earned fees from client to office account</summary>
        <form className='mt-3 space-y-3' onSubmit={submit(() => adminBillingService.transferToOffice(transfer), 'Client debit and office credit posted against the issued invoice.')}>
          <Select label='Issued invoice' name='invoice' value={transfer.invoice} onChange={update(setTransfer)} options={invoiceOptions(['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'])} />
          <Select label='From client account' name='client_account' value={transfer.client_account} onChange={update(setTransfer)} options={accountOptions('CLIENT')} />
          <Select label='To office account' name='office_account' value={transfer.office_account} onChange={update(setTransfer)} options={accountOptions('OFFICE')} />
          <Input label='Amount' type='number' min='0' step='0.01' name='amount' value={transfer.amount} onChange={update(setTransfer)} />
          <Input label='Basis (e.g. client authority dated …)' name='basis' value={transfer.basis} onChange={update(setTransfer)} />
          <button disabled={busy} className={button}>Post transfer</button>
        </form>
      </details>

      <details className='rounded-xl border p-5 dark:border-border-dark'><summary className='cursor-pointer font-semibold'>Time entry</summary>
        <form className='mt-3 space-y-3' onSubmit={submit(() => adminBillingService.createTimeEntry({ ...timeEntry, staff_member: timeEntry.staff_member || user?.id }), 'Time entry submitted for approval.')}>
          <Select label='Matter' name='matter' value={timeEntry.matter} onChange={update(setTimeEntry)} options={matterOptions} />
          <Select label='Fee earner' name='staff_member' value={timeEntry.staff_member} onChange={update(setTimeEntry)} options={feeEarnerOptions} />
          <Input label='Activity' name='activity' value={timeEntry.activity} onChange={update(setTimeEntry)} />
          <div className='grid gap-3 sm:grid-cols-3'>
            <Input label='Date' type='date' name='entry_date' value={timeEntry.entry_date} onChange={update(setTimeEntry)} />
            <Input label='Minutes' type='number' min='1' name='duration_minutes' value={timeEntry.duration_minutes} onChange={update(setTimeEntry)} />
            <Input label='Hourly rate (KES)' type='number' min='0' step='0.01' name='hourly_rate' value={timeEntry.hourly_rate} onChange={update(setTimeEntry)} />
          </div>
          <Input label='Narrative' name='narrative' value={timeEntry.narrative} onChange={update(setTimeEntry)} />
          <label className='text-sm'><input type='checkbox' checked={timeEntry.billable} onChange={(event) => setTimeEntry({ ...timeEntry, billable: event.target.checked })} /> Billable</label>
          <button disabled={busy} className={button}>Record time</button>
        </form>
        <ul className='mt-3 space-y-1 text-xs'>{timeEntries.map((item) => <li key={item.id}>{item.case_number} · {item.entry_date} · {item.activity} · {item.duration_minutes} min · {item.approval_status.toLowerCase()} {item.approval_status === 'PENDING' && <button className={linkButton} onClick={() => run(() => adminBillingService.approveTimeEntry(item.id), 'Time entry approved.')}>Approve</button>}</li>)}</ul>
      </details>

      <details className='rounded-xl border p-5 dark:border-border-dark'><summary className='cursor-pointer font-semibold'>Disbursement</summary>
        <form className='mt-3 space-y-3' onSubmit={submit(() => adminBillingService.createDisbursement(disbursement), 'Disbursement submitted for approval.')}>
          <Select label='Matter' name='matter' value={disbursement.matter} onChange={update(setDisbursement)} options={matterOptions} />
          <Select label='Type' name='disbursement_type' value={disbursement.disbursement_type} onChange={update(setDisbursement)} options={[['COURT_FEES', 'Court filing fees'], ['PROCESS_SERVER', 'Process server'], ['SEARCH_FEES', 'Search fees (lands/companies)'], ['STAMP_DUTY', 'Stamp duty'], ['TRAVEL', 'Travel'], ['OTHER', 'Other']].map(([value, label]) => ({ value, label }))} />
          <Input label='Description' name='description' value={disbursement.description} onChange={update(setDisbursement)} />
          <Input label='Paid to' name='supplier_payee' value={disbursement.supplier_payee} onChange={update(setDisbursement)} />
          <div className='grid gap-3 sm:grid-cols-2'>
            <Input label='Amount' type='number' min='0' step='0.01' name='amount' value={disbursement.amount} onChange={update(setDisbursement)} />
            <Input label='Date incurred' type='date' name='date_incurred' value={disbursement.date_incurred} onChange={update(setDisbursement)} />
          </div>
          <Select label='Paid from' name='funding_source' value={disbursement.funding_source} onChange={update(setDisbursement)} options={[{ value: 'FIRM', label: 'Office money (recover on invoice)' }, { value: 'CLIENT_MONEY', label: 'Client money' }]} />
          <button disabled={busy} className={button}>Record disbursement</button>
        </form>
        <ul className='mt-3 space-y-1 text-xs'>{disbursements.map((item) => <li key={item.id}>{item.case_number} · {item.description} · {money(item.currency, item.amount)} · {item.approval_status.toLowerCase()} {item.approval_status === 'PENDING' && <button className={linkButton} onClick={() => run(() => adminBillingService.approveDisbursement(item.id), 'Disbursement approved.')}>Approve</button>}</li>)}</ul>
      </details>

      <details className='rounded-xl border p-5 dark:border-border-dark'><summary className='cursor-pointer font-semibold'>Office-money receipt against an invoice</summary>
        <form className='mt-3 space-y-3' onSubmit={submit(() => adminBillingService.receiveOfficeMoney({ ...officeReceipt, matter: matterForInvoice(officeReceipt.invoice), allocations: [{ allocation_type: 'INVOICE', amount: officeReceipt.amount_received, invoice: officeReceipt.invoice }] }), 'Office receipt allocated to the invoice.')}>
          <Select label='Invoice being paid' name='invoice' value={officeReceipt.invoice} onChange={update(setOfficeReceipt)} options={invoiceOptions(['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'])} />
          <Select label='Office account' name='account' value={officeReceipt.account} onChange={update(setOfficeReceipt)} options={accountOptions('OFFICE')} />
          <div className='grid gap-3 sm:grid-cols-2'>
            <Input label='Receipt number' name='receipt_number' value={officeReceipt.receipt_number} onChange={update(setOfficeReceipt)} />
            <Input label='Amount' type='number' min='0' step='0.01' name='amount_received' value={officeReceipt.amount_received} onChange={update(setOfficeReceipt)} />
            <Input label='Date received' type='date' name='payment_date' value={officeReceipt.payment_date} onChange={update(setOfficeReceipt)} />
            <Select label='Method' name='payment_method' value={officeReceipt.payment_method} onChange={update(setOfficeReceipt)} options={PAYMENT_METHODS.map(([value, label]) => ({ value, label }))} />
          </div>
          <Input label='M-Pesa code or bank reference' name='bank_transaction_reference' value={officeReceipt.bank_transaction_reference} onChange={update(setOfficeReceipt)} />
          <button disabled={busy} className={button}>Record and allocate</button>
        </form>
      </details>

      <details className='rounded-xl border p-5 dark:border-border-dark'><summary className='cursor-pointer font-semibold'>Credit note</summary>
        <form className='mt-3 space-y-3' onSubmit={submit(() => adminBillingService.createCreditNote(credit), 'Credit note submitted for independent approval.')}>
          <Select label='Invoice' name='invoice' value={credit.invoice} onChange={update(setCredit)} options={invoiceOptions(['ISSUED', 'PARTIALLY_PAID', 'OVERDUE', 'PAID'])} />
          <div className='grid gap-3 sm:grid-cols-3'>
            <Input label='Credit note number' name='credit_note_number' value={credit.credit_note_number} onChange={update(setCredit)} />
            <Input label='Date' type='date' name='credit_date' value={credit.credit_date} onChange={update(setCredit)} />
            <Input label='Amount' type='number' min='0' step='0.01' name='amount' value={credit.amount} onChange={update(setCredit)} />
          </div>
          <Input label='Reason' name='reason' value={credit.reason} onChange={update(setCredit)} />
          <button disabled={busy} className={button}>Create credit note</button>
        </form>
        <ul className='mt-3 space-y-1 text-xs'>{creditNotes.map((item) => <li key={item.id}>{item.credit_note_number} · {money('KES', item.amount)} · {item.status.replaceAll('_', ' ').toLowerCase()} {item.status === 'PENDING_APPROVAL' && <button className={linkButton} onClick={() => run(() => adminBillingService.creditNoteAction(item.id, 'approve'), 'Credit note approved.')}>Approve</button>} {item.status === 'APPROVED' && <button className={linkButton} onClick={() => run(() => adminBillingService.creditNoteAction(item.id, 'issue'), 'Credit note issued and invoice balance adjusted.')}>Issue</button>}</li>)}</ul>
      </details>

      <details className='rounded-xl border p-5 dark:border-border-dark'><summary className='cursor-pointer font-semibold'>Bank reconciliation</summary>
        <form className='mt-3 space-y-3' onSubmit={submit(() => adminBillingService.createReconciliation(reconciliation), 'Reconciliation prepared from the ledger.')}>
          <Select label='Account' name='account' value={reconciliation.account} onChange={update(setReconciliation)} options={accountOptions()} />
          <Input label='Period end' type='date' name='period_end' value={reconciliation.period_end} onChange={update(setReconciliation)} />
          <Input label='Bank statement balance' type='number' step='0.01' name='statement_balance' value={reconciliation.statement_balance} onChange={update(setReconciliation)} />
          <button disabled={busy} className={button}>Prepare reconciliation</button>
        </form>
        <ul className='mt-3 space-y-1 text-xs'>{reconciliations.map((item) => <li key={item.id}>{item.period_end} · difference {item.difference} · {item.status.toLowerCase()} {item.status === 'DRAFT' && <button className={linkButton} onClick={() => run(() => adminBillingService.approveReconciliation(item.id), 'Zero-difference reconciliation approved.')}>Approve</button>}</li>)}</ul>
      </details>
    </div>

    <section className='rounded-xl border p-5 dark:border-border-dark'>
      <h2 className='font-semibold'>Matter client ledger and reversals</h2>
      <div className='mt-3 flex flex-col gap-2 sm:flex-row sm:items-end'>
        <div className='flex-1'><Select label='Matter' value={ledgerMatter} onChange={(event) => setLedgerMatter(event.target.value)} options={matterOptions} required={false} /></div>
        <button disabled={!ledgerMatter || busy} className={button} onClick={inspectLedger}>Load ledger</button>
      </div>
      {ledger && <div className='mt-3'>
        <p className='font-semibold'>Cleared balance: {money(ledger.currency, ledger.cleared_balance)}</p>
        <div className='overflow-x-auto'><table className='w-full min-w-[640px] text-left text-xs'>
          <thead><tr>{['Posted', 'Type', 'Direction', 'Amount', 'Narrative', ''].map((x) => <th className='p-2 font-medium' key={x}>{x}</th>)}</tr></thead>
          <tbody>{ledger.transactions?.map((item) => <tr key={item.id}><td className='p-2'>{new Date(item.posted_at).toLocaleString('en-KE')}</td><td className='p-2'>{item.transaction_type}</td><td className='p-2'>{item.direction}</td><td className='p-2 tabular-nums'>{item.amount}</td><td className='p-2'>{item.narrative}</td><td className='p-2'>{!item.original_transaction && <button className={linkButton} onClick={() => setModal({ title: 'Reverse posted transaction', summary: `${item.transaction_type} ${item.amount} — the original stays on record.`, fields: [{ name: 'reason', label: 'Reversal reason', type: 'textarea' }], submit: ({ reason }) => run(() => adminBillingService.reverseTransaction(item.id, reason), 'Linked reversal posted; original retained.') })}>Reverse</button>}</td></tr>)}</tbody>
        </table></div>
      </div>}
    </section>
  </div>;
}
