import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import BackLink from '@/components/ui/BackLink';
import adminBillingService from '@/modules/admin/billing/services/adminBillingService';

export default function AdminClientBillingPage() {
  const { id } = useParams();
  const { data, isLoading, error } = useQuery({ queryKey: ['client-invoices', id], queryFn: () => adminBillingService.getInvoices({ client: id }) });
  const invoices = data?.invoices || [];
  return <div className='space-y-5 p-6'><BackLink label='Back to Client' fallbackPath={`/admin/clients/${id}`} /><div><p className='text-xs font-semibold uppercase tracking-widest text-brand-primary'>Client finance</p><h1 className='text-2xl font-bold'>Fee Notes, Invoices and Balances</h1></div>{isLoading && <p>Loading financial records…</p>}{error && <p className='text-error'>Financial records are restricted or unavailable.</p>}<div className='overflow-x-auto rounded-xl border dark:border-border-dark'><table className='w-full text-left text-sm'><thead><tr>{['Invoice','Date','Due','Total','Paid','Balance','Status'].map((x) => <th className='p-3' key={x}>{x}</th>)}</tr></thead><tbody>{invoices.map((item) => <tr className='border-t dark:border-border-dark' key={item.id}><td className='p-3'>{item.invoice_number}</td><td className='p-3'>{item.invoice_date}</td><td className='p-3'>{item.due_date}</td><td className='p-3'>{item.currency} {item.total_amount}</td><td className='p-3'>{item.amount_paid}</td><td className='p-3'>{item.balance}</td><td className='p-3'>{item.status}</td></tr>)}</tbody></table></div><p className='text-sm text-text-muted-light'>Client money is maintained separately in matter-specific ledgers and is not treated as earned office money.</p></div>;
}
