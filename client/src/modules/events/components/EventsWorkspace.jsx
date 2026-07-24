import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Bell,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Gavel,
  MapPin,
  RefreshCw,
  Users,
  Video,
} from 'lucide-react';

import Card from '@/components/ui/Card';
import SectionHeading from '@/components/ui/SectionHeading';
import { formatDateTime } from '@/core/utils/dateFormatter';
import { displayEnum } from '@/core/utils/textFormatter';
import { useEvents, useUpdateEventAwareness } from '@/modules/events/hooks/useEvents';

const awarenessStatuses = [
  ['NOTIFIED', 'Notified'],
  ['CONFIRMED', 'Confirmed'],
  ['UNREACHABLE', 'Unreachable'],
  ['DECLINED', 'Declined'],
];

const scopeOptions = [
  ['all', 'All'],
  ['current', 'Current'],
  ['today', 'Today'],
  ['upcoming', 'Upcoming'],
  ['past', 'Past'],
];

const dateKey = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const sameMonth = (date, cursor) =>
  date.getMonth() === cursor.getMonth() && date.getFullYear() === cursor.getFullYear();

const monthLabel = (date) =>
  new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(date);

const shortMonthLabel = (date) =>
  new Intl.DateTimeFormat(undefined, { month: 'short' }).format(date);

const timeLabel = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Time not set';
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
};

const buildMonthCells = (cursor) => {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
};

const eventTone = (event) => {
  if (event.virtual_courtroom_is_available) return 'border-emerald-500 bg-emerald-50 text-emerald-800';
  if (event.event_type === 'HEARING' || event.event_type === 'MENTION') {
    return 'border-blue-500 bg-blue-50 text-blue-800';
  }
  if (event.status === 'ADJOURNED' || event.status === 'CANCELLED') {
    return 'border-amber-500 bg-amber-50 text-amber-800';
  }
  return 'border-slate-400 bg-slate-50 text-slate-700';
};

