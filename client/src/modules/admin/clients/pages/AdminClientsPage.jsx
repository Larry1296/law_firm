import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from '@/core/utils/themedSwal';

import {
  Users,
  UserCheck,
  UserPlus,
  Briefcase,
  Archive,
  RotateCcw,
  Trash2,
} from 'lucide-react';

import { useAdminClients } from '@/modules/admin/clients/hooks/useAdminClients';

import DataTable from '@/components/ui/DataTable';
import Card from '@/components/ui/Card';
import StatsCard from '@/components/ui/StatsCard';
import { Input3D } from '@/components/ui/Input3D';
import Select3D from '@/components/ui/Select3D';
import Button3D from '@/components/ui/Button3D';
import SectionHeading from '@/components/ui/SectionHeading';
import ResponsiveFilterTabs from '@/components/ui/ResponsiveFilterTabs';
import { CLIENT_CATEGORY_TABS } from '@/modules/clients/shared/clientListTabs';
import ClientCreationChooser from '@/modules/clients/shared/ClientCreationChooser';

export default function AdminClientsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [searchBy, setSearchBy] = useState('NAME');
  const [activeCategoryTab, setActiveCategoryTab] = useState('ALL');
  const [showCreationChooser, setShowCreationChooser] = useState(false);

  const {
    analytics,
    clients,
    isLoading,
    isFetching,
    refetch,
    deleteClient,
    archiveClient,
    restoreClient,
  } = useAdminClients();

  const categoryCounts = useMemo(
    () =>
      clients.reduce((counts, client) => {
        if (client.client_type) {
          counts[client.client_type] =
            (counts[client.client_type] || 0) + 1;
        }
        return counts;
      }, {}),
    [clients],
  );

  const filteredClients = useMemo(() => {
    const term = search.trim().toLowerCase();

    return clients
      .filter(
        (client) =>
          activeCategoryTab === 'ALL' ||
          client.client_type === activeCategoryTab,
      )
      .filter((client) => {
        if (!term) return true;

        const nameValues = [
          client.full_name,
          client.preferred_name,
          client.company_name,
          client.trading_name,
          client.primary_contact_name,
        ];
        const categoryValues = [
          client.client_type,
          client.client_type?.replace(/_/g, ' '),
        ];
        const genderValues = [client.gender];
        const statusValues = [
          client.lifecycle_status,
          client.lifecycle_status?.replace(/_/g, ' '),
          client.lifecycle_status === 'ARCHIVED'
            ? 'archived'
            : client.is_active
              ? 'active'
              : 'inactive',
        ];

        const matches = (values) =>
          values.some((value) => String(value || '').toLowerCase().includes(term));

        if (searchBy === 'GENDER') return matches(genderValues);
        if (searchBy === 'CATEGORY') return matches(categoryValues);
        if (searchBy === 'STATUS') return matches(statusValues);
        if (searchBy === 'ALL') {
          return matches([
            ...nameValues,
            ...genderValues,
            ...categoryValues,
            ...statusValues,
          ]);
        }
        return matches(nameValues);
      });
  }, [activeCategoryTab, clients, search, searchBy]);

  const handleDelete = async (clientId) => {
    const result = await Swal.fire({
      title: 'Delete Client?',
      text: 'This client will be permanently deleted.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Delete',
    });

    if (!result.isConfirmed) return;

    try {
      await deleteClient(clientId);

      Swal.fire({
        icon: 'success',
        title: 'Deleted',
        text: 'Client deleted successfully.',
        timer: 1800,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error?.response?.data?.detail || 'Failed to delete client.',
      });
    }
  };

  const handleArchive = async (clientId) => {
    const result = await Swal.fire({
      title: 'Archive Client?',
      text: 'This client has linked cases and will be archived instead of permanently deleted.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ca8a04',
      confirmButtonText: 'Archive',
    });

    if (!result.isConfirmed) return;

    try {
      await archiveClient(clientId);

      Swal.fire({
        icon: 'success',
        title: 'Archived',
        text: 'Client archived successfully.',
        timer: 1800,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error?.response?.data?.detail || 'Failed to archive client.',
      });
    }
  };

  const handleRestore = async (clientId) => {
    const result = await Swal.fire({
      title: 'Restore Client?',
      text: 'This client will be restored to the state they had before archiving.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Restore',
    });

    if (!result.isConfirmed) return;

    try {
      await restoreClient(clientId);

      Swal.fire({
        icon: 'success',
        title: 'Restored',
        text: 'Client restored successfully.',
        timer: 1800,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error?.response?.data?.detail || 'Failed to restore client.',
      });
    }
  };

  const renderClientType = (value) =>
    value
      ?.replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());

  const renderStatus = (value) => {
    const label = value
      ?.replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());

    return (
      <span
        className={
          value === 'ARCHIVED'
            ? 'rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800 dark:bg-red-950/40 dark:text-red-200'
            : ''
        }
      >
        {label}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-[400px] text-text-primary-light dark:text-text-primary-dark'>
        Loading clients...
      </div>
    );
  }

  const goToCreate = (type, mode) => {
    navigate(`/admin/clients/create?type=${type}&mode=${mode || ''}`);
  };

  return (
    <div className='space-y-6 p-4 md:p-6 animate-fadeIn'>
      <div className='flex flex-col items-center gap-4 text-center'>
        <SectionHeading
          title='Client Management'
          subtitle='Manage all firm clients'
          size='compact'
        />

        <div className='flex w-full flex-wrap items-center justify-between gap-3'>
          <Button3D
            variant='primary'
            onClick={() => setShowCreationChooser(true)}
          >
            + Create Client
          </Button3D>
          <Button3D onClick={refetch}>
            {isFetching ? 'Refreshing...' : 'Refresh'}
          </Button3D>
        </div>
      </div>

      <ClientCreationChooser
        open={showCreationChooser}
        onClose={() => setShowCreationChooser(false)}
        onSelect={goToCreate}
      />

      <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-7 gap-4'>
        <StatsCard
          title='Total Clients'
          value={analytics?.total_clients ?? 0}
          icon={<Users size={22} />}
          color='blue'
        />

        <StatsCard
          title='Active Clients'
          value={analytics?.active_clients ?? 0}
          icon={<UserCheck size={22} />}
          color='green'
        />

        <StatsCard
          title='Inactive Clients'
          value={analytics?.inactive_clients ?? 0}
          icon={<Users size={22} />}
          color='red'
        />

        <StatsCard
          title='Prospects'
          value={analytics?.prospects_with_access ?? 0}
          icon={<UserPlus size={22} />}
          color='purple'
        />

        <StatsCard
          title='Assisted Clients'
          value={analytics?.assisted_clients ?? 0}
          icon={<Briefcase size={22} />}
          color='yellow'
        />

        <StatsCard
          title='Archived Clients'
          value={analytics?.archived_clients ?? 0}
          icon={<Archive size={22} />}
          color='red'
        />

        <StatsCard
          title='Deleted Clients'
          value={analytics?.deleted_clients ?? 0}
          icon={<Trash2 size={22} />}
          color='red'
        />
      </div>

      <Card className='space-y-4 p-4'>
        <ResponsiveFilterTabs
          tabs={CLIENT_CATEGORY_TABS}
          activeKey={activeCategoryTab}
          onChange={setActiveCategoryTab}
          ariaLabel='Client categories'
          getCount={(tab) =>
            tab.key === 'ALL'
              ? clients.length
              : categoryCounts[tab.key] ?? 0
          }
        />

        <div className='grid grid-cols-1 gap-3 md:grid-cols-[220px_1fr] md:items-start'>
          <Select3D
            label='Search by'
            name='client_search_by'
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
              htmlFor='client-search'
              className='block pb-2 text-sm font-semibold text-text-primary-light dark:text-text-primary-dark'
            >
              Search Clients
            </label>
            <Input3D
              id='client-search'
              placeholder={
                searchBy === 'GENDER'
                  ? 'Search by gender...'
                  : searchBy === 'CATEGORY'
                    ? 'Search by category...'
                    : searchBy === 'STATUS'
                      ? 'Search active, inactive, archived, prospective, or official...'
                    : searchBy === 'ALL'
                      ? 'Search names, gender, category, or status...'
                      : 'Search clients by name...'
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </Card>

      <DataTable
        data={filteredClients}
        emptyMessage='No clients found.'
        mobileTitleKey='full_name'
        mobileSubtitleKey='client_type'
        columns={[
          { key: 'full_name', label: 'Client Name' },
          {
            key: 'client_type',
            label: 'Category',
            render: renderClientType,
          },
          {
            key: 'lifecycle_status',
            label: 'Lifecycle',
            render: renderStatus,
          },
          {
            key: 'is_active',
            label: 'Status',
            render: (value, client) => (
              <span
                className={
                  value
                    ? 'text-success font-semibold'
                    : 'text-error font-semibold'
                }
              >
                {value
                  ? 'Active'
                  : client.lifecycle_status === 'ARCHIVED'
                    ? 'Archived'
                    : 'Inactive'}
              </span>
            ),
          },
          {
            key: 'created_at',
            label: 'Created',
            render: (value) => new Date(value).toLocaleDateString(),
          },
        ]}
        actions={(client) => (
          <div className='flex gap-2 flex-wrap'>
            <Button3D
              size='sm'
              onClick={() => navigate(`/admin/clients/${client.id}`)}
            >
              View
            </Button3D>

            {client.can_restore ? (
              <Button3D
                size='sm'
                variant='success'
                onClick={() => handleRestore(client.id)}
                className='gap-2'
              >
                <RotateCcw size={15} />
                Restore
              </Button3D>
            ) : client.can_archive ? (
              <Button3D
                size='sm'
                variant='warning'
                onClick={() => handleArchive(client.id)}
                className='gap-2'
              >
                <Archive size={15} />
                Archive
              </Button3D>
            ) : client.can_hard_delete ? (
              <Button3D
                size='sm'
                variant='danger'
                onClick={() => handleDelete(client.id)}
                className='gap-2'
              >
                <Trash2 size={15} />
                Delete
              </Button3D>
            ) : null}
          </div>
        )}
      />
    </div>
  );
}
