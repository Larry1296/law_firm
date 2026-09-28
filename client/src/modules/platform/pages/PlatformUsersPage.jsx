import { useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';

import AuthContext from '@/core/store/AuthContext';
import { getApiErrorMessage } from '@/core/utils/errorMessages';
import platformService from '@/modules/platform/services/platformService';
import {
  Button,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Pagination,
  Panel,
  StatusBadge,
  Table,
} from '@/modules/platform/components/ui';
import { cellClass, formatDateTime, inputClass } from '@/modules/platform/components/styles';

const ROLE_OPTIONS = [
  ['', 'All roles'],
  ['ADMIN', 'Firm administrators'],
  ['STAFF', 'Firm staff'],
  ['OFFICIAL_CLIENT', 'Clients'],
  ['PROSPECT', 'Prospective clients'],
  ['PLATFORM_ADMIN', 'Platform administrators'],
];

const FIRM_ROLE_LABELS = { LAWYER: 'Advocate', SECRETARY: 'Secretary', ACCOUNTANT: 'Accountant', HR: 'HR', IT: 'IT' };

export default function PlatformUsersPage() {
  const { user: me } = useContext(AuthContext);
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ search: '', role: '', active: '' });
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState(null);
  const setFilter = (key) => (event) => {
    setFilters((current) => ({ ...current, [key]: event.target.value }));
    setPage(1);
  };

  const users = useQuery({
    queryKey: ['platform', 'users', filters, page],
    queryFn: () => platformService.getUsers({ ...filters, page }),
    placeholderData: keepPreviousData,
  });

  const toggle = async (row) => {
    setActionError(null);
    try {
      await platformService.setUserStatus(row.id, !row.is_active);
      queryClient.invalidateQueries({ queryKey: ['platform', 'users'] });
    } catch (error) {
      setActionError(getApiErrorMessage(error));
    }
  };

  const rows = users.data?.results || [];

  return (
    <>
      <PageHeader title='Users' description='Everyone who can sign in: firm owners, staff, clients and platform administrators. A deactivated user cannot sign in.' />
      {actionError && <div className='mb-4'><ErrorNotice>{actionError}</ErrorNotice></div>}

      <Panel bodyClassName='p-0'>
        <div className='flex flex-col gap-3 border-b border-border-light p-4 dark:border-border-dark md:flex-row'>
          <label className='relative flex-1'>
            <span className='sr-only'>Search users</span>
            <Search size={16} className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light' aria-hidden='true' />
            <input type='search' value={filters.search} onChange={setFilter('search')} placeholder='Search by name, email or phone' className={`${inputClass} pl-9`} />
          </label>
          <label className='md:w-56'>
            <span className='sr-only'>Role</span>
            <select value={filters.role} onChange={setFilter('role')} className={inputClass}>
              {ROLE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className='md:w-40'>
            <span className='sr-only'>Status</span>
            <select value={filters.active} onChange={setFilter('active')} className={inputClass}>
              <option value=''>Any status</option>
              <option value='true'>Active</option>
              <option value='false'>Deactivated</option>
            </select>
          </label>
        </div>

        {users.error && <div className='p-4'><ErrorNotice error={users.error} /></div>}
        {users.isLoading ? (
          <p role='status' className='p-5 text-sm text-text-muted-light'>Loading users…</p>
        ) : rows.length === 0 ? (
          <EmptyState>No users match these filters.</EmptyState>
        ) : (
          <Table caption='Users' columns={['User', 'Role', 'Firm', 'Last signed in', 'Status', '']}>
            {rows.map((row) => (
              <tr key={row.id} className='text-sm'>
                <td className={cellClass}>
                  <span className='font-semibold'>{row.full_name}</span>
                  <p className='text-xs text-text-muted-light dark:text-text-muted-dark'>{row.email}</p>
                </td>
                <td className={cellClass}>
                  {row.is_firm_owner ? 'Firm owner' : row.role_label}
                  {row.firm_role && !row.is_firm_owner && <p className='text-xs text-text-muted-light dark:text-text-muted-dark'>{FIRM_ROLE_LABELS[row.firm_role] || row.firm_role}</p>}
                </td>
                <td className={cellClass}>
                  {row.firm ? <Link to={`/platform/firms/${row.firm.id}`} className='hover:underline'>{row.firm.name}</Link> : '—'}
                </td>
                <td className={`${cellClass} whitespace-nowrap`}>{row.last_login ? formatDateTime(row.last_login) : 'Never'}</td>
                <td className={cellClass}>{row.is_active ? <StatusBadge status='ACTIVE' /> : <StatusBadge status='SUSPENDED' label='Deactivated' />}</td>
                <td className={`${cellClass} text-right`}>
                  {row.id !== me?.id && (
                    <Button variant='secondary' size='sm' onClick={() => toggle(row)}>{row.is_active ? 'Deactivate' : 'Activate'}</Button>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
        {users.data && <Pagination page={users.data.page} pageSize={users.data.page_size} count={users.data.count} onPage={setPage} />}
      </Panel>
    </>
  );
}
