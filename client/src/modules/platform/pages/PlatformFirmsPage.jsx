import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';

import { formatSubscriptionDate } from '@/modules/admin/subscription/utils/subscriptionFormatting';
import platformService from '@/modules/platform/services/platformService';
import {
  Button,
  EmptyState,
  ErrorNotice,
  FirmAccessBadge,
  PageHeader,
  Pagination,
  Panel,
  StatusBadge,
  Table,
} from '@/modules/platform/components/ui';
import { cellClass, inputClass } from '@/modules/platform/components/styles';

const STATUS_OPTIONS = [
  ['', 'Any subscription status'],
  ['TRIALING', 'Trial'],
  ['ACTIVE', 'Active'],
  ['GRACE', 'Grace period'],
  ['EXPIRED', 'Lapsed'],
  ['SUSPENDED', 'Subscription suspended'],
  ['CANCELLED', 'Cancelled'],
];

export default function PlatformFirmsPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ search: '', plan: '', status: '', active: '' });
  const [page, setPage] = useState(1);
  const setFilter = (key) => (event) => {
    setFilters((current) => ({ ...current, [key]: event.target.value }));
    setPage(1);
  };

  const meta = useQuery({ queryKey: ['platform', 'meta'], queryFn: platformService.getMeta });
  const firms = useQuery({
    queryKey: ['platform', 'firms', filters, page],
    queryFn: () => platformService.getFirms({ ...filters, page }),
    placeholderData: keepPreviousData,
  });
  const rows = firms.data?.results || [];

  return (
    <>
      <PageHeader
        title='Law firms'
        description='Every firm registered on the platform. Open a firm to manage its subscription, access and owner.'
        actions={<Link to='/platform/firms/register'><Button>Register a firm</Button></Link>}
      />

      <Panel bodyClassName='p-0'>
        <div className='flex flex-col gap-3 border-b border-border-light p-4 dark:border-border-dark lg:flex-row'>
          <label className='relative flex-1'>
            <span className='sr-only'>Search firms</span>
            <Search size={16} className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light' aria-hidden='true' />
            <input type='search' value={filters.search} onChange={setFilter('search')} placeholder='Search by firm, registration number, owner or county' className={`${inputClass} pl-9`} />
          </label>
          <label className='lg:w-44'>
            <span className='sr-only'>Plan</span>
            <select value={filters.plan} onChange={setFilter('plan')} className={inputClass}>
              <option value=''>All plans</option>
              {(meta.data?.plans || []).map((plan) => <option key={plan.code} value={plan.code}>{plan.name}</option>)}
            </select>
          </label>
          <label className='lg:w-52'>
            <span className='sr-only'>Subscription status</span>
            <select value={filters.status} onChange={setFilter('status')} className={inputClass}>
              {STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className='lg:w-40'>
            <span className='sr-only'>Access</span>
            <select value={filters.active} onChange={setFilter('active')} className={inputClass}>
              <option value=''>Any access</option>
              <option value='true'>Access on</option>
              <option value='false'>Suspended</option>
            </select>
          </label>
        </div>

        {firms.error && <div className='p-4'><ErrorNotice error={firms.error} /></div>}
        {firms.isLoading ? (
          <p role='status' className='p-5 text-sm text-text-muted-light dark:text-text-muted-dark'>Loading firms…</p>
        ) : rows.length === 0 ? (
          <EmptyState>No firms match these filters.</EmptyState>
        ) : (
          <Table caption='Law firms' columns={['Firm', 'Owner', 'Plan', 'Subscription', 'Access', 'Registered']}>
            {rows.map((firm) => (
              <tr
                key={firm.id}
                onClick={() => navigate(`/platform/firms/${firm.id}`)}
                className='cursor-pointer text-sm hover:bg-background-light dark:hover:bg-background-dark'
              >
                <td className={cellClass}>
                  <Link to={`/platform/firms/${firm.id}`} onClick={(event) => event.stopPropagation()} className='font-semibold hover:underline'>{firm.name}</Link>
                  <p className='text-xs text-text-muted-light dark:text-text-muted-dark'>{[firm.town, firm.county].filter(Boolean).join(', ') || '—'}</p>
                </td>
                <td className={cellClass}>
                  {firm.owner_name}
                  <p className='text-xs text-text-muted-light dark:text-text-muted-dark'>{firm.owner_email}</p>
                </td>
                <td className={cellClass}>{firm.plan_name}</td>
                <td className={cellClass}><StatusBadge status={firm.subscription_status} /></td>
                <td className={cellClass}><FirmAccessBadge isActive={firm.is_active} /></td>
                <td className={`${cellClass} whitespace-nowrap`}>{formatSubscriptionDate(firm.created_at)}</td>
              </tr>
            ))}
          </Table>
        )}
        {firms.data && (
          <Pagination page={firms.data.page} pageSize={firms.data.page_size} count={firms.data.count} onPage={setPage} />
        )}
      </Panel>
    </>
  );
}
