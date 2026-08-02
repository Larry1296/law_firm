import React, { useMemo, useState } from 'react';
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
import Select3D from '@/components/ui/Select3D';
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

export default function AdminCasesPage() {
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [searchBy, setSearchBy] = useState('ALL');
  const [activeStatusTab, setActiveStatusTab] = useState('ALL');

  const { cases, summary, isLoading, isFetching, refetch } = useAdminCases();
  const safeCases = cases || [];
  const statusCounts = useMemo(() => countCasesByStatus(safeCases), [safeCases]);

  const filteredCases = useMemo(() => {
    const term = search.trim().toLowerCase();

    return safeCases
      .filter(
        (caseItem) =>
          activeStatusTab === 'ALL' ||
          caseStatusGroup(caseItem) === activeStatusTab,
      )
      .filter((caseItem) => {
      if (!term) return true;
      const caseNumber = [
        caseItem.case_number,
        caseItem.official_court_case_number,
        caseItem.court_proceeding?.official_court_case_number,
      ];
      const title = [caseItem.title];
      const client = [casePartyName(caseItem), casePartyLabel(caseItem)];
      const status = [
        caseItem.matter_status,
        caseItem.matter_status_label,
        caseItem.court_stage,
        caseItem.court_stage_label,
      ];
      const priority = [caseItem.priority];
      const matches = (values) =>
        values.some((value) =>
          String(value || '').toLowerCase().includes(term),
        );

      if (searchBy === 'CASE_NUMBER') return matches(caseNumber);
      if (searchBy === 'TITLE') return matches(title);
      if (searchBy === 'CLIENT') return matches(client);
      if (searchBy === 'STATUS') return matches(status);
      if (searchBy === 'PRIORITY') return matches(priority);
      return matches([
        ...caseNumber,
        ...title,
        ...client,
        ...status,
        ...priority,
      ]);
      });
  }, [activeStatusTab, safeCases, search, searchBy]);

  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <p className='text-text-muted-dark'>Loading cases...</p>
      </div>
    );
  }

  return (
    <div className='w-full min-w-0 space-y-6 p-4 md:p-6 animate-fadeIn'>
      {/* Header */}
      <div className='flex flex-col items-center gap-4 text-center'>
        <SectionHeading
          title='Case Management'
          subtitle='Manage All Legal Cases'
          size='compact'
        />

        <div className='flex w-full flex-wrap items-center justify-end gap-3'>
          <Button3D onClick={refetch}>
            {isFetching ? 'Refreshing...' : 'Refresh'}
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
        <div className='grid grid-cols-1 gap-3 md:grid-cols-[220px_1fr] md:items-start'>
          <Select3D
            label='Search by'
            name='case_search_by'
            value={searchBy}
            onChange={(event) => setSearchBy(event.target.value)}
            wrapperClassName='mb-0'
            options={[
              { value: 'ALL', label: 'All fields' },
              { value: 'CASE_NUMBER', label: 'Internal / official number' },
              { value: 'TITLE', label: 'Title' },
              { value: 'CLIENT', label: 'Client / party' },
              { value: 'STATUS', label: 'Status / stage' },
              { value: 'PRIORITY', label: 'Priority' },
            ]}
          />
          <div>
            <label
              htmlFor='case-search'
              className='block pb-2 text-sm font-semibold text-text-primary-light dark:text-text-primary-dark'
            >
              Search Cases
            </label>
            <Input3D
              id='case-search'
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={`Search by ${searchBy.toLowerCase().replace(/_/g, ' ')}...`}
            />
          </div>
        </div>
      </Card>

      <ResponsiveFilterTabs
        tabs={CASE_STATUS_TABS}
        activeKey={activeStatusTab}
        onChange={setActiveStatusTab}
        getCount={(tab) => statusCounts[tab.key]}
        ariaLabel='Case statuses'
      />

      {/* Table */}
      <div className='min-w-0'>
        <DataTable
          data={filteredCases}
          mobileTitleKey='title'
          fitToContainer
          emptyMessage='No cases found.'
          columns={[
          {
            key: 'case_number',
            label: 'Internal Matter Number',
          },
          {
            key: 'official_court_case_number',
            label: 'Official Court Case Number',
            render: (value, row) => row.court_proceeding?.official_court_case_number || value || 'Not filed / not recorded',
          },
          {
            key: 'title',
            label: 'Title',
          },
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
            key: 'matter_status',
            label: 'Matter Status',
            render: (value, row) => renderStatusBadge(row.matter_status_label || value),
          },
          {
            key: 'court_stage',
            label: 'Court Stage',
            render: (value, row) => renderStatusBadge(row.court_stage_label || value),
          },
          {
            key: 'priority',
            label: 'Priority',
            render: renderPriorityBadge,
          },
          {
            key: 'procedure_track',
            label: 'Procedure',
            render: renderEnum,
          },
          {
            key: 'court_station',
            label: 'Court Station',
            render: (value, row) => value || row.court_name || 'Not Set',
          },
          {
            key: 'registry',
            label: 'Registry',
            render: (value) => value || 'Not Set',
          },
          {
            key: 'next_court_date',
            label: 'Next Date',
            render: renderDateTime,
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
    </div>
  );
}
