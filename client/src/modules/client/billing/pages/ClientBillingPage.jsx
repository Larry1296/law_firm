import { useQuery } from '@tanstack/react-query';

import axiosInstance from '@/core/api/axios';
import Card from '@/components/ui/Card';
import SectionHeading from '@/components/ui/SectionHeading';
import { getApiErrorMessage } from '@/core/utils/errorMessages';

const money = (currency, value) => `${currency} ${Number(value || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ClientBillingPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['client-finance'],
    queryFn: async () => (await axiosInstance.get('/client/finance/')).data,
  });

  return (
    <div className='space-y-6 p-4 md:p-6'>
      <SectionHeading
        title='Fees and client account'
        subtitle='Fee notes the firm has issued to you, and money the firm holds on your behalf in its client account.'
        hero={false}
        align='left'
        size='compact'
      />
      {isLoading && <Card className='p-6'>Loading your statement…</Card>}
      {error && <Card className='p-6 text-red-700 dark:text-red-300'>{getApiErrorMessage(error, 'Could not load your statement.')}</Card>}
      {data && (
        <>
          <Card className='p-6'>
            <h2 className='font-semibold'>Money held for you</h2>
            <p className='mt-1 text-sm text-[color:var(--text-muted)]'>Client money is kept in a separate client bank account and is paid out only on your instructions or against an issued fee note.</p>
            <ul className='mt-4 space-y-2 text-sm'>
              {data.client_account.map((row) => (
                <li key={row.case_number} className='flex justify-between gap-4'><span>{row.case_number} — {row.matter_title}</span><span className='font-semibold tabular-nums'>{money(row.currency, row.balance)}</span></li>
              ))}
              {data.unallocated_funds && Number(data.unallocated_funds.balance) > 0 && (
                <li className='flex justify-between gap-4'><span>Received before your matter was opened</span><span className='font-semibold tabular-nums'>{money(data.unallocated_funds.currency, data.unallocated_funds.balance)}</span></li>
              )}
              {data.client_account.length === 0 && !data.unallocated_funds && <li className='text-[color:var(--text-muted)]'>The firm holds no money for you.</li>}
            </ul>
          </Card>
          <Card className='overflow-x-auto p-6'>
            <h2 className='font-semibold'>Fee notes</h2>
            {data.invoices.length === 0 ? (
              <p className='mt-2 text-sm text-[color:var(--text-muted)]'>No fee notes have been issued to you.</p>
            ) : (
              <table className='mt-3 w-full min-w-[720px] text-left text-sm'>
                <thead className='text-[color:var(--text-muted)]'><tr>{['Fee note', 'Matter', 'Date', 'Due', 'Total', 'Paid', 'Balance', 'Status'].map((h) => <th key={h} className='py-2 pr-3 font-medium'>{h}</th>)}</tr></thead>
                <tbody>
                  {data.invoices.map((invoice) => (
                    <tr key={invoice.id} className='border-t border-border-light dark:border-border-dark'>
                      <td className='py-2 pr-3 font-medium'>{invoice.invoice_number}</td>
                      <td className='py-2 pr-3'>{invoice.case_number}</td>
                      <td className='py-2 pr-3'>{invoice.invoice_date}</td>
                      <td className='py-2 pr-3'>{invoice.due_date || '—'}</td>
                      <td className='py-2 pr-3 tabular-nums'>{money(invoice.currency, invoice.total)}</td>
                      <td className='py-2 pr-3 tabular-nums'>{money(invoice.currency, invoice.paid)}</td>
                      <td className='py-2 pr-3 font-semibold tabular-nums'>{money(invoice.currency, invoice.balance)}</td>
                      <td className='py-2 pr-3'>{invoice.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
