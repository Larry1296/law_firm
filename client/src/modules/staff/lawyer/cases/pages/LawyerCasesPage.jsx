import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Briefcase, CheckCircle, Clock, FileText } from 'lucide-react';

import { useMyCases } from '@/modules/staff/lawyer/cases/hooks/useLawyerCases';

import StatsCard from '@/components/ui/StatsCard';
import DataTable from '@/components/ui/DataTable';
import Button3D from '@/components/ui/Button3D';
import SectionHeading from '@/components/ui/SectionHeading';
import ResponsiveFilterTabs from '@/components/ui/ResponsiveFilterTabs';
import {
  CASE_STATUS_TABS,
  caseStatusGroup,
  countCasesByStatus,
} from '@/modules/cases/shared/caseListTabs';
import {
  casePartyLabel,
  casePartyName,
  renderDateTime,
  renderEnum,
  renderPriorityBadge,
  renderStatusBadge,
} from '@/modules/cases/shared/casePresentation';

export default function LawyerCasesPage() {
  const navigate = useNavigate();
  const [activeStatusTab, setActiveStatusTab] = useState('ALL');

  const { data, isLoading, isFetching, refetch } = useMyCases();

  const cases = Array.isArray(data) ? data : [];
  const statusCounts = useMemo(() => countCasesByStatus(cases), [cases]);
  const filteredCases = useMemo(
    () =>
      activeStatusTab === 'ALL'
        ? cases
        : cases.filter(
            (caseItem) => caseStatusGroup(caseItem) === activeStatusTab,
          ),
    [activeStatusTab, cases],
  );

  const normalize = (s) => (s || '').toLowerCase();

  const activeCases = cases.filter(
    (c) =>
      normalize(c.status) === 'in_progress' || normalize(c.status) === 'active',
  );

  const pendingCases = cases.filter((c) => normalize(c.status) === 'pending');

  const closedCases = cases.filter((c) => normalize(c.status) === 'closed');

  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <p className='text-text-muted-dark'>Loading cases...</p>
      </div>
    );
  }

  return (
    <div className='w-full min-w-0 space-y-6 p-4 md:p-6 animate-fadeIn'>
      <div className='flex flex-col items-center gap-4 text-center'>
        <SectionHeading
          title='My Cases'
          subtitle='All assigned legal matters'
          size='compact'
        />

        <div className='flex w-full items-center justify-end gap-3'>
          <Button3D onClick={refetch}>
            {isFetching ? 'Refreshing...' : 'Refresh'}
          </Button3D>
        </div>
      </div>

      <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4'>
        <StatsCard
          title='Total Cases'
          value={cases.length}
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

      <ResponsiveFilterTabs
        tabs={CASE_STATUS_TABS}
        activeKey={activeStatusTab}
        onChange={setActiveStatusTab}
        getCount={(tab) => statusCounts[tab.key]}
        ariaLabel='Case statuses'
      />

      <div className='min-w-0'>
        <DataTable
          data={filteredCases}
          mobileTitleKey='title'
          fitToContainer
          emptyMessage='No cases assigned yet.'
          columns={[
            { key: 'case_number', label: 'Internal Matter Number' },
            {
              key: 'official_court_case_number',
              label: 'Official Court Case Number',
              render: (value, row) => row.court_proceeding?.official_court_case_number || value || 'Not filed / not recorded',
            },
            { key: 'title', label: 'Title' },
            {
              key: 'represented_party',
              label: 'Represented Party',
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
            { key: 'registry', label: 'Registry', render: (value) => value || 'Not Set' },
            { key: 'next_court_date', label: 'Next Date', render: renderDateTime },
          ]}
          actions={(caseItem) => (
            <div className='flex gap-2'>
              <Button3D
                size='sm'
                onClick={() => navigate(`/lawyer/cases/${caseItem.id}`)}
              >
                View
              </Button3D>
              <Button3D
                size='sm'
                variant='success'
                onClick={() => navigate(`/lawyer/cases/${caseItem.id}/ai-analysis`)}
              >
                AI Analysis
              </Button3D>
            </div>
          )}
        />
      </div>
    </div>
  );
}
