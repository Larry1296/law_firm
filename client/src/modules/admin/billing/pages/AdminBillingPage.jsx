import { useEffect, useState } from 'react';
import Swal from '@/core/utils/themedSwal';
import adminBillingService from '../services/adminBillingService';

const field = 'rounded-lg border border-border-light bg-surface-light px-3 py-2 text-sm dark:border-border-dark dark:bg-surface-dark';
const button = 'rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50';

export default function AdminBillingPage() {
  const [invoices, setInvoices] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [busy, setBusy] = useState(false);
  const [invoice, setInvoice] = useState({ client: '', matter: '', invoice_number: '', invoice_date: '', due_date: '', currency: 'KES', description: '', amount: '' });
  const [receipt, setReceipt] = useState({ matter: '', account: '', receipt_number: '', amount_received: '', currency: 'KES', payment_date: '', payment_method: 'BANK_TRANSFER', bank_transaction_reference: '' });

  const load = async () => {
    const [invoiceData, accountData, paymentData] = await Promise.all([
      adminBillingService.getInvoices(), adminBillingService.getAccounts(), adminBillingService.getPaymentInstructions(),
    ]);
    setInvoices(invoiceData.invoices || []);
    setAccounts(accountData.accounts || []);
    setPayments(paymentData.payment_instructions || []);
  };

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

  return <div className='space-y-6 p-6 text-text-primary-light dark:text-text-primary-dark'>
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
    <section className='overflow-x-auto rounded-xl border dark:border-border-dark'><table className='w-full text-left text-sm'><thead><tr className='border-b dark:border-border-dark'>{['Invoice','Matter','Total','Paid','Balance','Status','Controls'].map((x) => <th className='p-3' key={x}>{x}</th>)}</tr></thead><tbody>{invoices.map((item) => <tr className='border-b dark:border-border-dark' key={item.id}><td className='p-3'>{item.invoice_number}</td><td className='p-3'>{item.matter}</td><td className='p-3'>{item.currency} {item.total_amount}</td><td className='p-3'>{item.amount_paid}</td><td className='p-3'>{item.balance}</td><td className='p-3'>{item.status}</td><td className='space-x-2 p-3'>{item.status === 'DRAFT' && <button onClick={() => action(item.id, 'submit')}>Submit</button>}{item.status === 'PENDING_APPROVAL' && <button onClick={() => action(item.id, 'approve')}>Approve</button>}{item.status === 'APPROVED' && <button onClick={() => action(item.id, 'issue')}>Issue</button>}</td></tr>)}</tbody></table></section>
  </div>;
}
