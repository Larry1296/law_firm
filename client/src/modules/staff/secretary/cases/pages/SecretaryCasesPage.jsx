import React from 'react';
import { useNavigate } from 'react-router-dom';

import { Briefcase, CheckCircle, Clock, FileText } from 'lucide-react';

import useSecretaryCases from '@/modules/staff/secretary/cases/hooks/useSecretaryCases';

import Card from '@/components/ui/Card';
import StatsCard from '@/components/ui/StatsCard';
import DataTable from '@/components/ui/DataTable';
import Button3D from '@/components/ui/Button3D';
import SectionHeading from '@/components/ui/SectionHeading';
import useSecretaryDashboard from '@/modules/staff/secretary/dashboard/hooks/useSecretaryDashboard';

const hasPermission = (permissions, permission) =>
  permissions.map((item) => String(item).toUpperCase()).includes(permission);

export default function SecretaryCasesPage() {
  const navigate = useNavigate();

  const { cases, loading, refetch } = useSecretaryCases();
  const { data: dashboardData } = useSecretaryDashboard();
  const permissions = dashboardData?.permissions || [];

  const canManageCases = hasPermission(permissions, 'MANAGE_CASES');

  const safeCases = Array.isArray(cases) ? cases : [];

  const normalize = (s) => (s || '').toLowerCase();

  const activeCases = safeCases.filter(
    (c) =>
      normalize(c.status) === 'in_progress' || normalize(c.status) === 'active',
  );

  const pendingCases = safeCases.filter(
    (c) => normalize(c.status) === 'pending',
  );

  const closedCases = safeCases.filter((c) => normalize(c.status) === 'closed');

  const renderStatus = (value) => {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      IN_PROGRESS: 'bg-blue-100 text-blue-800',
      CLOSED: 'bg-green-100 text-green-800',
      DISMISSED: 'bg-red-100 text-red-800',
      JUDGMENT_DELIVERED: 'bg-purple-100 text-purple-800',

      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      closed: 'bg-green-100 text-green-800',
      active: 'bg-blue-100 text-blue-800',
    };

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-semibold ${
          styles[value] || 'bg-gray-100 text-gray-800'
        }`}
      >
        {value}
      </span>
    );
  };

  const renderPriority = (value) => {
    const styles = {
      LOW: 'bg-green-100 text-green-800',
      MEDIUM: 'bg-yellow-100 text-yellow-800',
      HIGH: 'bg-orange-100 text-orange-800',
      URGENT: 'bg-red-100 text-red-800',

      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800',
    };

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-semibold ${
          styles[value] || 'bg-gray-100 text-gray-800'
        }`}
      >
        {value}
      </span>
    );
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <p className='text-text-muted-dark'>Loading cases...</p>
      </div>
    );
  }

  return (
    <div className='space-y-6 p-4 md:p-6 animate-fadeIn'>
      <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
        <SectionHeading
          title='Secretary Cases'
          subtitle='All assigned legal matters'
        />

        <div className='flex flex-wrap gap-3'>
          <Button3D onClick={refetch}>Refresh</Button3D>

          {canManageCases && (
            <Button3D
              variant='primary'
              onClick={() => navigate('/secretary/cases/create')}
            >
              + Create Case
            </Button3D>
          )}
        </div>
      </div>

      <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4'>
        <StatsCard
          title='Total Cases'
          value={safeCases.length}
          icon={<Briefcase size={22} />}
          color='blue'
        />

        <StatsCard
          title='Active'
          value={activeCases.length}
          icon={<CheckCircle size={22} />}
          color='green'
        />

        <StatsCard
          title='Pending'
          value={pendingCases.length}
          icon={<Clock size={22} />}
          color='yellow'
        />

        <StatsCard
          title='Closed'
          value={closedCases.length}
          icon={<FileText size={22} />}
          color='purple'
        />
      </div>

      <Card className='p-2 md:p-4'>
        <DataTable
          data={safeCases}
          mobileTitleKey='title'
          mobileSubtitleKey='case_number'
          emptyMessage='No cases available.'
          columns={[
            { key: 'case_number', label: 'Case No' },
            { key: 'title', label: 'Title' },
            { key: 'client_name', label: 'Client' },
            {
              key: 'status',
              label: 'Status',
              render: renderStatus,
            },
            {
              key: 'priority',
              label: 'Priority',
              render: renderPriority,
            },
            { key: 'court_name', label: 'Court' },
            { key: 'case_type', label: 'Type' },
          ]}
          actions={(caseItem) => (
            <div className='flex gap-2'>
              <Button3D
                size='sm'
                onClick={() => navigate(`/secretary/cases/${caseItem.id}`)}
              >
                View
              </Button3D>
            </div>
          )}
        />
      </Card>
    </div>
  );
}
