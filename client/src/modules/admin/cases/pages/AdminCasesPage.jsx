import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Swal from '@/core/utils/themedSwal';

import {
  Briefcase,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
} from 'lucide-react';

import useAdminCases from '@/modules/admin/cases/hooks/useAdminCases';

import DataTable from '@/components/ui/DataTable';
import Card from '@/components/ui/Card';
import StatsCard from '@/components/ui/StatsCard';
import { Input3D } from '@/components/ui/Input3D';
import Button3D from '@/components/ui/Button3D';
import SectionHeading from '@/components/ui/SectionHeading';

export default function AdminCasesPage() {
  const navigate = useNavigate();

  const [search, setSearch] = useState('');

  const { cases, summary, isLoading, isFetching, refetch } = useAdminCases({
    search,
  });

  const renderStatus = (value) => {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      IN_PROGRESS: 'bg-blue-100 text-blue-800',
      CLOSED: 'bg-green-100 text-green-800',
      DISMISSED: 'bg-red-100 text-red-800',
      JUDGMENT_DELIVERED: 'bg-purple-100 text-purple-800',
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

  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <p className='text-text-muted-dark'>Loading cases...</p>
      </div>
    );
  }

  return (
    <div className='space-y-6 p-4 md:p-6 animate-fadeIn'>
      {/* Header */}
      <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
        <SectionHeading
          title='Case Management'
          subtitle='Manage All Legal Cases'
        />

        <div className='flex flex-wrap gap-3'>
          <Button3D onClick={refetch}>
            {isFetching ? 'Refreshing...' : 'Refresh'}
          </Button3D>

          <Button3D
            variant='primary'
            onClick={() => navigate('/admin/cases/create')}
          >
            + Create Case
          </Button3D>
        </div>
      </div>

      {/* Stats */}
      <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4'>
        <StatsCard
          title='Total Cases'
          value={summary?.total_cases ?? 0}
          icon={<Briefcase size={22} />}
          color='blue'
        />

        <StatsCard
          title='Active Cases'
          value={summary?.active_cases ?? 0}
          icon={<CheckCircle size={22} />}
          color='green'
        />

        <StatsCard
          title='Pending'
          value={summary?.pending_cases ?? 0}
          icon={<Clock size={22} />}
          color='yellow'
        />

        <StatsCard
          title='Closed'
          value={summary?.closed_cases ?? 0}
          icon={<FileText size={22} />}
          color='purple'
        />

        <StatsCard
          title='Urgent'
          value={summary?.urgent_cases ?? 0}
          icon={<AlertTriangle size={22} />}
          color='red'
        />
      </div>

      {/* Search */}
      <Card className='p-4'>
        <Input3D
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder='Search cases...'
        />
      </Card>

      {/* Table */}
      <DataTable
        data={cases || []}
        mobileTitleKey='title'
        mobileSubtitleKey='case_number'
        emptyMessage='No cases found.'
        columns={[
          {
            key: 'case_number',
            label: 'Case No',
          },
          {
            key: 'title',
            label: 'Title',
          },
          {
            key: 'client_name',
            label: 'Plaintif',
          },
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
          {
            key: 'court_name',
            label: 'Court',
          },
          {
            key: 'is_active',
            label: 'Active',
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
        ]}
        actions={(caseItem) => (
          <div className='flex flex-wrap gap-2'>
            <Button3D
              size='sm'
              onClick={() => navigate(`/admin/cases/${caseItem.id}`)}
            >
              View
            </Button3D>
          </div>
        )}
      />
    </div>
  );
}
