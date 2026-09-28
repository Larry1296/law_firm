import { useState } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';

import { getApiErrorMessage } from '@/core/utils/errorMessages';
import platformService from '@/modules/platform/services/platformService';
import {
  Button,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Pagination,
  Panel,
} from '@/modules/platform/components/ui';
import { formatDateTime, inputClass } from '@/modules/platform/components/styles';

const TABS = [['NEW', 'New'], ['CONTACTED', 'Contacted'], ['REGISTERED', 'Registered'], ['DECLINED', 'Declined'], ['', 'All']];

function RequestCard({ item, onChanged }) {
  const [notes, setNotes] = useState(item.internal_notes);
  const [error, setError] = useState(null);
  const update = async (payload) => {
    setError(null);
    try {
      await platformService.updateOnboardingRequest(item.id, payload);
      onChanged();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  return (
    <li className='px-5 py-4'>
      <div className='flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between'>
        <div className='min-w-0'>
          <p className='font-semibold'>{item.firm_name}</p>
          <p className='text-sm'>{item.contact_name} · <a href={`mailto:${item.email}`} className='underline'>{item.email}</a> · <a href={`tel:${item.phone_number}`} className='underline'>{item.phone_number}</a></p>
          <p className='mt-1 text-xs text-text-muted-light dark:text-text-muted-dark'>
            {[item.county, item.advocates_count ? `${item.advocates_count} advocate${item.advocates_count === 1 ? '' : 's'}` : null, item.preferred_plan ? `prefers ${item.preferred_plan}` : null, `sent ${formatDateTime(item.created_at)}`].filter(Boolean).join(' · ')}
          </p>
          {item.message && <p className='mt-2 max-w-2xl whitespace-pre-line text-sm'>{item.message}</p>}
          {item.registered_firm && (
            <p className='mt-2 text-sm'>Registered as <Link to={`/platform/firms/${item.registered_firm}`} className='font-semibold underline'>{item.registered_firm_name}</Link></p>
          )}
        </div>
        {item.status !== 'REGISTERED' && (
          <div className='flex shrink-0 flex-wrap gap-2'>
            <Link to={`/platform/firms/register?request=${item.id}`}><Button size='sm'>Register this firm</Button></Link>
            {item.status === 'NEW' && <Button size='sm' variant='secondary' onClick={() => update({ status: 'CONTACTED' })}>Mark contacted</Button>}
            {item.status !== 'DECLINED' && <Button size='sm' variant='secondary' onClick={() => update({ status: 'DECLINED' })}>Decline</Button>}
          </div>
        )}
      </div>
      <div className='mt-3 flex max-w-2xl gap-2'>
        <label className='flex-1'>
          <span className='sr-only'>Internal notes</span>
          <input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder='Internal notes (not shared with the firm)' className={inputClass} />
        </label>
        <Button size='sm' variant='secondary' disabled={notes === item.internal_notes} onClick={() => update({ internal_notes: notes })}>Save</Button>
      </div>
      {error && <div className='mt-2'><ErrorNotice>{error}</ErrorNotice></div>}
    </li>
  );
}

export default function PlatformRequestsPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('NEW');
  const [page, setPage] = useState(1);
  const requests = useQuery({
    queryKey: ['platform', 'onboarding-requests', status, page],
    queryFn: () => platformService.getOnboardingRequests({ status, page }),
    placeholderData: keepPreviousData,
  });
  const rows = requests.data?.results || [];

  return (
    <>
      <PageHeader
        title='Onboarding requests'
        description='Firms that asked to join from the homepage. Contact them, then register the firm with its full details.'
      />
      <div role='tablist' aria-label='Request status' className='mb-4 flex flex-wrap gap-2'>
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
        {requests.error && <div className='p-4'><ErrorNotice error={requests.error} /></div>}
        {requests.isLoading ? (
          <p role='status' className='p-5 text-sm text-text-muted-light'>Loading requests…</p>
        ) : rows.length === 0 ? (
          <EmptyState>No requests here.</EmptyState>
        ) : (
          <ul className='divide-y divide-border-light dark:divide-border-dark'>
            {rows.map((item) => (
              <RequestCard key={`${item.id}-${item.status}-${item.internal_notes}`} item={item} onChanged={() => queryClient.invalidateQueries({ queryKey: ['platform'] })} />
            ))}
          </ul>
        )}
        {requests.data && <Pagination page={requests.data.page} pageSize={requests.data.page_size} count={requests.data.count} onPage={setPage} />}
      </Panel>
    </>
  );
}
