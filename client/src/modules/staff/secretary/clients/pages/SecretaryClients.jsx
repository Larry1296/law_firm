import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { Users, UserCheck } from 'lucide-react';

import { useSecretaryClients } from '@/modules/staff/secretary/clients/hooks/useSecretaryClients';

import DataTable from '@/components/ui/DataTable';
import Card from '@/components/ui/Card';
import StatsCard from '@/components/ui/StatsCard';
import SectionHeading from '@/components/ui/SectionHeading';
import { Input3D } from '@/components/ui/Input3D';
import Button3D from '@/components/ui/Button3D';
import useSecretaryDashboard from '@/modules/staff/secretary/dashboard/hooks/useSecretaryDashboard';

const hasPermission = (permissions, permission) =>
  permissions.map((item) => String(item).toUpperCase()).includes(permission);

export default function SecretaryClients() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const { clients = [], loading, refetch } = useSecretaryClients();
  const { data: dashboardData } = useSecretaryDashboard();
  const permissions = dashboardData?.permissions || [];
  const canManageClients = hasPermission(permissions, 'MANAGE_CLIENTS');

  const filteredClients = useMemo(() => {
    if (!search.trim()) return clients;

    const term = search.toLowerCase();

    return clients.filter(
      (client) =>
        client.full_name?.toLowerCase().includes(term) ||
        client.email?.toLowerCase().includes(term) ||
        client.phone_number?.toLowerCase().includes(term) ||
        client.national_id?.toLowerCase().includes(term),
    );
  }, [clients, search]);

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
      <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
        <SectionHeading
          title='Firm Clients'
          subtitle='Official clients represented by the firm'
        />

        <div className='flex flex-wrap gap-3'>
          <Button3D onClick={refetch}>Refresh</Button3D>

          {canManageClients && (
            <Button3D
              variant='primary'
              onClick={() => navigate('/secretary/clients/create')}
            >
              + Create Client
            </Button3D>
          )}
        </div>
      </div>

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
        <Input3D
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder='Search clients...'
        />
      </Card>

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
