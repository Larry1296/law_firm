import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import Card from '@/components/ui/Card';
import SectionHeading from '@/components/ui/SectionHeading';
import { getApiErrorMessage } from '@/core/utils/errorMessages';
import adminReportsService from '@/modules/admin/reports/services/adminReportsService';

const humanise = (value) => String(value || '').replaceAll('_', ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

function Changes({ previous, next }) {
  const keys = Array.from(new Set([...Object.keys(previous || {}), ...Object.keys(next || {})]));
  if (!keys.length) return <span className='text-[color:var(--text-muted)]'>—</span>;
  return (
    <dl className='space-y-0.5'>
      {keys.map((key) => (
        <div key={key} className='flex flex-wrap gap-1'>
          <dt className='font-medium'>{humanise(key)}:</dt>
          <dd>
            {previous?.[key] !== undefined && <span className='text-[color:var(--text-muted)] line-through'>{JSON.stringify(previous[key])}</span>}
            {previous?.[key] !== undefined && next?.[key] !== undefined && ' → '}
            {next?.[key] !== undefined && <span>{JSON.stringify(next[key])}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default function AdminAuditLogsPage() {
  const [search, setSearch] = useState('');
  const { data, isLoading, error } = useQuery({ queryKey: ['admin-audit-events'], queryFn: () => adminReportsService.getAuditEvents() });
  const events = useMemo(() => {
    const term = search.trim().toLowerCase();
    const all = data?.audit_events || [];
    if (!term) return all;
    return all.filter((event) => [event.action, event.user_name, event.role, event.object_type, event.reason]
      .some((value) => String(value || '').toLowerCase().includes(term)));
  }, [data, search]);

  return (
    <div className='space-y-6 p-4 sm:p-6'>
      <SectionHeading
        title='Compliance and audit log'
        subtitle='Every material action — intake, conflict decisions, KYC, engagement, matter opening, client money, closure and destruction — with who did it, when and why. Entries cannot be edited or deleted.'
        size='hero'
        as='h1'
      />
      <Card className='p-4 sm:p-6'>
        <label className='block max-w-md text-sm'>
          <span className='mb-1 block font-medium'>Filter by action, person, role or record</span>
          <input
            className='w-full rounded-lg border border-border-light bg-white px-3 py-2 text-sm dark:border-border-dark dark:bg-slate-900'
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder='e.g. MATTER_OPENED or Otieno'
          />
        </label>
        {isLoading && <p className='mt-4'>Loading the audit log…</p>}
        {error && <p className='mt-4 text-red-700 dark:text-red-300'>{getApiErrorMessage(error, 'Audit-log access is restricted to the managing partner and authorised IT staff.')}</p>}
        {!isLoading && !error && (
          <div className='mt-4 overflow-x-auto'>
            <p className='mb-2 text-sm text-[color:var(--text-muted)]'>Showing {events.length} of the latest {(data?.audit_events || []).length} events.</p>
            <table className='w-full min-w-[860px] text-left text-sm'>
              <thead className='text-[color:var(--text-muted)]'>
                <tr>{['When', 'Who', 'Action', 'Record', 'Changes', 'Reason'].map((h) => <th key={h} className='py-2 pr-3 font-medium'>{h}</th>)}</tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} className='border-t border-border-light align-top dark:border-border-dark'>
                    <td className='whitespace-nowrap py-2 pr-3'>{new Date(event.timestamp).toLocaleString('en-KE')}</td>
                    <td className='py-2 pr-3'>{event.user_name || 'System'}<br /><span className='text-xs text-[color:var(--text-muted)]'>{humanise(event.role)}</span></td>
                    <td className='py-2 pr-3 font-medium'>{humanise(event.action)}</td>
                    <td className='py-2 pr-3'>{event.object_type.split('.').pop()}</td>
                    <td className='py-2 pr-3 text-xs'><Changes previous={event.previous_values} next={event.new_values} /></td>
                    <td className='py-2 pr-3'>{event.reason || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
