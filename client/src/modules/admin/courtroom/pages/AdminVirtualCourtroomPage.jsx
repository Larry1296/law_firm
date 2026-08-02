import { useMemo, useState } from 'react';
import {
  BarChart3,
  Link2,
  ListChecks,
  Radio,
  Users,
  Video,
} from 'lucide-react';

import Button3D from '@/components/ui/Button3D';
import Card from '@/components/ui/Card';
import Select3D from '@/components/ui/Select3D';
import PageSectionNav from '@/components/ui/PageSectionNav';
import {
  useCreateCourtroomAttendance,
  useCreateCourtroomCauseListSync,
  useCreateCourtroomProvider,
  useCreateCourtroomSession,
  useCourtroomAnalytics,
  useCourtroomCauseListSyncs,
  useCourtroomProviders,
  useCourtroomSessions,
  useTodayCourtroomEvents,
  useUpdateCourtroomSession,
} from '@/modules/courtroom/hooks/useCourtroom';
import { formatDateTime } from '@/core/utils/dateFormatter';
import { getApiErrorMessage } from '@/core/utils/errorMessages';
import CourtroomLauncher from '@/modules/courtroom/components/CourtroomLauncher';
import courtroomService from '@/modules/courtroom/services/courtroomService';

const statuses = ['SCHEDULED', 'PREPARING', 'READY_TO_JOIN', 'WAITING_ROOM', 'COURT_IN_SESSION', 'MATTER_NOT_CALLED', 'POSSIBLE_MATTER_CALL', 'MATTER_CALLED', 'STOOD_DOWN', 'PASSED_OVER', 'ADJOURNED', 'DIRECTIONS_ISSUED', 'RULING_DELIVERED', 'COMPLETED', 'LINK_FAILED', 'REGISTRY_CONTACTED', 'CANCELLED'];
const providerTypes = ['MICROSOFT_TEAMS', 'GOOGLE_MEET', 'ZOOM', 'WEBEX', 'JUDICIARY_PORTAL', 'YOUTUBE_LIVE', 'OTHER'];

const emptyEvent = {
  eventId: '',
  provider: '',
  join_url: '',
  link_source: 'OFFICIAL_COMMUNICATION',
  client_attendance_requirement: 'TO_BE_CONFIRMED',
  client_access_enabled: false,
  client_access_from: '',
  client_access_until: '',
  virtual_courtroom_label: '',
};

const emptyProvider = {
  name: '',
  provider_type: 'OTHER',
  base_url: '',
  is_default: false,
};

const emptyCauseList = {
  provider: '',
  source_name: '',
  source_url: '',
  court_station: '',
  cause_list_date: '',
  status: 'QUEUED',
};

