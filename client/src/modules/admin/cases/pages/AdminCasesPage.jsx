import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, ChevronRight, RefreshCw, Scale, Search } from 'lucide-react';

import useAdminCases from '@/modules/admin/cases/hooks/useAdminCases';

import Card from '@/components/ui/Card';
import ResponsiveFilterTabs from '@/components/ui/ResponsiveFilterTabs';
import {
  CASE_STATUS_TABS,
  caseStatusGroup,
  countCasesByStatus,
} from '@/modules/cases/shared/caseListTabs';
import {
  casePartyLabel,
  casePartyName,
  renderPriorityBadge,
  renderStatusBadge,
} from '@/modules/cases/shared/casePresentation';
import { formatDateTime } from '@/core/utils/dateFormatter';

const officialNumber = (caseItem) =>
  caseItem.court_proceeding?.official_court_case_number || caseItem.official_court_case_number || '';

// A matter's court position says the most: "Not filed", "Pleadings open"; a closed matter just says closed.
const positionLabel = (caseItem) => (caseStatusGroup(caseItem) === 'CLOSED'
  ? caseItem.matter_status_label || caseItem.matter_status
  : caseItem.court_stage_label || caseItem.court_stage || caseItem.matter_status_label);

const searchableText = (caseItem) => [
  caseItem.case_number,
  officialNumber(caseItem),
  caseItem.title,
  casePartyName(caseItem),
  caseItem.court_name,
  caseItem.court_station,
  caseItem.matter_status_label,
  caseItem.court_stage_label,
].filter(Boolean).join(' ').toLowerCase();

const inNextDays = (value, days) => {
  if (!value) return false;
  const when = new Date(value).getTime();
  const now = Date.now();
  return when >= now && when <= now + days * 24 * 60 * 60 * 1000;
};

function Tally({ label, value, tone = '' }) {
  return (
    <div className='rounded-xl border border-border-light bg-surface-light px-4 py-3 dark:border-border-dark dark:bg-surface-dark'>
      <p className={`text-2xl font-semibold ${tone || 'text-text-primary-light dark:text-text-primary-dark'}`}>{value}</p>
      <p className='text-xs font-medium uppercase tracking-wide text-text-muted-light dark:text-text-muted-dark'>{label}</p>
    </div>
  );
}

function MatterRow({ caseItem, onOpen }) {
  const number = officialNumber(caseItem);
  const court = caseItem.court_name || caseItem.court_station;
  const party = casePartyName(caseItem);
  const role = casePartyLabel(caseItem);

  return (
    <button
      type='button'
      onClick={onOpen}
      className='group grid w-full gap-3 px-5 py-4 text-left transition hover:bg-brand-primary/5 md:grid-cols-[minmax(0,2.2fr)_minmax(0,1.4fr)_auto_auto] md:items-center'
    >
      <div className='min-w-0'>
        <p className='truncate font-semibold text-text-primary-light dark:text-text-primary-dark'>{caseItem.title}</p>
        <p className='mt-0.5 truncate text-sm text-text-muted-light dark:text-text-muted-dark'>
          <span className='font-mono text-xs'>{caseItem.case_number}</span>
          {party && <> · {party}{role ? ` (${role})` : ''}</>}
        </p>
      </div>

      <div className='min-w-0 text-sm'>
        {court && (
          <p className='flex items-center gap-1.5 truncate text-text-primary-light dark:text-text-primary-dark'>
            <Scale size={14} className='shrink-0 text-text-muted-light dark:text-text-muted-dark' aria-hidden='true' />
            <span className='truncate'>{court}</span>
          </p>
        )}
        <p className='mt-0.5 truncate text-text-muted-light dark:text-text-muted-dark'>
          {number || 'No court number yet'}
          {caseItem.next_court_date && (
            <span className='ml-2 inline-flex items-center gap-1'>
              <CalendarDays size={13} aria-hidden='true' />
              {formatDateTime(caseItem.next_court_date)}
            </span>
          )}
        </p>
      </div>

      <div className='flex flex-wrap items-center gap-2'>
        {renderStatusBadge(positionLabel(caseItem))}
        {renderPriorityBadge(caseItem.priority)}
      </div>

      <ChevronRight
        size={18}
        aria-hidden='true'
        className='hidden text-text-muted-light transition group-hover:translate-x-0.5 group-hover:text-brand-primary dark:text-text-muted-dark md:block'
      />
    </button>
  );
}

