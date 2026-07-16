import React, { useState } from 'react';
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
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

import { useAdminClients } from '@/modules/admin/clients/hooks/useAdminClients';

import DataTable from '@/components/ui/DataTable';
import Card from '@/components/ui/Card';
import StatsCard from '@/components/ui/StatsCard';
import { Input3D } from '@/components/ui/Input3D';
import Button3D from '@/components/ui/Button3D';
import SectionHeading from '@/components/ui/SectionHeading';

export default function AdminClientsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const {
    analytics,
    clients,
    isLoading,
    isFetching,
    refetch,
    deleteClient,
    archiveClient,
    restoreClient,
  } = useAdminClients({ search });

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

  const renderStatus = (value) =>
    value
      ?.replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());

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
      <div className='flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4'>
        <SectionHeading
          title='Client Management'
          subtitle='Manage all firm clients'
        />

        <div className='flex flex-wrap gap-3'>
          <Button3D onClick={refetch}>
            {isFetching ? 'Refreshing...' : 'Refresh'}
          </Button3D>

          {/* CREATE DROPDOWN */}
          <div className='relative group'>
            <Button3D variant='primary' className='flex items-center'>
              + Create Client
              <ChevronDown size={16} className='ml-2' />
            </Button3D>

            <div
              className='
                invisible opacity-0
                group-hover:visible group-hover:opacity-100
                transition-all duration-200

                absolute right-0 mt-2
                w-64

                rounded-xl shadow-2xl border z-50

                bg-surface-light dark:bg-surface-dark
                border-border-light dark:border-border-dark
              '
            >
              {/* INDIVIDUAL */}
              <div className='relative group/individual'>
                <button
                  type='button'
                  className='
                    w-full flex items-center justify-between px-4 py-3 text-left
                    text-text-primary-light dark:text-text-primary-dark
                    hover:bg-background-light dark:hover:bg-background-dark
                  '
                >
                  <span>Individual</span>
                  <ChevronRight size={16} />
                </button>

                {/* SUB MENU OPENS LEFT */}
                <div
                  className='
                    invisible opacity-0
                    group-hover/individual:visible group-hover/individual:opacity-100
                    transition-all duration-200

                    absolute top-0 right-full mr-1
                    w-56

                    rounded-xl shadow-2xl border z-50

                    bg-surface-light dark:bg-surface-dark
                    border-border-light dark:border-border-dark
                  '
                >
                  <button
                    onClick={() => goToCreate('individual', 'portal')}
                    className='
                      w-full px-4 py-3 text-left
                      text-text-primary-light dark:text-text-primary-dark
                      hover:bg-background-light dark:hover:bg-background-dark
                    '
                  >
                    Portal Enabled
                  </button>

                  <button
                    onClick={() => goToCreate('individual', 'assisted')}
                    className='
                      w-full px-4 py-3 text-left
                      text-text-primary-light dark:text-text-primary-dark
                      hover:bg-background-light dark:hover:bg-background-dark
                    '
                  >
                    Assisted Client
                  </button>
                </div>
              </div>

              {[
                ['Company', 'company'],
                ['Partnership', 'partnership'],
                ['Trust', 'trust'],
                ['NGO', 'ngo'],
                ['SACCO', 'sacco'],
                ['Cooperative', 'cooperative'],
                ['Association', 'association'],
                ['Government Institution', 'government'],
                ['School', 'school'],
                ['Religious Organization', 'religious'],
              ].map(([label, type]) => (
                <button
                  key={type}
                  onClick={() => goToCreate(type)}
                  className='
                    w-full px-4 py-3 text-left
                    text-text-primary-light dark:text-text-primary-dark
                    hover:bg-background-light dark:hover:bg-background-dark
                  '
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

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

      <Card className='p-4'>
        <Input3D
          placeholder='Search clients...'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </Card>

      <DataTable
        data={clients}
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
            render: (value) => (
              <span
                className={
                  value
                    ? 'text-success font-semibold'
                    : 'text-error font-semibold'
                }
              >
                {value ? 'Active' : 'Inactive'}
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
