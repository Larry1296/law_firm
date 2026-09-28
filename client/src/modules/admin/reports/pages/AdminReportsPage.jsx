import { useQuery } from '@tanstack/react-query';

import Card from '@/components/ui/Card';
import SectionHeading from '@/components/ui/SectionHeading';
import { getApiErrorMessage } from '@/core/utils/errorMessages';
import adminReportsService from '@/modules/admin/reports/services/adminReportsService';

const kes = (value) => `KES ${Number(value || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Stat({ label, value, tone }) {
  return (
    <Card className='p-4'>
      <p className='text-sm text-[color:var(--text-muted)]'>{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${tone === 'bad' ? 'text-red-700 dark:text-red-300' : ''}`}>{value}</p>
    </Card>
  );
}

function Breakdown({ title, rows }) {
  const max = Math.max(1, ...rows.map((row) => row.count));
  return (
    <Card className='p-5'>
      <h3 className='font-semibold'>{title}</h3>
      {rows.length === 0 && <p className='mt-2 text-sm text-[color:var(--text-muted)]'>No matters recorded.</p>}
      <ul className='mt-3 space-y-2'>
        {rows.map((row) => (
          <li key={row.key} className='text-sm'>
            <div className='flex justify-between gap-3'><span>{row.label}</span><span className='tabular-nums font-medium'>{row.count}</span></div>
            <div className='mt-1 h-1.5 rounded-full bg-gray-200 dark:bg-white/10' aria-hidden='true'>
              <div className='h-1.5 rounded-full bg-blue-600 dark:bg-blue-400' style={{ width: `${(row.count / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default function AdminReportsPage() {
  const { data, isLoading, error } = useQuery({ queryKey: ['admin-firm-report'], queryFn: adminReportsService.getFirmReport });

  if (isLoading) return <div className='flex min-h-[420px] items-center justify-center'>Building the firm report…</div>;
  if (error) return <div className='p-6 text-red-700 dark:text-red-300'>{getApiErrorMessage(error, 'Failed to load the report.')}</div>;

  const { matters, deadlines, finance, advocates, top_clients: topClients } = data;
  const maxIntake = Math.max(1, ...matters.monthly_intake.map((row) => row.count));

  return (
    <div className='space-y-8 p-4 sm:p-6'>
      <SectionHeading
        title='Reports'
        subtitle={`Firm position as at ${new Date(data.generated_at).toLocaleString('en-KE')}. Figures come only from recorded matters, deadlines, hearings and ledgers.`}
        size='hero'
        as='h1'
      />

      <section aria-labelledby='matters-heading' className='space-y-4'>
        <h2 id='matters-heading' className='text-xl font-bold'>Matters and court work</h2>
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          <Stat label='Active matters' value={matters.active} />
          <Stat label='Opened this month' value={matters.opened_this_month} />
          <Stat label='Hearings in the next 30 days' value={data.hearings_next_30_days} />
          <Stat label='Overdue deadlines' value={deadlines.overdue} tone={deadlines.overdue ? 'bad' : undefined} />
        </div>
        <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
          <Breakdown title='By matter status' rows={matters.by_status} />
          <Breakdown title='By practice area' rows={matters.by_type} />
          <Breakdown title='Active matters by court' rows={matters.by_court} />
          <Breakdown title='Active matters by court stage' rows={matters.by_court_stage} />
        </div>
        <Card className='p-5'>
          <h3 className='font-semibold'>New matters per month</h3>
          <div className='mt-4 flex h-40 items-end gap-2' role='img' aria-label='New matters opened per month for the last twelve months'>
            {matters.monthly_intake.map((row) => (
              <div key={row.month} className='flex flex-1 flex-col items-center gap-1'>
                <span className='text-xs tabular-nums'>{row.count || ''}</span>
                <div className='w-full rounded-t bg-blue-600 dark:bg-blue-400' style={{ height: `${(row.count / maxIntake) * 100}%`, minHeight: row.count ? 4 : 0 }} />
                <span className='text-[10px] text-[color:var(--text-muted)]'>{row.month.split(' ')[0]}</span>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section aria-labelledby='finance-heading' className='space-y-4'>
        <h2 id='finance-heading' className='text-xl font-bold'>Fees and client money</h2>
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-5'>
          <Stat label='Invoiced (issued)' value={kes(finance.invoiced)} />
          <Stat label='Collected' value={kes(finance.collected)} />
          <Stat label='Outstanding' value={kes(finance.outstanding)} />
          <Stat label={`Overdue (${finance.overdue_invoices} invoices)`} value={kes(finance.overdue_amount)} tone={finance.overdue_invoices ? 'bad' : undefined} />
          <Stat label='Client money held' value={kes(finance.client_money_held)} />
        </div>
      </section>

      <section aria-labelledby='people-heading' className='grid gap-4 xl:grid-cols-2'>
        <Card className='overflow-x-auto p-5'>
          <h2 id='people-heading' className='font-semibold'>Advocate workload</h2>
          <table className='mt-3 w-full min-w-[520px] text-left text-sm'>
            <thead className='text-[color:var(--text-muted)]'><tr>{['Advocate', 'Active', 'Closed', 'Hearings (30 days)', 'Overdue deadlines'].map((h) => <th key={h} className='py-2 pr-3 font-medium'>{h}</th>)}</tr></thead>
            <tbody>
              {advocates.map((row) => (
                <tr key={row.name} className='border-t border-border-light dark:border-border-dark'>
                  <td className='py-2 pr-3 font-medium'>{row.name}</td>
                  <td className='py-2 pr-3 tabular-nums'>{row.active_matters}</td>
                  <td className='py-2 pr-3 tabular-nums'>{row.closed_matters}</td>
                  <td className='py-2 pr-3 tabular-nums'>{row.hearings_next_30_days}</td>
                  <td className={`py-2 pr-3 tabular-nums ${row.overdue_deadlines ? 'font-semibold text-red-700 dark:text-red-300' : ''}`}>{row.overdue_deadlines}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card className='p-5'>
          <h2 className='font-semibold'>Clients with the most matters</h2>
          {topClients.length === 0 && <p className='mt-2 text-sm text-[color:var(--text-muted)]'>No matters recorded.</p>}
          <ol className='mt-3 space-y-1 text-sm'>
            {topClients.map((row) => <li key={row.name} className='flex justify-between'><span>{row.name}</span><span className='tabular-nums'>{row.matters}</span></li>)}
          </ol>
        </Card>
      </section>
    </div>
  );
}
