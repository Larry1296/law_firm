import { useMemo, useState } from 'react';
import {
  BarChart3,
  Download,
  ExternalLink,
  Link2,
  ListChecks,
  Radio,
  Users,
  Video,
} from 'lucide-react';

import Button3D from '@/components/ui/Button3D';
import Card from '@/components/ui/Card';
import {
  useCreateCourtroomAttendance,
  useCreateCourtroomCauseListSync,
  useCreateCourtroomProvider,
  useCreateCourtroomRecording,
  useCreateCourtroomSession,
  useCourtroomAnalytics,
  useCourtroomCauseListSyncs,
  useCourtroomProviders,
  useCourtroomSessions,
  useTodayCourtroomEvents,
  useUpdateCourtroomLink,
  useUpdateCourtroomSession,
} from '@/modules/courtroom/hooks/useCourtroom';
import { formatDateTime } from '@/core/utils/dateFormatter';
import { getApiErrorMessage } from '@/core/utils/errorMessages';

const statuses = ['SCHEDULED', 'WAITING', 'LIVE', 'PAUSED', 'ENDED', 'CANCELLED'];
const providerTypes = ['JUDICIARY', 'ZOOM', 'TEAMS', 'GOOGLE_MEET', 'WEBEX', 'OTHER'];

const emptyEvent = {
  eventId: '',
  provider: '',
  join_url: '',
  host_url: '',
  virtual_courtroom_label: '',
};

