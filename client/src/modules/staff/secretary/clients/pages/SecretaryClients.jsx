import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Users,
  UserCheck,
} from 'lucide-react';

import { useSecretaryClients } from '@/modules/staff/secretary/clients/hooks/useSecretaryClients';

import DataTable from '@/components/ui/DataTable';
import Card from '@/components/ui/Card';
import StatsCard from '@/components/ui/StatsCard';
import SectionHeading from '@/components/ui/SectionHeading';
import { Input3D } from '@/components/ui/Input3D';
import Select3D from '@/components/ui/Select3D';
import Button3D from '@/components/ui/Button3D';
import ResponsiveFilterTabs from '@/components/ui/ResponsiveFilterTabs';
import useSecretaryDashboard from '@/modules/staff/secretary/dashboard/hooks/useSecretaryDashboard';
import { CLIENT_CATEGORY_TABS } from '@/modules/clients/shared/clientListTabs';
import ClientCreationChooser from '@/modules/clients/shared/ClientCreationChooser';

const hasPermission = (permissions, permission) =>
  permissions.map((item) => String(item).toUpperCase()).includes(permission);

export default function SecretaryClients() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [searchBy, setSearchBy] = useState('NAME');
  const [activeCategoryTab, setActiveCategoryTab] = useState('ALL');
  const [showCreationChooser, setShowCreationChooser] = useState(false);

  const { clients = [], loading, refetch } = useSecretaryClients();
  const { data: dashboardData } = useSecretaryDashboard();
  const permissions = dashboardData?.permissions || [];
  const canManageClients = hasPermission(permissions, 'MANAGE_CLIENTS');

  const goToCreate = (type, mode) => {
    navigate(`/secretary/clients/create?type=${type}&mode=${mode || ''}`);
  };

  const categoryCounts = useMemo(
    () =>
      clients.reduce((counts, client) => {
        if (client.client_type) {
          counts[client.client_type] = (counts[client.client_type] || 0) + 1;
        }
        return counts;
      }, {}),
    [clients],
  );

  const filteredClients = useMemo(() => {
    const term = search.trim().toLowerCase();
    const matches = (values) =>
      values.some((value) =>
        String(value || '').toLowerCase().includes(term),
      );

    return clients
      .filter(
        (client) =>
          activeCategoryTab === 'ALL' ||
          client.client_type === activeCategoryTab,
      )
      .filter((client) => {
      if (!term) return true;
      const names = [
        client.full_name,
        client.preferred_name,
        client.company_name,
        client.trading_name,
        client.primary_contact_name,
      ];
      const gender = [client.gender];
      const category = [
        client.client_type,
        client.client_type?.replace(/_/g, ' '),
      ];
      const status = [
        client.lifecycle_status,
        client.lifecycle_status?.replace(/_/g, ' '),
        client.lifecycle_status === 'ARCHIVED'
          ? 'archived'
          : client.is_active
            ? 'active'
            : 'inactive',
      ];

      if (searchBy === 'GENDER') return matches(gender);
      if (searchBy === 'CATEGORY') return matches(category);
      if (searchBy === 'STATUS') return matches(status);
      if (searchBy === 'ALL') {
        return matches([...names, ...gender, ...category, ...status]);
      }
      return matches(names);
      });
  }, [activeCategoryTab, clients, search, searchBy]);

  const renderClientType = (value) => {
    if (!value) return 'Not Set';

    return value
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const renderLifecycleStatus = (value) => (
    <span className='px-2 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800'>
      {value}
    </span>
  );

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <p className='text-text-muted-dark'>Loading clients...</p>
      </div>
    );
  }

  return (
    <div className='space-y-6 p-4 md:p-6 animate-fadeIn'>
      <div className='flex flex-col items-center gap-4 text-center'>
        <SectionHeading
          title='Firm Clients'
          subtitle='Portal-enabled and staff-assisted clients managed by the firm'
          size='compact'
        />

        <div className='flex w-full flex-wrap items-center justify-between gap-3'>
          {canManageClients && (
            <Button3D
              variant='primary'
              onClick={() => setShowCreationChooser(true)}
            >
              + Create Client
            </Button3D>
          )}
          {!canManageClients && <span aria-hidden='true' />}
          <Button3D onClick={refetch}>Refresh</Button3D>
        </div>
      </div>

      <ClientCreationChooser
        open={showCreationChooser}
        onClose={() => setShowCreationChooser(false)}
        onSelect={goToCreate}
      />

      <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
        <StatsCard
          title='Total Clients'
          value={clients.length}
          icon={<Users size={22} />}
          color='blue'
        />

        <StatsCard
          title='Represented Clients'
          value={clients.filter((c) => c.is_represented).length}
          icon={<UserCheck size={22} />}
          color='green'
        />
      </div>

      <Card className='p-4'>
        <div className='grid grid-cols-1 gap-3 md:grid-cols-[220px_1fr] md:items-start'>
          <Select3D
            label='Search by'
            name='secretary_client_search_by'
            value={searchBy}
            onChange={(event) => setSearchBy(event.target.value)}
            wrapperClassName='mb-0'
            options={[
              { value: 'NAME', label: 'Name' },
              { value: 'GENDER', label: 'Gender' },
              { value: 'CATEGORY', label: 'Category' },
              { value: 'STATUS', label: 'Status' },
              { value: 'ALL', label: 'All fields' },
            ]}
          />
          <div>
            <label
              htmlFor='secretary-client-search'
              className='block pb-2 text-sm font-semibold text-text-primary-light dark:text-text-primary-dark'
            >
              Search Clients
            </label>
            <Input3D
              id='secretary-client-search'
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={
                searchBy === 'GENDER'
                  ? 'Search by gender...'
                  : searchBy === 'CATEGORY'
                    ? 'Search by category...'
                    : searchBy === 'STATUS'
                      ? 'Search by status...'
                      : searchBy === 'ALL'
                        ? 'Search names, gender, category, or status...'
                        : 'Search clients by name...'
              }
            />
          </div>
        </div>
      </Card>

      <ResponsiveFilterTabs
        tabs={CLIENT_CATEGORY_TABS}
        activeKey={activeCategoryTab}
        onChange={setActiveCategoryTab}
        getCount={(tab) =>
          tab.key === 'ALL' ? clients.length : categoryCounts[tab.key] || 0
        }
        ariaLabel='Client categories'
      />

      <DataTable
        data={filteredClients}
        mobileTitleKey='full_name'
        mobileSubtitleKey='phone_number'
        emptyMessage='No clients found.'
        columns={[
          { key: 'full_name', label: 'Client' },
          {
            key: 'email',
            label: 'Email',
            render: (value) => value || 'No portal account',
          },
          {
            key: 'phone_number',
            label: 'Phone',
            render: (value) => value || 'Not provided',
          },
          {
            key: 'client_type',
            label: 'Type',
            render: renderClientType,
          },
          {
            key: 'access_type',
            label: 'Access',
            render: renderClientType,
          },
          {
            key: 'portal_access_exists',
            label: 'Portal',
            render: (value) => (
              <span className={value ? 'text-success' : 'text-text-muted-dark'}>
                {value ? 'Enabled' : 'Not enabled'}
              </span>
            ),
          },
          {
            key: 'lifecycle_status',
            label: 'Status',
            render: renderLifecycleStatus,
          },
          {
            key: 'is_represented',
            label: 'Representation',
            render: (value) => (
              <span className={value ? 'text-success' : 'text-error'}>
                {value ? 'Represented' : 'Not Represented'}
              </span>
            ),
          },
        ]}
        actions={(client) => (
          <Button3D
            size='sm'
            onClick={() => navigate(`/secretary/clients/${client.id}`)}
          >
            View
          </Button3D>
        )}
      />
    </div>
  );
}
