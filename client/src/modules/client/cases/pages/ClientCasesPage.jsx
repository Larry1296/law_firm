import React from 'react';
import { useNavigate } from 'react-router-dom';

import { Briefcase, CheckCircle, Clock, FileText } from 'lucide-react';

import { useClientCases } from '@/modules/client/cases/hooks/useClientCases';
import { formatDateTime } from '@/core/utils/dateFormatter';

import Card from '@/components/ui/Card';
import StatsCard from '@/components/ui/StatsCard';
import DataTable from '@/components/ui/DataTable';
import Button3D from '@/components/ui/Button3D';
import SectionHeading from '@/components/ui/SectionHeading';
import {
  casePartyLabel,
  casePartyName,
  renderDateTime,
  renderEnum,
  renderPriorityBadge,
  renderStatusBadge,
} from '@/modules/cases/shared/casePresentation';

export default function ClientCasesPage() {
  const navigate = useNavigate();

  const { data: cases = [], isLoading: loading, refetch } = useClientCases();

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
        <SectionHeading title='My Cases' subtitle='Your active legal matters' />

        <div className='flex gap-3'>
          <Button3D onClick={refetch}>Refresh</Button3D>
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
            {
              key: 'represented_party',
              label: 'Your Party',
              render: (_, row) => casePartyName(row),
            },
            {
              key: 'represented_party_role',
              label: 'Role',
              render: (_, row) => casePartyLabel(row),
            },
            {
              key: 'status',
              label: 'Status',
              render: renderStatusBadge,
            },
            {
              key: 'priority',
              label: 'Priority',
              render: renderPriorityBadge,
            },
            { key: 'procedure_track', label: 'Procedure', render: renderEnum },
            {
              key: 'court_station',
              label: 'Court Station',
              render: (value, row) => value || row.court_name || 'Not Set',
            },
            { key: 'next_court_date', label: 'Next Date', render: renderDateTime },
            {
              key: 'created_at',
              label: 'Created',
              render: (value) => formatDateTime(value),
            },
          ]}
          actions={(caseItem) => (
            <div className='flex gap-2'>
              <Button3D
                size='sm'
                onClick={() => navigate(`/client/cases/${caseItem.id}`)}
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
