import { useMemo, useState } from 'react';
import { Link2 } from 'lucide-react';

import { formatDateTime } from '@/core/utils/dateFormatter';
import { getApiErrorMessage } from '@/core/utils/errorMessages';
import {
  useCourtDates,
  useCourtroomSessions,
  useCreateCourtroomSession,
  useUpdateCourtroomSession,
} from '@/modules/courtroom/hooks/useCourtroom';

const COURT_EVENT_TYPES = new Set(['MENTION', 'HEARING', 'DIRECTIONS', 'PRE_TRIAL', 'RULING', 'JUDGMENT', 'TAXATION']);
const OPEN_STATUSES = new Set(['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS']);
const RECENT_MS = 6 * 60 * 60 * 1000;

const linkSources = [
  ['CAUSE_LIST', 'Cause list'],
  ['REGISTRY_EMAIL', 'Registry email'],
  ['JUDICIARY_WEBSITE', 'Judiciary website'],
  ['OFFICIAL_COMMUNICATION', 'Other official communication'],
];

const attendanceOptions = [
  ['OPTIONAL', 'Client may follow'],
  ['REQUIRED', 'Client must attend'],
  ['NOT_REQUIRED', 'Client not needed'],
  ['RESTRICTED', 'Restricted (in camera)'],
];

const emptyForm = {
  eventId: '',
  join_url: '',
  link_source: 'CAUSE_LIST',
  client_attendance_requirement: 'OPTIONAL',
  link_verified: false,
};

const inputClass = 'w-full rounded-lg border border-border-light bg-white px-3 py-2 text-sm dark:border-border-dark dark:bg-slate-900';

export default function CourtroomLinkForm({ caseId }) {
  const [form, setForm] = useState(emptyForm);
  const [feedback, setFeedback] = useState(null);
  const [openedAt] = useState(() => Date.now());
  const courtDatesQuery = useCourtDates(caseId);
  const sessionsQuery = useCourtroomSessions(caseId ? { case_id: caseId } : {});
  const createSession = useCreateCourtroomSession();
  const updateSession = useUpdateCourtroomSession();

  const courtDates = useMemo(() => {
    const cutoff = openedAt - RECENT_MS;
    return (courtDatesQuery.data || [])
      .filter((item) => COURT_EVENT_TYPES.has(item.event_type) && OPEN_STATUSES.has(item.status))
      .filter((item) => new Date(item.starts_at).getTime() >= cutoff)
      .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));
  }, [courtDatesQuery.data, openedAt]);

  const sessionFor = (eventId) => (sessionsQuery.data || []).find((item) => item.event_summary?.id === eventId);
  const existingSession = form.eventId ? sessionFor(form.eventId) : null;
  const saving = createSession.isPending || updateSession.isPending;

  const update = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  };

  const selectCourtDate = (event) => {
    const eventId = event.target.value;
    const session = sessionFor(eventId);
    setFeedback(null);
    setForm({
      ...emptyForm,
      eventId,
      client_attendance_requirement:
        session && session.client_attendance_requirement !== 'TO_BE_CONFIRMED'
          ? session.client_attendance_requirement
          : emptyForm.client_attendance_requirement,
    });
  };

  const submit = async (event) => {
    event.preventDefault();
    setFeedback(null);
    const payload = {
      join_url: form.join_url.trim(),
      link_source: form.link_source,
      client_attendance_requirement: form.client_attendance_requirement,
      link_verified: form.link_verified,
    };
    try {
      if (existingSession) {
        await updateSession.mutateAsync({ sessionId: existingSession.id, payload });
      } else {
        await createSession.mutateAsync({ ...payload, event_id: form.eventId });
      }
      const clientNotified = ['OPTIONAL', 'REQUIRED'].includes(form.client_attendance_requirement);
      setFeedback({
        tone: 'success',
        text: clientNotified
          ? 'Court link saved. The client and the matter team have been notified.'
          : 'Court link saved. The matter team has been notified.',
      });
      setForm(emptyForm);
    } catch (error) {
      setFeedback({ tone: 'error', text: getApiErrorMessage(error, 'The court link could not be saved.') });
    }
  };

  return (
    <form onSubmit={submit} className='rounded-xl border border-border-light p-4 dark:border-border-dark' aria-label='Attach virtual court link'>
      <div className='mb-3 flex items-center gap-2'>
        <Link2 size={18} className='text-brand-primary' />
        <h3 className='text-base font-bold text-slate-900 dark:text-white'>Attach virtual court link</h3>
      </div>
      <p className='mb-4 text-sm text-slate-500 dark:text-slate-300'>
        Paste the link from the cause list or registry. The client can join from their dashboard, from 30 minutes before the sitting.
      </p>

      {!courtDatesQuery.isLoading && courtDates.length === 0 ? (
        <p className='rounded-lg bg-slate-50 p-3 text-sm text-slate-500 dark:bg-slate-900 dark:text-slate-300'>
          No upcoming court dates. Schedule the mention or hearing first.
        </p>
      ) : (
        <div className='grid gap-3 md:grid-cols-2'>
          <label className='space-y-1 text-sm font-semibold md:col-span-2'>
            <span>Court date</span>
            <select name='eventId' value={form.eventId} onChange={selectCourtDate} required className={inputClass}>
              <option value=''>Select a court date</option>
              {courtDates.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.case?.case_number} · {item.event_type_label || item.title} · {formatDateTime(item.starts_at)}
                  {sessionFor(item.id) ? ' · link attached' : ''}
                </option>
              ))}
            </select>
          </label>

          <label className='space-y-1 text-sm font-semibold md:col-span-2'>
            <span>Court link (Teams, Zoom or Judiciary)</span>
            <input
              name='join_url'
              type='url'
              inputMode='url'
              value={form.join_url}
              onChange={update}
              required
              placeholder='https://teams.microsoft.com/l/meetup-join/…'
              className={inputClass}
            />
          </label>

          <label className='space-y-1 text-sm font-semibold'>
            <span>Where the link came from</span>
            <select name='link_source' value={form.link_source} onChange={update} className={inputClass}>
              {linkSources.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>

          <label className='space-y-1 text-sm font-semibold'>
            <span>Client attendance</span>
            <select name='client_attendance_requirement' value={form.client_attendance_requirement} onChange={update} className={inputClass}>
              {attendanceOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>

          <label className='flex items-start gap-2 text-sm md:col-span-2'>
            <input name='link_verified' type='checkbox' checked={form.link_verified} onChange={update} className='mt-1' />
            <span>I have checked this link against the official cause list or registry communication.</span>
          </label>

          {existingSession && (
            <p className='rounded-lg bg-amber-50 p-3 text-sm text-amber-950 md:col-span-2'>
              A link is already attached to this court date. Saving replaces it and notifies everyone again.
            </p>
          )}

          <div className='md:col-span-2'>
            <button
              type='submit'
              disabled={saving || !form.eventId}
              className='inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50'
            >
              {saving ? 'Saving…' : existingSession ? 'Replace link and notify' : 'Save link and notify'}
            </button>
          </div>
        </div>
      )}

      {feedback && (
        <p
          role={feedback.tone === 'error' ? 'alert' : 'status'}
          className={`mt-3 rounded-lg p-3 text-sm ${feedback.tone === 'error' ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-800'}`}
        >
          {feedback.text}
        </p>
      )}
    </form>
  );
}
