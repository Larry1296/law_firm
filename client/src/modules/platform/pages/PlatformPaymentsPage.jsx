import { useState } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';

import Swal from '@/core/utils/themedSwal';
import { getApiErrorMessage } from '@/core/utils/errorMessages';
import { formatKes, formatSubscriptionDate } from '@/modules/admin/subscription/utils/subscriptionFormatting';
import platformService from '@/modules/platform/services/platformService';
import {
  Button,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Pagination,
  Panel,
  Table,
} from '@/modules/platform/components/ui';
import { cellClass, formatDateTime } from '@/modules/platform/components/styles';

const TABS = [
  ['PAYMENT_SUBMITTED', 'Awaiting confirmation'],
  ['ISSUED', 'Awaiting payment'],
  ['PAID', 'Paid'],
  ['VOID', 'Void'],
  ['', 'All'],
];

export default function PlatformPaymentsPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('PAYMENT_SUBMITTED');
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState(null);

  const invoices = useQuery({
    queryKey: ['platform', 'invoices', status, page],
    queryFn: () => platformService.getInvoices({ status, page }),
    placeholderData: keepPreviousData,
  });

  const act = async (invoice, kind) => {
    const confirm = kind === 'confirm';
    const answer = await Swal.fire({
      icon: confirm ? 'question' : 'warning',
      title: confirm ? `Confirm ${invoice.number}?` : `Void ${invoice.number}?`,
      html: confirm
        ? `Only confirm after finding M-Pesa code <strong>${invoice.mpesa_receipt || '—'}</strong> for <strong>${formatKes(invoice.total)}</strong> on the Paybill statement. The firm's subscription is extended immediately.`
        : 'The firm will need a new invoice to pay.',
      showCancelButton: true,
      confirmButtonText: confirm ? 'Confirm payment' : 'Void invoice',
    });
    if (!answer.isConfirmed) return;
    setActionError(null);
    try {
      await (confirm ? platformService.confirmInvoice(invoice.id) : platformService.voidInvoice(invoice.id));
      queryClient.invalidateQueries({ queryKey: ['platform'] });
    } catch (error) {
      setActionError(getApiErrorMessage(error));
    }
  };

  const rows = invoices.data?.results || [];

  return (
    <>
      <PageHeader
        title='Payments'
        description='Firms pay subscription invoices by M-Pesa Paybill and submit the confirmation code. Check each code against the Paybill statement before confirming it.'
      />
      {actionError && <div className='mb-4'><ErrorNotice>{actionError}</ErrorNotice></div>}

      <div role='tablist' aria-label='Invoice status' className='mb-4 flex flex-wrap gap-2'>
        {TABS.map(([value, label]) => (
          <button
            key={value || 'all'}
            role='tab'
            type='button'
            aria-selected={status === value}
            onClick={() => { setStatus(value); setPage(1); }}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${status === value ? 'bg-brand-primary text-white dark:bg-sky-700' : 'border border-border-light hover:bg-surface-light dark:border-border-dark dark:hover:bg-surface-dark'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <Panel bodyClassName='p-0'>
        {invoices.error && <div className='p-4'><ErrorNotice error={invoices.error} /></div>}
        {invoices.isLoading ? (
          <p role='status' className='p-5 text-sm text-text-muted-light'>Loading invoices…</p>
        ) : rows.length === 0 ? (
          <EmptyState>No invoices here.</EmptyState>
        ) : (
          <Table caption='Subscription invoices' columns={['Invoice', 'Firm', 'Plan', 'Total (incl. VAT)', 'M-Pesa', 'Status', '']}>
            {rows.map((invoice) => (
              <tr key={invoice.id} className='text-sm'>
                <td className={cellClass}>{invoice.number}<p className='text-xs text-text-muted-light dark:text-text-muted-dark'>{formatSubscriptionDate(invoice.created_at)}</p></td>
                <td className={cellClass}><Link to={`/platform/firms/${invoice.firm.id}`} className='hover:underline'>{invoice.firm.name}</Link></td>
                <td className={cellClass}>{invoice.plan_name}<p className='text-xs text-text-muted-light dark:text-text-muted-dark'>{invoice.billing_cycle === 'ANNUAL' ? 'Annual' : 'Monthly'}</p></td>
                <td className={`${cellClass} tabular-nums`}>{formatKes(invoice.total)}</td>
                <td className={cellClass}>
                  {invoice.mpesa_receipt ? <span className='font-mono'>{invoice.mpesa_receipt}</span> : '—'}
                  {invoice.payment_submitted_at && <p className='text-xs text-text-muted-light dark:text-text-muted-dark'>{formatDateTime(invoice.payment_submitted_at)}</p>}
                </td>
                <td className={cellClass}>{invoice.status_label}</td>
                <td className={`${cellClass} whitespace-nowrap text-right`}>
                  {['ISSUED', 'PAYMENT_SUBMITTED'].includes(invoice.status) && (
                    <div className='flex justify-end gap-2'>
                      {invoice.status === 'PAYMENT_SUBMITTED' && <Button size='sm' onClick={() => act(invoice, 'confirm')}>Confirm</Button>}
                      <Button size='sm' variant='secondary' onClick={() => act(invoice, 'void')}>Void</Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
        {invoices.data && <Pagination page={invoices.data.page} pageSize={invoices.data.page_size} count={invoices.data.count} onPage={setPage} />}
      </Panel>
    </>
  );
}