export default function AdminVirtualCourtroomPage() {
  const [eventForm, setEventForm] = useState(emptyEvent);
  const [providerForm, setProviderForm] = useState(emptyProvider);
  const [causeListForm, setCauseListForm] = useState(emptyCauseList);
  const [attendanceDrafts, setAttendanceDrafts] = useState({});
  const [feedback, setFeedback] = useState(null);

  const todayEventsQuery = useTodayCourtroomEvents();
  const providersQuery = useCourtroomProviders();
  const sessionsQuery = useCourtroomSessions();
  const analyticsQuery = useCourtroomAnalytics();
  const causeListQuery = useCourtroomCauseListSyncs();

  const createSession = useCreateCourtroomSession();
  const updateSession = useUpdateCourtroomSession();
  const createProvider = useCreateCourtroomProvider();
  const createAttendance = useCreateCourtroomAttendance();
  const createCauseListSync = useCreateCourtroomCauseListSync();

  const providers = useMemo(() => providersQuery.data || [], [providersQuery.data]);
  const sessions = useMemo(() => sessionsQuery.data || [], [sessionsQuery.data]);
  const todayEvents = useMemo(
    () => todayEventsQuery.data?.events || [],
    [todayEventsQuery.data?.events],
  );
  const causeListSyncs = useMemo(() => causeListQuery.data || [], [causeListQuery.data]);
  const analytics = analyticsQuery.data || {};
  const selectedEvent = useMemo(
    () => todayEvents.find((courtEvent) => courtEvent.id === eventForm.eventId),
    [eventForm.eventId, todayEvents],
  );
  const selectedSession = useMemo(
    () => sessions.find((session) => session.event_summary?.id === eventForm.eventId),
    [eventForm.eventId, sessions],
  );

  const updateEventForm = (event) => {
    const { name, value, type, checked } = event.target;
    setEventForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleEventSelect = (event) => {
    const eventId = event.target.value;
    const courtEvent = todayEvents.find((item) => item.id === eventId);
    const session = sessions.find((item) => item.event_summary?.id === eventId);

    setEventForm((current) => ({
      ...current,
      eventId,
      provider: session?.provider || current.provider,
      join_url: session?.join_url || courtEvent?.virtual_courtroom_url || '',
      link_source: session?.link_source || 'OFFICIAL_COMMUNICATION',
      client_attendance_requirement: session?.client_attendance_requirement || 'TO_BE_CONFIRMED',
      client_access_enabled: session?.client_access_enabled || false,
      client_access_from: session?.client_access_from?.slice(0, 16) || '',
      client_access_until: session?.client_access_until?.slice(0, 16) || '',
      virtual_courtroom_label: courtEvent?.virtual_courtroom_label || '',
    }));
  };

  const handleCreateCourtroom = async (event) => {
    event.preventDefault();
    setFeedback(null);

    if (!eventForm.eventId || !eventForm.join_url) {
      setFeedback({ type: 'error', text: 'Choose today’s court event and add the courtroom link.' });
      return;
    }

    try {
      if (selectedSession) {
        await updateSession.mutateAsync({
          sessionId: selectedSession.id,
          payload: {
            provider: eventForm.provider || null,
            join_url: eventForm.join_url,
            link_source: eventForm.link_source,
            link_verified: true,
            client_attendance_requirement: eventForm.client_attendance_requirement,
            client_access_enabled: eventForm.client_access_enabled,
            client_access_from: eventForm.client_access_from || null,
            client_access_until: eventForm.client_access_until || null,
          },
        });
      } else {
        await createSession.mutateAsync({
          event_id: eventForm.eventId,
          provider: eventForm.provider || null,
          join_url: eventForm.join_url,
          status: 'SCHEDULED',
          link_source: eventForm.link_source,
          link_verified: true,
          client_attendance_requirement: eventForm.client_attendance_requirement,
          client_access_enabled: eventForm.client_access_enabled,
          client_access_from: eventForm.client_access_from || null,
          client_access_until: eventForm.client_access_until || null,
        });
      }

      setEventForm(emptyEvent);
      setFeedback({ type: 'success', text: 'Courtroom link attached to today’s court event.' });
    } catch (error) {
      setFeedback({ type: 'error', text: getApiErrorMessage(error, 'Could not attach courtroom session.') });
    }
  };

  const handleCreateProvider = async (event) => {
    event.preventDefault();
    try {
      await createProvider.mutateAsync(providerForm);
      setProviderForm(emptyProvider);
      setFeedback({ type: 'success', text: 'Courtroom provider saved.' });
    } catch (error) {
      setFeedback({ type: 'error', text: getApiErrorMessage(error, 'Could not save provider.') });
    }
  };

  const handleStatusChange = async (session, status) => {
    await courtroomService.updateStatus(session.id, { status });
    sessionsQuery.refetch();
  };

  const handleAttendance = async (sessionId) => {
    const draft = attendanceDrafts[sessionId] || {};
    if (!draft.attendee_name) return;
    await createAttendance.mutateAsync({
      sessionId,
      payload: {
        attendee_name: draft.attendee_name,
        attendee_email: draft.attendee_email || '',
        attendee_role: draft.attendee_role || 'GUEST',
        status: draft.status || 'JOINED',
      },
    });
    setAttendanceDrafts((current) => ({ ...current, [sessionId]: {} }));
  };

  const handleCauseListSync = async (event) => {
    event.preventDefault();
    if (!causeListForm.cause_list_date) return;
    await createCauseListSync.mutateAsync({
      ...causeListForm,
      provider: causeListForm.provider || null,
    });
    setCauseListForm(emptyCauseList);
  };

  const stats = [
    ['Today', analytics.today_sessions ?? 0],
    ['Live', analytics.live_sessions ?? 0],
    ['Waiting', analytics.waiting_sessions ?? 0],
    ['Attendance', analytics.attendance_logs ?? 0],
    ['Recorded', analytics.recorded_sessions ?? 0],
  ];

  return (
    <div className='space-y-6 p-4 md:p-6 animate-fadeIn'>
      <PageSectionNav
        ariaLabel='Courtroom workspace sections'
        sections={[
          { id: 'courtroom-overview', label: 'Overview' },
          { id: 'courtroom-setup', label: 'Setup and providers' },
          { id: 'courtroom-live', label: 'Live sessions' },
          { id: 'courtroom-cause-list', label: 'Cause list' },
        ]}
      />
      <div id='courtroom-overview' className='scroll-mt-28 grid gap-4 lg:grid-cols-5'>
        {stats.map(([label, value]) => (
          <Card key={label} className='p-4'>
            <p className='text-xs font-semibold uppercase text-slate-400'>{label}</p>
            <p className='mt-2 text-2xl font-black text-slate-900 dark:text-white'>{value}</p>
          </Card>
        ))}
      </div>

      {feedback && (
        <div
          className={`rounded-xl px-4 py-3 text-sm ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200'
              : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-200'
          }`}
        >
          {feedback.text}
        </div>
      )}

      <div id='courtroom-setup' className='scroll-mt-28 grid gap-6 xl:grid-cols-[1.2fr_.8fr]'>
        <Card className='p-5'>
          <div className='mb-4 flex items-center gap-3'>
            <Video size={22} className='text-blue-600' />
            <div>
              <h1 className='text-xl font-bold text-slate-900 dark:text-white'>Courtroom Operations</h1>
              <p className='text-sm text-slate-500 dark:text-slate-300'>Attach verified official links to upcoming scheduled court events.</p>
            </div>
          </div>

          <form onSubmit={handleCreateCourtroom} className='grid gap-3 lg:grid-cols-2'>
            <Select3D
              name='eventId'
              value={eventForm.eventId}
              onChange={handleEventSelect}
              wrapperClassName='mb-0 lg:col-span-2'
              placeholder={todayEventsQuery.isLoading ? 'Loading upcoming court events...' : 'Choose an upcoming court event'}
              options={todayEvents.map((courtEvent) => ({
                value: courtEvent.id,
                label: `${courtEvent.case?.case_number} - ${courtEvent.title} - ${courtEvent.starts_at ? formatDateTime(courtEvent.starts_at) : 'Time not set'}`,
              }))}
            />

            {selectedEvent && (
              <div className='rounded-xl border border-border-light bg-slate-50 p-4 text-sm text-slate-600 dark:border-border-dark dark:bg-slate-900 dark:text-slate-300 lg:col-span-2'>
                <p className='font-semibold text-slate-900 dark:text-white'>
                  {selectedEvent.case?.case_number} - {selectedEvent.case?.title}
                </p>
                <p className='mt-1'>
                  {formatDateTime(selectedEvent.starts_at)} · {selectedEvent.court_station || 'Court not set'} · {selectedEvent.courtroom || 'Room not set'}
                </p>
                {selectedSession && (
                  <p className='mt-1 text-emerald-600 dark:text-emerald-300'>
                    Existing session found. Saving will update it.
                  </p>
                )}
              </div>
            )}

            <Select3D
              name='provider'
              value={eventForm.provider}
              onChange={updateEventForm}
              wrapperClassName='mb-0'
              placeholder='No provider selected'
              options={providers.map((provider) => ({ value: provider.id, label: provider.name }))}
            />

            <input name='virtual_courtroom_label' value={eventForm.virtual_courtroom_label} onChange={updateEventForm} placeholder='Link label' className='h-12 rounded-xl border border-border-light bg-white px-4 text-sm dark:border-border-dark dark:bg-slate-900 dark:text-white' />
            <input name='join_url' value={eventForm.join_url} onChange={updateEventForm} placeholder='Participant courtroom link' className='h-12 rounded-xl border border-border-light bg-white px-4 text-sm dark:border-border-dark dark:bg-slate-900 dark:text-white lg:col-span-2' />
            <Select3D name='link_source' value={eventForm.link_source} onChange={updateEventForm} wrapperClassName='mb-0 lg:col-span-2' options={[['CAUSE_LIST','Cause list'],['REGISTRY_EMAIL','Registry email'],['JUDICIARY_WEBSITE','Judiciary website'],['OFFICIAL_COMMUNICATION','Other official communication']].map(([value,label]) => ({ value, label }))} />
            <Select3D name='client_attendance_requirement' value={eventForm.client_attendance_requirement} onChange={updateEventForm} wrapperClassName='mb-0' options={[['NOT_REQUIRED','Not required'],['OPTIONAL','Optional'],['REQUIRED','Required'],['RESTRICTED','Restricted'],['TO_BE_CONFIRMED','To be confirmed']].map(([value,label]) => ({ value, label }))} />
            <label className='flex items-center gap-3 rounded-xl border px-4 text-sm font-semibold'><input name='client_access_enabled' type='checkbox' checked={eventForm.client_access_enabled} onChange={updateEventForm}/>Enable authorised client access</label>
            <label className='text-sm font-semibold'>Client access from<input name='client_access_from' type='datetime-local' value={eventForm.client_access_from} onChange={updateEventForm} className='mt-1 h-11 w-full rounded-xl border bg-transparent px-3'/></label>
            <label className='text-sm font-semibold'>Client access until<input name='client_access_until' type='datetime-local' value={eventForm.client_access_until} onChange={updateEventForm} className='mt-1 h-11 w-full rounded-xl border bg-transparent px-3'/></label>

            <Button3D type='submit' disabled={createSession.isPending || updateSession.isPending}>
              <Link2 size={16} />
              {selectedSession ? 'Update Courtroom' : 'Attach Courtroom'}
            </Button3D>
          </form>
        </Card>

        <Card className='p-5'>
          <div className='mb-4 flex items-center gap-3'>
            <Radio size={20} className='text-emerald-600' />
            <h2 className='text-lg font-bold text-slate-900 dark:text-white'>Providers</h2>
          </div>
          <form onSubmit={handleCreateProvider} className='space-y-3'>
            <input value={providerForm.name} onChange={(event) => setProviderForm((current) => ({ ...current, name: event.target.value }))} placeholder='Provider name' className='h-11 w-full rounded-xl border border-border-light bg-white px-3 text-sm dark:border-border-dark dark:bg-slate-900 dark:text-white' />
            <Select3D
              value={providerForm.provider_type}
              onChange={(event) => setProviderForm((current) => ({ ...current, provider_type: event.target.value }))}
              wrapperClassName='mb-0'
              className='h-11 min-h-11 rounded-xl px-3'
              options={providerTypes.map((type) => ({ value: type, label: type.replaceAll('_', ' ') }))}
            />
            <input value={providerForm.base_url} onChange={(event) => setProviderForm((current) => ({ ...current, base_url: event.target.value }))} placeholder='Provider portal URL' className='h-11 w-full rounded-xl border border-border-light bg-white px-3 text-sm dark:border-border-dark dark:bg-slate-900 dark:text-white' />
            <label className='flex items-center gap-3 text-sm dark:text-white'>
              <input type='checkbox' checked={providerForm.is_default} onChange={(event) => setProviderForm((current) => ({ ...current, is_default: event.target.checked }))} />
              Default provider
            </label>
            <Button3D type='submit' disabled={createProvider.isPending}>Save Provider</Button3D>
          </form>
        </Card>
      </div>

      <Card id='courtroom-live' className='scroll-mt-28 p-5'>
        <div className='mb-4 flex items-center justify-between gap-3'>
          <div className='flex items-center gap-3'>
            <BarChart3 size={20} className='text-indigo-600' />
            <h2 className='text-lg font-bold text-slate-900 dark:text-white'>Live Sessions</h2>
          </div>
          <button type='button' onClick={() => sessionsQuery.refetch()} className='rounded-xl border border-border-light px-3 py-2 text-sm font-semibold dark:border-border-dark dark:text-white'>Refresh</button>
        </div>

        {sessions.length === 0 && <p className='rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-900 dark:text-slate-300'>No courtroom sessions for today.</p>}

        <div className='space-y-4'>
          {sessions.map((session) => (
            <div key={session.id} className='rounded-xl border border-border-light p-4 dark:border-border-dark'>
              <div className='grid gap-4 xl:grid-cols-[1fr_220px]'>
                <div>
                  <p className='font-semibold text-slate-900 dark:text-white'>{session.event_summary?.internal_matter_number} · {session.event_summary?.official_court_case_number || 'Official number not recorded'}</p>
                  <p className='mt-1 text-sm text-slate-500 dark:text-slate-300'>{formatDateTime(session.event_summary?.starts_at)} · {session.event_summary?.court_station || 'Court not set'} · {session.event_summary?.courtroom || 'Room not set'}</p>
                  <p className='mt-1 text-xs text-slate-400'>{session.provider_type || 'No provider detected'} · {session.link_verified ? 'Verified link' : 'Link awaiting verification'}</p>
                </div>

                <Select3D
                  value={session.status}
                  onChange={(event) => handleStatusChange(session, event.target.value)}
                  wrapperClassName='mb-0'
                  className='h-11 min-h-11 rounded-xl px-3'
                  options={statuses.map((status) => ({ value: status, label: status }))}
                />

                <div className='space-y-2'>
                  <input value={attendanceDrafts[session.id]?.attendee_name || ''} onChange={(event) => setAttendanceDrafts((current) => ({ ...current, [session.id]: { ...current[session.id], attendee_name: event.target.value } }))} placeholder='Attendee name' className='h-10 w-full rounded-xl border border-border-light bg-white px-3 text-sm dark:border-border-dark dark:bg-slate-900 dark:text-white' />
                  <button type='button' onClick={() => handleAttendance(session.id)} className='inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white dark:bg-white dark:text-slate-900'>
                    <Users size={15} />
                    Log Attendance
                  </button>
                </div>

              </div>
              <div className='mt-4'><CourtroomLauncher session={session} /></div>
            </div>
          ))}
        </div>
      </Card>

      <Card id='courtroom-cause-list' className='scroll-mt-28 p-5'>
        <div className='mb-4 flex items-center gap-3'>
          <ListChecks size={20} className='text-amber-600' />
          <h2 className='text-lg font-bold text-slate-900 dark:text-white'>Cause List Sync</h2>
        </div>

        <form onSubmit={handleCauseListSync} className='grid gap-3 lg:grid-cols-5'>
          <Select3D
            value={causeListForm.provider}
            onChange={(event) => setCauseListForm((current) => ({ ...current, provider: event.target.value }))}
            wrapperClassName='mb-0'
            className='h-11 min-h-11 rounded-xl px-3'
            placeholder='Provider'
            options={providers.map((provider) => ({ value: provider.id, label: provider.name }))}
          />
          <input value={causeListForm.court_station} onChange={(event) => setCauseListForm((current) => ({ ...current, court_station: event.target.value }))} placeholder='Court station' className='h-11 rounded-xl border border-border-light bg-white px-3 text-sm dark:border-border-dark dark:bg-slate-900 dark:text-white' />
          <input value={causeListForm.source_url} onChange={(event) => setCauseListForm((current) => ({ ...current, source_url: event.target.value }))} placeholder='Cause list URL' className='h-11 rounded-xl border border-border-light bg-white px-3 text-sm dark:border-border-dark dark:bg-slate-900 dark:text-white' />
          <input value={causeListForm.cause_list_date} onChange={(event) => setCauseListForm((current) => ({ ...current, cause_list_date: event.target.value }))} type='date' className='h-11 rounded-xl border border-border-light bg-white px-3 text-sm dark:border-border-dark dark:bg-slate-900 dark:text-white' />
          <Button3D type='submit' disabled={createCauseListSync.isPending}>Log Sync</Button3D>
        </form>

        <div className='mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3'>
          {causeListSyncs.slice(0, 6).map((sync) => (
            <div key={sync.id} className='rounded-xl border border-border-light p-3 text-sm dark:border-border-dark dark:text-white'>
              <p className='font-semibold'>{sync.court_station || sync.source_name || 'Cause list'}</p>
              <p className='text-slate-500 dark:text-slate-300'>{sync.cause_list_date} · {sync.status}</p>
              <p className='text-xs text-slate-400'>{sync.matched_events} matched · {sync.created_events} created</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