function EventRow({ event, caseBasePath, highlighted, secretaryMode, onAwareness, awarenessPending }) {
  const awareness = event.client_awareness;
  const caseId = event.case?.id;
  const courtroomUrl = event.virtual_courtroom_is_available ? event.virtual_courtroom_url : '';

  return (
    <Card className={`p-4 ${highlighted ? 'ring-2 ring-blue-500' : ''}`}>
      <div className='grid gap-4 xl:grid-cols-[1fr_auto]'>
        <div className='min-w-0'>
          <div className='flex items-start gap-3'>
            <div className='mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white'>
              <CalendarClock size={18} />
            </div>
            <div className='min-w-0'>
              <div className='flex flex-wrap items-center gap-2'>
                <p className='font-semibold text-slate-900 dark:text-white'>
                  {event.title}
                </p>
                <span className='rounded-md border border-border-light px-2 py-1 text-xs font-semibold text-slate-600 dark:border-border-dark dark:text-slate-200'>
                  {event.status_label}
                </span>
              </div>

              <div className='mt-2 grid gap-2 text-sm text-slate-600 dark:text-slate-300 md:grid-cols-2'>
                <p>
                  <span className='font-semibold text-slate-800 dark:text-slate-100'>When:</span>{' '}
                  {formatDateTime(event.starts_at)}
                </p>
                <p>
                  <span className='font-semibold text-slate-800 dark:text-slate-100'>Event type:</span>{' '}
                  {event.event_type_label || displayEnum(event.event_type)}
                </p>
                {event.event_subtype && (
                  <p>
                    <span className='font-semibold text-slate-800 dark:text-slate-100'>Purpose:</span>{' '}
                    {event.event_subtype}
                  </p>
                )}
                <p>
                  <span className='font-semibold text-slate-800 dark:text-slate-100'>Matter:</span>{' '}
                  {event.case?.title || event.case?.case_number || 'Matter not set'}
                </p>
                <p>
                  <span className='font-semibold text-slate-800 dark:text-slate-100'>Case no.:</span>{' '}
                  {event.case?.case_number || 'Not set'}
                </p>
              </div>

              <div className='mt-3 flex flex-wrap gap-3 text-xs font-medium text-slate-500 dark:text-slate-300'>
                <span className='inline-flex items-center gap-1'>
                  <Users size={14} />
                  Client: {event.case?.client?.full_name || 'Client not set'}
                </span>
                <span className='inline-flex items-center gap-1'>
                  <Gavel size={14} />
                  Lawyer: {event.case?.assigned_lawyer?.full_name || 'Not assigned'}
                </span>
                <span className='inline-flex items-center gap-1'>
                  <MapPin size={14} />
                  {event.court || event.court_station || 'Court not set'} · {event.courtroom || event.physical_venue || 'Room not set'}
                </span>
              </div>

              <div className='mt-4 flex flex-wrap gap-2'>
                {caseBasePath && caseId && (
                  <Link
                    to={`${caseBasePath}/${caseId}`}
                    className='inline-flex items-center gap-2 rounded-lg border border-border-light px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-border-dark dark:text-slate-100 dark:hover:bg-slate-900'
                  >
                    <Gavel size={14} />
                    Case
                  </Link>
                )}
                {courtroomUrl && (
                  <a
                    href={courtroomUrl}
                    target='_blank'
                    rel='noreferrer'
                    className='inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700'
                  >
                    <Video size={14} />
                    Join Courtroom
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {secretaryMode && (
          <div className='min-w-[260px] rounded-lg border border-border-light p-3 dark:border-border-dark'>
            <p className='mb-2 text-xs font-semibold uppercase text-slate-400'>
              Client awareness
            </p>
            <div className='mb-3 inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-100'>
              <CheckCircle2 size={15} />
              {awareness?.status_label || 'Not Notified'}
            </div>
            <div className='grid grid-cols-2 gap-2'>
              {awarenessStatuses.map(([value, label]) => (
                <button
                  key={value}
                  type='button'
                  onClick={() => onAwareness(event.id, value)}
                  disabled={awarenessPending}
                  className='rounded-lg border border-border-light px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-border-dark dark:text-slate-100 dark:hover:bg-slate-900'
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

export default function EventsWorkspace({
  title = 'Calendar',
  subtitle = 'Current and upcoming case events',
  secretaryMode = false,
  caseBasePath = '',
}) {
  const [searchParams] = useSearchParams();
  const highlightedEventId = searchParams.get('event');
  const [scope, setScope] = useState('all');
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()));
  const params = useMemo(() => (scope === 'all' ? {} : { scope }), [scope]);
  const { data, isLoading, error, refetch, isFetching } = useEvents(params);
  const updateAwareness = useUpdateEventAwareness();
  const events = useMemo(() => data?.events || [], [data]);

  const eventsByDate = useMemo(() => {
    return events.reduce((acc, event) => {
      const key = dateKey(event.starts_at);
      if (!key) return acc;
      acc[key] = acc[key] || [];
      acc[key].push(event);
      return acc;
    }, {});
  }, [events]);

  const selectedEvents = eventsByDate[selectedDate] || [];
  const sortedEvents = useMemo(
    () => [...events].sort((left, right) => new Date(left.starts_at) - new Date(right.starts_at)),
    [events],
  );
  const visibleYear = cursor.getFullYear();
  const monthTabs = useMemo(
    () => Array.from({ length: 12 }, (_, month) => new Date(visibleYear, month, 1)),
    [visibleYear],
  );
  const eventCountsByMonth = useMemo(() => {
    return events.reduce((acc, event) => {
      const date = new Date(event.starts_at);
      if (Number.isNaN(date.getTime()) || date.getFullYear() !== visibleYear) return acc;
      acc[date.getMonth()] = (acc[date.getMonth()] || 0) + 1;
      return acc;
    }, {});
  }, [events, visibleYear]);
  const monthEvents = events.filter((event) => sameMonth(new Date(event.starts_at), cursor));
  const upcomingCount = events.filter((event) => new Date(event.starts_at) >= new Date()).length;
  const courtroomReadyCount = events.filter((event) => event.virtual_courtroom_is_available).length;
  const showAgenda = scope === 'upcoming' || Boolean(highlightedEventId);
  const displayedEvents = showAgenda ? sortedEvents : selectedEvents;
  const selectedDayLabel = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${selectedDate}T00:00:00`));

  const handleAwareness = async (eventId, status) => {
    await updateAwareness.mutateAsync({
      eventId,
      payload: {
        status,
        confirmation_channel: 'manual',
      },
    });
  };

  const setVisibleMonth = (year, month) => {
    const nextDate = new Date(year, month, 1);
    setCursor(nextDate);
    setSelectedDate(dateKey(nextDate));
  };

  const moveMonth = (amount) => {
    setCursor((current) => {
      const nextDate = new Date(current.getFullYear(), current.getMonth() + amount, 1);
      setSelectedDate(dateKey(nextDate));
      return nextDate;
    });
  };

  const moveYear = (amount) => {
    setCursor((current) => {
      const nextDate = new Date(current.getFullYear() + amount, current.getMonth(), 1);
      setSelectedDate(dateKey(nextDate));
      return nextDate;
    });
  };

  const goToday = () => {
    const today = new Date();
    setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(dateKey(today));
  };

  return (
    <div className='space-y-6 p-4 md:p-6'>
      <SectionHeading title={title} subtitle={subtitle} align='left' size='compact' />

      <div className='grid gap-4 md:grid-cols-3'>
        <Card className='p-4'>
          <p className='text-xs font-semibold uppercase text-slate-400'>Visible events</p>
          <p className='mt-2 text-2xl font-bold text-slate-900 dark:text-white'>{events.length}</p>
        </Card>
        <Card className='p-4'>
          <p className='text-xs font-semibold uppercase text-slate-400'>This month</p>
          <p className='mt-2 text-2xl font-bold text-slate-900 dark:text-white'>{monthEvents.length}</p>
        </Card>
        <Card className='p-4'>
          <p className='text-xs font-semibold uppercase text-slate-400'>Courtroom links ready</p>
          <p className='mt-2 text-2xl font-bold text-slate-900 dark:text-white'>{courtroomReadyCount}</p>
        </Card>
      </div>

      <Card className='space-y-4 p-4'>
        <div className='flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between'>
          <div className='flex flex-wrap items-center gap-2'>
            {scopeOptions.map(([value, label]) => (
              <button
                key={value}
                type='button'
                onClick={() => setScope(value)}
                className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                  scope === value
                    ? 'bg-blue-600 text-white'
                    : 'border border-border-light text-slate-700 dark:border-border-dark dark:text-slate-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className='flex flex-wrap items-center gap-2'>
            <button
              type='button'
              onClick={() => moveMonth(-1)}
              className='inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border-light text-slate-700 dark:border-border-dark dark:text-slate-100'
              aria-label='Previous month'
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type='button'
              onClick={goToday}
              className='inline-flex items-center gap-2 rounded-lg border border-border-light px-3 py-2 text-sm font-semibold text-slate-700 dark:border-border-dark dark:text-slate-100'
            >
              <CalendarDays size={16} />
              Today
            </button>
            <button
              type='button'
              onClick={() => moveMonth(1)}
              className='inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border-light text-slate-700 dark:border-border-dark dark:text-slate-100'
              aria-label='Next month'
            >
              <ChevronRight size={18} />
            </button>
            <button
              type='button'
              onClick={refetch}
              className='inline-flex items-center gap-2 rounded-lg border border-border-light px-3 py-2 text-sm font-semibold text-slate-700 dark:border-border-dark dark:text-slate-100'
            >
              <RefreshCw size={15} className={isFetching ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        <div className='border-t border-border-light pt-4 dark:border-border-dark'>
          <div className='mb-3 flex flex-wrap items-center justify-between gap-3'>
            <p className='text-sm font-semibold text-slate-700 dark:text-slate-100'>
              Calendar year {visibleYear}
            </p>
            <div className='flex items-center gap-2'>
              <button
                type='button'
                onClick={() => moveYear(-1)}
                className='inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border-light text-slate-700 dark:border-border-dark dark:text-slate-100'
                aria-label='Previous year'
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type='button'
                onClick={() => moveYear(1)}
                className='inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border-light text-slate-700 dark:border-border-dark dark:text-slate-100'
                aria-label='Next year'
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className='grid gap-2 sm:grid-cols-6 xl:grid-cols-12'>
            {monthTabs.map((monthDate) => {
              const monthIndex = monthDate.getMonth();
              const active = monthIndex === cursor.getMonth();
              const count = eventCountsByMonth[monthIndex] || 0;

              return (
                <button
                  key={monthIndex}
                  type='button'
                  onClick={() => setVisibleMonth(visibleYear, monthIndex)}
                  className={`rounded-lg border px-3 py-2 text-left transition ${
                    active
                      ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                      : 'border-border-light text-slate-700 hover:bg-slate-50 dark:border-border-dark dark:text-slate-100 dark:hover:bg-slate-900'
                  }`}
                >
                  <span className='block text-sm font-bold'>{shortMonthLabel(monthDate)}</span>
                  <span className={`mt-1 block text-xs ${active ? 'text-blue-100' : 'text-slate-400'}`}>
                    {count} {count === 1 ? 'event' : 'events'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {error && (
        <Card className='p-5'>
          <p className='text-sm text-red-600'>{error?.response?.data?.detail || 'Failed to load calendar events.'}</p>
        </Card>
      )}

      <div className='grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(360px,0.8fr)]'>
        <Card className='overflow-hidden'>
          <div className='border-b border-border-light p-4 dark:border-border-dark'>
            <div className='flex items-center justify-between gap-3'>
              <div>
                <p className='text-lg font-bold text-slate-900 dark:text-white'>{monthLabel(cursor)}</p>
                <p className='text-sm text-slate-500 dark:text-slate-300'>
                  {upcomingCount} upcoming from your visible event set
                </p>
              </div>
              <Bell className='text-blue-600' size={22} />
            </div>
          </div>

          <div className='grid grid-cols-7 border-b border-border-light text-center text-xs font-bold uppercase text-slate-400 dark:border-border-dark'>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className='px-2 py-3'>{day}</div>
            ))}
          </div>

          <div className='grid grid-cols-7'>
            {buildMonthCells(cursor).map((day) => {
              const key = dateKey(day);
              const dayEvents = eventsByDate[key] || [];
              const active = selectedDate === key;
              const inMonth = sameMonth(day, cursor);

              return (
                <button
                  key={key}
                  type='button'
                  onClick={() => setSelectedDate(key)}
                  className={`min-h-[112px] border-b border-r border-border-light p-2 text-left transition dark:border-border-dark ${
                    active ? 'bg-blue-50 dark:bg-blue-950/40' : 'hover:bg-slate-50 dark:hover:bg-slate-900'
                  } ${inMonth ? 'text-slate-900 dark:text-white' : 'text-slate-300 dark:text-slate-600'}`}
                >
                  <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg text-sm font-bold ${
                    key === dateKey(new Date()) ? 'bg-blue-600 text-white' : ''
                  }`}>
                    {day.getDate()}
                  </span>
                  <div className='mt-2 space-y-1'>
                    {dayEvents.slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        className={`truncate rounded-md border-l-4 px-2 py-1 text-[11px] font-semibold ${eventTone(event)}`}
                        title={`${timeLabel(event.starts_at)} ${event.event_type_label || displayEnum(event.event_type)} - ${event.case?.client?.full_name || 'Client not set'} - ${event.case?.title || event.title}`}
                      >
                        {timeLabel(event.starts_at)} {event.event_type_label || displayEnum(event.event_type)} · {event.case?.client?.full_name || event.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <p className='text-[11px] font-semibold text-slate-400'>
                        +{dayEvents.length - 3} more
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        <div className='space-y-4'>
          <Card className='p-4'>
            <p className='text-xs font-semibold uppercase text-slate-400'>
              {showAgenda ? 'Event agenda' : 'Selected day'}
            </p>
            <p className='mt-1 text-lg font-bold text-slate-900 dark:text-white'>
              {showAgenda ? 'Upcoming and linked events' : selectedDayLabel}
            </p>
            {showAgenda && (
              <p className='mt-1 text-sm text-slate-500 dark:text-slate-300'>
                Showing the full event list returned by your current calendar filter, ordered by date.
              </p>
            )}
          </Card>

          {isLoading && (
            <Card className='p-5'>
              <p className='text-sm text-slate-500 dark:text-slate-300'>Loading calendar events...</p>
            </Card>
          )}

          {!isLoading && !error && displayedEvents.length === 0 && (
            <Card className='p-5'>
              <p className='text-sm text-slate-500 dark:text-slate-300'>
                {showAgenda ? 'No events found for this filter.' : 'No events scheduled for this day.'}
              </p>
            </Card>
          )}

          {displayedEvents.map((event) => (
            <EventRow
              key={event.id}
              event={event}
              caseBasePath={caseBasePath}
              highlighted={event.id === highlightedEventId}
              secretaryMode={secretaryMode}
              onAwareness={handleAwareness}
              awarenessPending={updateAwareness.isPending}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