const emptyProvider = {
  name: '',
  provider_type: 'JUDICIARY',
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
  const [recordingDrafts, setRecordingDrafts] = useState({});
  const [feedback, setFeedback] = useState(null);

  const todayEventsQuery = useTodayCourtroomEvents();
  const providersQuery = useCourtroomProviders();
  const sessionsQuery = useCourtroomSessions({ scope: 'today' });
  const analyticsQuery = useCourtroomAnalytics();
  const causeListQuery = useCourtroomCauseListSyncs();

  const createSession = useCreateCourtroomSession();
  const updateCourtroomLink = useUpdateCourtroomLink();
  const updateSession = useUpdateCourtroomSession();
  const createProvider = useCreateCourtroomProvider();
  const createAttendance = useCreateCourtroomAttendance();
  const createRecording = useCreateCourtroomRecording();
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
    () => sessions.find((session) => session.event?.id === eventForm.eventId),
    [eventForm.eventId, sessions],
  );

  const updateEventForm = (event) => {
    const { name, value, type, checked } = event.target;
    setEventForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleEventSelect = (event) => {
    const eventId = event.target.value;
    const courtEvent = todayEvents.find((item) => item.id === eventId);
    const session = sessions.find((item) => item.event?.id === eventId);

    setEventForm((current) => ({
      ...current,
      eventId,
      provider: session?.provider || current.provider,
      join_url: session?.join_url || courtEvent?.virtual_courtroom_url || '',
      host_url: session?.host_url || '',
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
      await updateCourtroomLink.mutateAsync({
        eventId: eventForm.eventId,
        payload: {
          virtual_courtroom_url: eventForm.join_url,
          virtual_courtroom_label: eventForm.virtual_courtroom_label,
          is_virtual_courtroom_enabled: true,
        },
      });

      if (selectedSession) {
        await updateSession.mutateAsync({
          sessionId: selectedSession.id,
          payload: {
            provider: eventForm.provider || null,
            join_url: eventForm.join_url,
            host_url: eventForm.host_url,
            allow_recording_downloads: true,
          },
        });
      } else {
        await createSession.mutateAsync({
          event_id: eventForm.eventId,
          provider: eventForm.provider || null,
          join_url: eventForm.join_url,
          host_url: eventForm.host_url,
          status: 'SCHEDULED',
          allow_recording_downloads: true,
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
    await updateSession.mutateAsync({
      sessionId: session.id,
      payload: { status },
    });
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

  const handleRecording = async (sessionId) => {
    const draft = recordingDrafts[sessionId] || {};
    if (!draft.title || !draft.recording_url) return;
    await createRecording.mutateAsync({
      sessionId,
      payload: {
        title: draft.title,
        recording_url: draft.recording_url,
        download_url: draft.download_url || draft.recording_url,
        status: 'READY',
        is_downloadable: true,
      },
    });
    setRecordingDrafts((current) => ({ ...current, [sessionId]: {} }));
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
      <div className='grid gap-4 lg:grid-cols-5'>
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

      <div className='grid gap-6 xl:grid-cols-[1.2fr_.8fr]'>
        <Card className='p-5'>
          <div className='mb-4 flex items-center gap-3'>
            <Video size={22} className='text-blue-600' />
            <div>
              <h1 className='text-xl font-bold text-slate-900 dark:text-white'>Courtroom Operations</h1>
              <p className='text-sm text-slate-500 dark:text-slate-300'>Attach courtroom links to today’s scheduled court events.</p>
            </div>
          </div>

          <form onSubmit={handleCreateCourtroom} className='grid gap-3 lg:grid-cols-2'>
            <select name='eventId' value={eventForm.eventId} onChange={handleEventSelect} className='h-12 rounded-xl border border-border-light bg-white px-4 text-sm dark:border-border-dark dark:bg-slate-900 dark:text-white lg:col-span-2'>
              <option value=''>{todayEventsQuery.isLoading ? 'Loading today’s court events...' : 'Choose today’s court event'}</option>
              {todayEvents.map((courtEvent) => (
                <option key={courtEvent.id} value={courtEvent.id}>
                  {courtEvent.case?.case_number} - {courtEvent.title} · {courtEvent.starts_at ? formatDateTime(courtEvent.starts_at) : 'Time not set'}
                </option>
              ))}
            </select>

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

            <select name='provider' value={eventForm.provider} onChange={updateEventForm} className='h-12 rounded-xl border border-border-light bg-white px-4 text-sm dark:border-border-dark dark:bg-slate-900 dark:text-white'>
              <option value=''>No provider selected</option>
              {providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}
            </select>

            <input name='virtual_courtroom_label' value={eventForm.virtual_courtroom_label} onChange={updateEventForm} placeholder='Link label' className='h-12 rounded-xl border border-border-light bg-white px-4 text-sm dark:border-border-dark dark:bg-slate-900 dark:text-white' />
            <input name='join_url' value={eventForm.join_url} onChange={updateEventForm} placeholder='Participant courtroom link' className='h-12 rounded-xl border border-border-light bg-white px-4 text-sm dark:border-border-dark dark:bg-slate-900 dark:text-white lg:col-span-2' />
            <input name='host_url' value={eventForm.host_url} onChange={updateEventForm} placeholder='Host/moderator link' className='h-12 rounded-xl border border-border-light bg-white px-4 text-sm dark:border-border-dark dark:bg-slate-900 dark:text-white lg:col-span-2' />

            <Button3D type='submit' disabled={updateCourtroomLink.isPending || createSession.isPending || updateSession.isPending}>
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
            <select value={providerForm.provider_type} onChange={(event) => setProviderForm((current) => ({ ...current, provider_type: event.target.value }))} className='h-11 w-full rounded-xl border border-border-light bg-white px-3 text-sm dark:border-border-dark dark:bg-slate-900 dark:text-white'>
              {providerTypes.map((type) => <option key={type} value={type}>{type.replaceAll('_', ' ')}</option>)}
            </select>
            <input value={providerForm.base_url} onChange={(event) => setProviderForm((current) => ({ ...current, base_url: event.target.value }))} placeholder='Provider portal URL' className='h-11 w-full rounded-xl border border-border-light bg-white px-3 text-sm dark:border-border-dark dark:bg-slate-900 dark:text-white' />
            <label className='flex items-center gap-3 text-sm dark:text-white'>
              <input type='checkbox' checked={providerForm.is_default} onChange={(event) => setProviderForm((current) => ({ ...current, is_default: event.target.checked }))} />
              Default provider
            </label>
            <Button3D type='submit' disabled={createProvider.isPending}>Save Provider</Button3D>
          </form>
        </Card>
      </div>

      <Card className='p-5'>
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
              <div className='grid gap-4 xl:grid-cols-[1fr_180px_240px_240px]'>
                <div>
                  <p className='font-semibold text-slate-900 dark:text-white'>{session.event?.case?.case_number} - {session.event?.title}</p>
                  <p className='mt-1 text-sm text-slate-500 dark:text-slate-300'>{formatDateTime(session.event?.starts_at)} · {session.event?.court_station || 'Court not set'} · {session.event?.courtroom || 'Room not set'}</p>
                  <p className='mt-1 text-xs text-slate-400'>{session.provider_name || 'No provider'} · {session.attendance_count || 0} attendance logs · {session.recording_count || 0} recordings</p>
                </div>

                <select value={session.status} onChange={(event) => handleStatusChange(session, event.target.value)} className='h-11 rounded-xl border border-border-light bg-white px-3 text-sm dark:border-border-dark dark:bg-slate-900 dark:text-white'>
                  {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>

                <div className='space-y-2'>
                  <input value={attendanceDrafts[session.id]?.attendee_name || ''} onChange={(event) => setAttendanceDrafts((current) => ({ ...current, [session.id]: { ...current[session.id], attendee_name: event.target.value } }))} placeholder='Attendee name' className='h-10 w-full rounded-xl border border-border-light bg-white px-3 text-sm dark:border-border-dark dark:bg-slate-900 dark:text-white' />
                  <button type='button' onClick={() => handleAttendance(session.id)} className='inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white dark:bg-white dark:text-slate-900'>
                    <Users size={15} />
                    Log Attendance
                  </button>
                </div>

                <div className='space-y-2'>
                  <input value={recordingDrafts[session.id]?.title || ''} onChange={(event) => setRecordingDrafts((current) => ({ ...current, [session.id]: { ...current[session.id], title: event.target.value } }))} placeholder='Recording title' className='h-10 w-full rounded-xl border border-border-light bg-white px-3 text-sm dark:border-border-dark dark:bg-slate-900 dark:text-white' />
                  <input value={recordingDrafts[session.id]?.recording_url || ''} onChange={(event) => setRecordingDrafts((current) => ({ ...current, [session.id]: { ...current[session.id], recording_url: event.target.value } }))} placeholder='Recording URL' className='h-10 w-full rounded-xl border border-border-light bg-white px-3 text-sm dark:border-border-dark dark:bg-slate-900 dark:text-white' />
                  <button type='button' onClick={() => handleRecording(session.id)} className='inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white'>
                    <Download size={15} />
                    Save Recording
                  </button>
                </div>
              </div>
              <a href={session.join_url} target='_blank' rel='noreferrer' className='mt-3 inline-flex items-center gap-2 text-sm font-semibold text-blue-600'>
                <ExternalLink size={15} />
                Open courtroom
              </a>
            </div>
          ))}
        </div>
      </Card>

      <Card className='p-5'>
        <div className='mb-4 flex items-center gap-3'>
          <ListChecks size={20} className='text-amber-600' />
          <h2 className='text-lg font-bold text-slate-900 dark:text-white'>Cause List Sync</h2>
        </div>

        <form onSubmit={handleCauseListSync} className='grid gap-3 lg:grid-cols-5'>
          <select value={causeListForm.provider} onChange={(event) => setCauseListForm((current) => ({ ...current, provider: event.target.value }))} className='h-11 rounded-xl border border-border-light bg-white px-3 text-sm dark:border-border-dark dark:bg-slate-900 dark:text-white'>
            <option value=''>Provider</option>
            {providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}
          </select>
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
