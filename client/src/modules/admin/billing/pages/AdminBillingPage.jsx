import { useEffect, useState } from 'react';
import useAuth from '@/core/hooks/useAuth';
import Swal from '@/core/utils/themedSwal';
import adminBillingService from '../services/adminBillingService';
import ActionModal from '@/components/ui/ActionModal';

const field = 'rounded-lg border border-border-light bg-surface-light px-3 py-2 text-sm dark:border-border-dark dark:bg-surface-dark';
const button = 'rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50';
const today = new Date().toISOString().slice(0, 10);

export default function AdminBillingPage() {
  const { user } = useAuth() || {};
  const [invoices, setInvoices] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [disbursements, setDisbursements] = useState([]);
  const [reconciliations, setReconciliations] = useState([]);
  const [creditNotes, setCreditNotes] = useState([]);
  const [ledger, setLedger] = useState(null);
  const [busy, setBusy] = useState(false);
  const [invoice, setInvoice] = useState({ client: '', matter: '', invoice_number: '', invoice_date: '', due_date: '', currency: 'KES', description: '', amount: '' });
  const [receipt, setReceipt] = useState({ matter: '', account: '', receipt_number: '', amount_received: '', currency: 'KES', payment_date: '', payment_method: 'BANK_TRANSFER', bank_transaction_reference: '' });
  const [account, setAccount] = useState({ name: '', account_type: 'CLIENT', currency: 'KES', bank_name: '', account_reference: '' });
  const [payment, setPayment] = useState({ matter: '', account: '', beneficiary_name: '', beneficiary_reference: '', amount: '', currency: 'KES', purpose: '', payment_basis: '' });
  const [transfer, setTransfer] = useState({ invoice: '', client_account: '', office_account: '', amount: '', basis: '' });
  const [timeEntry, setTimeEntry] = useState({ matter: '', staff_member: user?.id || '', activity: '', entry_date: today, duration_minutes: '', hourly_rate: '', billable: true, narrative: '' });
  const [disbursement, setDisbursement] = useState({ matter: '', disbursement_type: '', description: '', supplier_payee: '', amount: '', currency: 'KES', date_incurred: today, funding_source: 'FIRM', recoverable_from_client: true });
  const [officeReceipt, setOfficeReceipt] = useState({ matter: '', account: '', receipt_number: '', amount_received: '', currency: 'KES', payment_date: today, payment_method: 'BANK_TRANSFER', bank_transaction_reference: '', invoice: '' });
  const [reconciliation, setReconciliation] = useState({ account: '', period_end: today, statement_balance: '', reconciliation_data: {} });
  const [credit, setCredit] = useState({ invoice: '', credit_note_number: '', credit_date: today, amount: '', reason: '' });
  const [ledgerMatter, setLedgerMatter] = useState('');
  const [modal, setModal] = useState(null);

  const load = async () => {
    const results = await Promise.allSettled([
      adminBillingService.getInvoices(), adminBillingService.getAccounts(), adminBillingService.getPaymentInstructions(),
      adminBillingService.getTimeEntries(), adminBillingService.getDisbursements(),
      adminBillingService.getReconciliations(), adminBillingService.getCreditNotes(),
    ]);
    const value = (index) => results[index].status === 'fulfilled' ? results[index].value : {};
    setInvoices(value(0).invoices || []); setAccounts(value(1).accounts || []);
    setPayments(value(2).payment_instructions || []); setTimeEntries(value(3).time_entries || []);
    setDisbursements(value(4).disbursements || []); setReconciliations(value(5).reconciliations || []);
    setCreditNotes(value(6).credit_notes || []);
  };

  // The initial fetch synchronizes this page with the finance API.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load().catch(() => Swal.fire('Finance unavailable', 'Check your financial permissions.', 'error')); }, []);
  const update = (setter) => (event) => setter((value) => ({ ...value, [event.target.name]: event.target.value }));

  const createInvoice = async (event) => {
    event.preventDefault(); setBusy(true);
    try {
      await adminBillingService.createInvoice({
        client: invoice.client, matter: invoice.matter, invoice_number: invoice.invoice_number,
        invoice_date: invoice.invoice_date, due_date: invoice.due_date, currency: invoice.currency,
        line_items: [{ line_type: 'PROFESSIONAL_FEE', description: invoice.description, quantity: '1.00', unit_price: invoice.amount }],
      });
      await load(); Swal.fire('Draft created', 'The fee note is awaiting submission and independent approval.', 'success');
    } catch (error) { Swal.fire('Could not create invoice', JSON.stringify(error.response?.data || {}), 'error'); }
    finally { setBusy(false); }
  };

  const receive = async (event) => {
    event.preventDefault(); setBusy(true);
    try { await adminBillingService.receiveClientMoney(receipt); await load(); Swal.fire('Client money recorded', 'The immutable matter ledger was credited.', 'success'); }
    catch (error) { Swal.fire('Receipt rejected', JSON.stringify(error.response?.data || {}), 'error'); }
    finally { setBusy(false); }
  };

  const action = async (id, command) => { setBusy(true); try { await adminBillingService.invoiceAction(id, command); await load(); } catch (error) { Swal.fire('Action rejected', JSON.stringify(error.response?.data || {}), 'error'); } finally { setBusy(false); } };
  const run = async (command, message) => { setBusy(true); try { await command(); await load(); Swal.fire('Recorded', message, 'success'); } catch (error) { Swal.fire('Financial control rejected', JSON.stringify(error.response?.data || {}), 'error'); } finally { setBusy(false); } };
  const submit = (command, message) => (event) => { event.preventDefault(); return run(command, message); };
  const openModal = (config) => setModal(config);
  const cancelInvoice = (id) => openModal({ title: 'Cancel invoice', summary: 'This is available only before issue and creates an audit record.', fields: [{ name: 'reason', label: 'Cancellation reason', type: 'textarea' }], submit: ({ reason }) => run(() => adminBillingService.invoiceAction(id, 'cancel', { reason }), 'Invoice cancelled with reason and audit history.') });
  const linkBillables = (id) => {
    openModal({ title: 'Link approved billables', summary: 'Select approved records from the firm-scoped registers.', fields: [{ name: 'time_entry_ids', label: 'Approved time entries', type: 'select', multiple: true, required: false, options: timeEntries.filter((item) => item.approval_status === 'APPROVED').map((item) => ({ value: item.id, label: `${item.entry_date} · ${item.activity} · ${item.duration_minutes} min` })) }, { name: 'disbursement_ids', label: 'Approved disbursements', type: 'select', multiple: true, required: false, options: disbursements.filter((item) => item.approval_status === 'APPROVED').map((item) => ({ value: item.id, label: `${item.date_incurred} · ${item.description} · ${item.amount}` })) }], submit: (values) => { if (values.time_entry_ids?.length || values.disbursement_ids?.length) return run(() => adminBillingService.addInvoiceBillables(id, values), 'Approved billable records linked to the draft invoice.'); return Promise.resolve(); } });
  };
  const inspectLedger = () => run(async () => { const data = await adminBillingService.getMatterLedger(ledgerMatter); setLedger(data.ledger); }, 'Matter client ledger loaded.');

  return <div className='space-y-6 p-6 text-text-primary-light dark:text-text-primary-dark'>
    <ActionModal open={Boolean(modal)} {...modal} busy={busy} onCancel={() => setModal(null)} onSubmit={(values) => Promise.resolve(modal.submit(values)).finally(() => setModal(null))} />
    <div><p className='text-xs font-semibold uppercase tracking-widest text-brand-primary'>Controlled finance</p><h1 className='text-2xl font-bold'>Billing, Office Money and Client Money</h1><p className='text-sm text-text-muted-light'>Posted entries cannot be edited or deleted. Corrections use linked reversals.</p></div>
    <div className='grid gap-4 md:grid-cols-3'>
      <div className='rounded-xl border p-4 dark:border-border-dark'><p className='text-sm text-text-muted-light'>Invoices</p><p className='text-2xl font-bold'>{invoices.length}</p></div>
      <div className='rounded-xl border p-4 dark:border-border-dark'><p className='text-sm text-text-muted-light'>Client accounts</p><p className='text-2xl font-bold'>{accounts.filter((x) => x.account_type === 'CLIENT').length}</p></div>
      <div className='rounded-xl border p-4 dark:border-border-dark'><p className='text-sm text-text-muted-light'>Payments awaiting checker</p><p className='text-2xl font-bold'>{payments.filter((x) => x.status === 'PENDING_APPROVAL').length}</p></div>
    </div>
    <div className='grid gap-6 xl:grid-cols-2'>
      <form onSubmit={createInvoice} className='space-y-3 rounded-xl border p-5 dark:border-border-dark'><h2 className='font-semibold'>Create fee note / invoice</h2>
        {['client','matter','invoice_number','invoice_date','due_date','description','amount'].map((name) => <input key={name} className={`${field} w-full`} name={name} type={name.includes('date') ? 'date' : name === 'amount' ? 'number' : 'text'} value={invoice[name]} onChange={update(setInvoice)} placeholder={name.replaceAll('_', ' ')} required />)}
        <button className={button} disabled={busy}>Create immutable draft</button>
      </form>
      <form onSubmit={receive} className='space-y-3 rounded-xl border p-5 dark:border-border-dark'><h2 className='font-semibold'>Record client-money receipt</h2>
        {['matter','receipt_number','amount_received','payment_date','bank_transaction_reference'].map((name) => <input key={name} className={`${field} w-full`} name={name} type={name === 'payment_date' ? 'date' : name === 'amount_received' ? 'number' : 'text'} value={receipt[name]} onChange={update(setReceipt)} placeholder={name.replaceAll('_', ' ')} required />)}
        <select className={`${field} w-full`} name='account' value={receipt.account} onChange={update(setReceipt)} required><option value=''>Select client account</option>{accounts.filter((x) => x.account_type === 'CLIENT').map((x) => <option key={x.id} value={x.id}>{x.name} · {x.account_reference}</option>)}</select>
        <button className={button} disabled={busy}>Credit matter client ledger</button>
      </form>
    </div>
    <section className='overflow-x-auto rounded-xl border dark:border-border-dark'><table className='w-full text-left text-sm'><thead><tr className='border-b dark:border-border-dark'>{['Invoice','Matter','Total','Paid','Credited','Balance','Status','Controls'].map((x) => <th className='p-3' key={x}>{x}</th>)}</tr></thead><tbody>{invoices.map((item) => <tr className='border-b dark:border-border-dark' key={item.id}><td className='p-3'>{item.invoice_number}</td><td className='p-3'>{item.matter}</td><td className='p-3'>{item.currency} {item.total_amount}</td><td className='p-3'>{item.amount_paid}</td><td className='p-3'>{item.credited_amount}</td><td className='p-3'>{item.balance}</td><td className='p-3'>{item.status}</td><td className='space-x-2 p-3'>{item.status === 'DRAFT' && <><button onClick={() => linkBillables(item.id)}>Link billables</button><button onClick={() => action(item.id, 'submit')}>Submit</button></>}{item.status === 'PENDING_APPROVAL' && <button onClick={() => action(item.id, 'approve')}>Approve</button>}{item.status === 'APPROVED' && <button onClick={() => action(item.id, 'issue')}>Issue</button>}{['DRAFT','PENDING_APPROVAL','APPROVED'].includes(item.status) && <button onClick={() => cancelInvoice(item.id)}>Cancel</button>}</td></tr>)}</tbody></table></section>

    <div className='grid gap-5 xl:grid-cols-2'>
      <details className='rounded-xl border p-5 dark:border-border-dark'><summary className='cursor-pointer font-semibold'>Office and client account register</summary><form className='mt-3 space-y-2' onSubmit={submit(() => adminBillingService.createAccount(account), 'Financial account added to the segregated register.')}>{['name','bank_name','account_reference'].map((name) => <input className={`${field} w-full`} key={name} name={name} required={name !== 'bank_name'} placeholder={name.replaceAll('_',' ')} value={account[name]} onChange={update(setAccount)}/>)}<select className={`${field} w-full`} name='account_type' value={account.account_type} onChange={update(setAccount)}><option>CLIENT</option><option>OFFICE</option></select><button disabled={busy} className={button}>Create account register entry</button></form></details>

      <details className='rounded-xl border p-5 dark:border-border-dark'><summary className='cursor-pointer font-semibold'>Client-money payment instruction</summary><form className='mt-3 space-y-2' onSubmit={submit(() => adminBillingService.requestPayment({ ...payment, beneficiary_details: { reference: payment.beneficiary_reference } }), 'Payment instruction sent for independent checker approval.')}>{['matter','beneficiary_name','beneficiary_reference','amount','purpose','payment_basis'].map((name) => <input className={`${field} w-full`} key={name} name={name} type={name === 'amount' ? 'number' : 'text'} required placeholder={name.replaceAll('_',' ')} value={payment[name]} onChange={update(setPayment)}/>)}<select className={`${field} w-full`} name='account' value={payment.account} onChange={update(setPayment)} required><option value=''>Client account</option>{accounts.filter((item) => item.account_type === 'CLIENT').map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button disabled={busy} className={button}>Request payment</button></form><div className='mt-3 space-y-1 text-sm'>{payments.map((item) => <p key={item.id}>{item.beneficiary_name} · {item.amount} · {item.status} {item.status === 'PENDING_APPROVAL' && <button onClick={() => run(() => adminBillingService.approvePayment(item.id), 'Payment independently checked and posted.')}>Approve</button>}</p>)}</div></details>

      <details className='rounded-xl border p-5 dark:border-border-dark'><summary className='cursor-pointer font-semibold'>Transfer earned fees from client to office money</summary><form className='mt-3 space-y-2' onSubmit={submit(() => adminBillingService.transferToOffice(transfer), 'Paired client debit and office credit posted against the approved invoice.')}>{['invoice','amount','basis'].map((name) => <input className={`${field} w-full`} key={name} name={name} type={name === 'amount' ? 'number' : 'text'} required placeholder={name.replaceAll('_',' ')} value={transfer[name]} onChange={update(setTransfer)}/>)}{['client_account','office_account'].map((name) => <select className={`${field} w-full`} key={name} name={name} value={transfer[name]} onChange={update(setTransfer)} required><option value=''>{name.replaceAll('_',' ')}</option>{accounts.filter((item) => item.account_type === (name === 'client_account' ? 'CLIENT' : 'OFFICE')).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>)}<button disabled={busy} className={button}>Post authorised transfer</button></form></details>

      <details className='rounded-xl border p-5 dark:border-border-dark'><summary className='cursor-pointer font-semibold'>Time entry</summary><form className='mt-3 space-y-2' onSubmit={submit(() => adminBillingService.createTimeEntry({ ...timeEntry, staff_member: timeEntry.staff_member || user?.id }), 'Time entry submitted for approval.')}>{['matter','activity','entry_date','duration_minutes','hourly_rate','narrative'].map((name) => <input className={`${field} w-full`} key={name} name={name} type={name === 'entry_date' ? 'date' : ['duration_minutes','hourly_rate'].includes(name) ? 'number' : 'text'} required placeholder={name.replaceAll('_',' ')} value={timeEntry[name]} onChange={update(setTimeEntry)}/>)}<label className='text-sm'><input type='checkbox' checked={timeEntry.billable} onChange={(event) => setTimeEntry({ ...timeEntry, billable: event.target.checked })}/> Billable</label><button disabled={busy} className={button}>Record time</button></form><div className='mt-2 text-xs'>{timeEntries.map((item) => <p key={item.id}>{item.activity} · {item.duration_minutes} min · {item.approval_status} {item.approval_status === 'PENDING' && <button onClick={() => run(() => adminBillingService.approveTimeEntry(item.id), 'Time entry approved.')}>Approve</button>}</p>)}</div></details>

      <details className='rounded-xl border p-5 dark:border-border-dark'><summary className='cursor-pointer font-semibold'>Disbursement</summary><form className='mt-3 space-y-2' onSubmit={submit(() => adminBillingService.createDisbursement(disbursement), 'Disbursement submitted for independent approval.')}>{['matter','disbursement_type','description','supplier_payee','amount','date_incurred'].map((name) => <input className={`${field} w-full`} key={name} name={name} type={name === 'date_incurred' ? 'date' : name === 'amount' ? 'number' : 'text'} required placeholder={name.replaceAll('_',' ')} value={disbursement[name]} onChange={update(setDisbursement)}/>)}<select className={`${field} w-full`} name='funding_source' value={disbursement.funding_source} onChange={update(setDisbursement)}><option>FIRM</option><option>CLIENT_MONEY</option></select><button disabled={busy} className={button}>Record disbursement</button></form><div className='mt-2 text-xs'>{disbursements.map((item) => <p key={item.id}>{item.description} · {item.amount} · {item.approval_status} {item.approval_status === 'PENDING' && <button onClick={() => run(() => adminBillingService.approveDisbursement(item.id), 'Disbursement approved.')}>Approve</button>}</p>)}</div></details>

      <details className='rounded-xl border p-5 dark:border-border-dark'><summary className='cursor-pointer font-semibold'>Office-money receipt and allocation</summary><form className='mt-3 space-y-2' onSubmit={submit(() => adminBillingService.receiveOfficeMoney({ ...officeReceipt, allocations: [{ allocation_type: 'INVOICE', amount: officeReceipt.amount_received, invoice: officeReceipt.invoice }] }), 'Office receipt allocated to the issued invoice.')}>{['matter','receipt_number','amount_received','payment_date','bank_transaction_reference','invoice'].map((name) => <input className={`${field} w-full`} key={name} name={name} type={name === 'payment_date' ? 'date' : name === 'amount_received' ? 'number' : 'text'} required placeholder={name.replaceAll('_',' ')} value={officeReceipt[name]} onChange={update(setOfficeReceipt)}/>)}<select className={`${field} w-full`} name='account' value={officeReceipt.account} onChange={update(setOfficeReceipt)} required><option value=''>Office account</option>{accounts.filter((item) => item.account_type === 'OFFICE').map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button disabled={busy} className={button}>Record and allocate office receipt</button></form></details>

      <details className='rounded-xl border p-5 dark:border-border-dark'><summary className='cursor-pointer font-semibold'>Credit note</summary><form className='mt-3 space-y-2' onSubmit={submit(() => adminBillingService.createCreditNote(credit), 'Credit note submitted for independent approval.')}>{['invoice','credit_note_number','credit_date','amount','reason'].map((name) => <input className={`${field} w-full`} key={name} name={name} type={name === 'credit_date' ? 'date' : name === 'amount' ? 'number' : 'text'} required placeholder={name.replaceAll('_',' ')} value={credit[name]} onChange={update(setCredit)}/>)}<button disabled={busy} className={button}>Create credit note</button></form><div className='mt-2 text-xs'>{creditNotes.map((item) => <p key={item.id}>{item.credit_note_number} · {item.amount} · {item.status} {item.status === 'PENDING_APPROVAL' && <button onClick={() => run(() => adminBillingService.creditNoteAction(item.id, 'approve'), 'Credit note approved.')}>Approve</button>} {item.status === 'APPROVED' && <button onClick={() => run(() => adminBillingService.creditNoteAction(item.id, 'issue'), 'Credit note issued and invoice balance adjusted.')}>Issue</button>}</p>)}</div></details>

      <details className='rounded-xl border p-5 dark:border-border-dark'><summary className='cursor-pointer font-semibold'>Bank reconciliation</summary><form className='mt-3 space-y-2' onSubmit={submit(() => adminBillingService.createReconciliation(reconciliation), 'Reconciliation prepared from the immutable ledger.') }><select className={`${field} w-full`} name='account' value={reconciliation.account} onChange={update(setReconciliation)} required><option value=''>Account</option>{accounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input className={`${field} w-full`} name='period_end' type='date' value={reconciliation.period_end} onChange={update(setReconciliation)}/><input className={`${field} w-full`} name='statement_balance' type='number' required placeholder='statement balance' value={reconciliation.statement_balance} onChange={update(setReconciliation)}/><button disabled={busy} className={button}>Prepare reconciliation</button></form><div className='mt-2 text-xs'>{reconciliations.map((item) => <p key={item.id}>{item.period_end} · difference {item.difference} · {item.status} {item.status === 'DRAFT' && <button onClick={() => run(() => adminBillingService.approveReconciliation(item.id), 'Zero-difference reconciliation independently approved.')}>Approve</button>}</p>)}</div></details>
    </div>

    <section className='rounded-xl border p-5 dark:border-border-dark'><h2 className='font-semibold'>Matter client ledger and reversals</h2><div className='mt-2 flex gap-2'><input className={`${field} flex-1`} value={ledgerMatter} onChange={(event) => setLedgerMatter(event.target.value)} placeholder='Select a matter from the matter register'/><button disabled={!ledgerMatter || busy} className={button} onClick={inspectLedger}>Load ledger</button></div>{ledger && <div className='mt-3'><p className='font-semibold'>Cleared balance: {ledger.currency} {ledger.cleared_balance}</p><div className='overflow-x-auto'><table className='w-full text-left text-xs'><tbody>{ledger.transactions?.map((item) => <tr key={item.id}><td className='p-2'>{item.posted_at}</td><td>{item.transaction_type}</td><td>{item.direction}</td><td>{item.amount}</td><td>{item.narrative}</td><td>{!item.original_transaction && <button onClick={() => openModal({ title: 'Reverse posted transaction', summary: `${item.transaction_type} ${item.amount} — original remains preserved.`, fields: [{ name: 'reason', label: 'Reversal reason', type: 'textarea' }], submit: ({ reason }) => run(() => adminBillingService.reverseTransaction(item.id, reason), 'Linked reversal posted; original retained.') })}>Reverse</button>}</td></tr>)}</tbody></table></div></div>}</section>
  </div>;
}