export default function AdminCasesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activeStatusTab, setActiveStatusTab] = useState('ALL');

  const { cases, isLoading, isFetching, refetch } = useAdminCases();
  const safeCases = useMemo(() => cases || [], [cases]);
  const statusCounts = useMemo(() => countCasesByStatus(safeCases), [safeCases]);

  const tallies = useMemo(() => {
    const open = safeCases.filter((item) => caseStatusGroup(item) === 'ACTIVE');
    return {
      open: open.length,
      notFiled: open.filter((item) => !officialNumber(item)).length,
      thisWeek: open.filter((item) => inNextDays(item.next_court_date, 7)).length,
      urgent: open.filter((item) => ['URGENT', 'HIGH'].includes(String(item.priority).toUpperCase())).length,
    };
  }, [safeCases]);

  const filteredCases = useMemo(() => {
    const term = search.trim().toLowerCase();
    return safeCases
      .filter((item) => activeStatusTab === 'ALL' || caseStatusGroup(item) === activeStatusTab)
      .filter((item) => !term || searchableText(item).includes(term));
  }, [activeStatusTab, safeCases, search]);

  if (isLoading) {
    return (
      <div className='flex min-h-[400px] items-center justify-center'>
        <p className='text-text-muted-light dark:text-text-muted-dark'>Loading matters...</p>
      </div>
    );
  }

  return (
    <div className='w-full min-w-0 space-y-5 p-4 md:p-6 animate-fadeIn'>
      <div className='flex items-end justify-between gap-3'>
        <div>
          <h1 className='text-2xl font-semibold text-text-primary-light dark:text-text-primary-dark'>Matters</h1>
          <p className='text-sm text-text-muted-light dark:text-text-muted-dark'>
            {tallies.open === 1 ? '1 open matter' : `${tallies.open} open matters`}
          </p>
        </div>
        <button
          type='button'
          onClick={refetch}
          aria-label='Refresh matters'
          className='rounded-lg border border-border-light p-2 text-text-muted-light transition hover:border-brand-primary hover:text-brand-primary dark:border-border-dark dark:text-text-muted-dark'
        >
          <RefreshCw size={18} className={isFetching ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
        <Tally label='Open' value={tallies.open} />
        <Tally label='Not yet filed' value={tallies.notFiled} />
        <Tally label='In court this week' value={tallies.thisWeek} />
        <Tally label='Urgent' value={tallies.urgent} tone={tallies.urgent ? 'text-error' : ''} />
      </div>

      <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
        <label className='relative block md:w-96'>
          <span className='sr-only'>Search matters</span>
          <Search size={16} aria-hidden='true' className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light dark:text-text-muted-dark' />
          <input
            type='search'
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder='Search by title, client, number or court'
            className='form-control w-full pl-9'
          />
        </label>
        <ResponsiveFilterTabs
          tabs={CASE_STATUS_TABS}
          activeKey={activeStatusTab}
          onChange={setActiveStatusTab}
          getCount={(tab) => statusCounts[tab.key]}
          ariaLabel='Matter status'
          className='md:justify-end'
        />
      </div>

      <Card className='overflow-hidden p-0'>
        {filteredCases.length ? (
          <div className='divide-y divide-border-light dark:divide-border-dark'>
            {filteredCases.map((item) => (
              <MatterRow key={item.id} caseItem={item} onOpen={() => navigate(`/admin/cases/${item.id}`)} />
            ))}
          </div>
        ) : (
          <p className='px-5 py-10 text-center text-sm text-text-muted-light dark:text-text-muted-dark'>
            {safeCases.length ? 'No matters match this search.' : 'No matters yet. Open one from a client’s accepted proposed matter.'}
          </p>
        )}
      </Card>
    </div>
  );
}
