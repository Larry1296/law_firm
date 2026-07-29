import { useEffect, useMemo, useState } from 'react';

import axiosInstance from '@/core/api/axios';
import { formatDateTime } from '@/core/utils/dateFormatter';
import { currentProceeding } from './caseProceedingsUtils';

const box = 'rounded-xl border border-border-light bg-surface-light p-4 dark:border-border-dark dark:bg-surface-dark';

export default function CaseProceedingsWorkflow({ caseData }) {
  const current = useMemo(
    () => currentProceeding(caseData.events || []),
    [caseData.events],
  );
  const [options, setOptions] = useState([]);
  const [form, setForm] = useState({
    proceeded: true,
    outcome_code: 'PROCEEDED',
    outcome: '',
    attendance: '',
    orders_directions: '',
    next_event_type: '',
    next_date: '',
    court_direction_details: '',
  });
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!current?.id) return;
    axiosInstance
      .get(`/cases/${caseData.id}/allowed-next-events/`, {
        params: { event_id: current.id },
      })
      .then((response) => setOptions(response.data.allowed_next_events || []))
      .catch(() => setOptions([]));
  }, [caseData.id, current?.id]);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await axiosInstance.post(
        `/cases/${caseData.id}/events/${current.id}/record-outcome/`,
        {
          ...form,
          attendance: form.attendance
            ? form.attendance.split(',').map((name) => ({ name: name.trim() })).filter((item) => item.name)
            : [],
          next_date: form.next_date ? new Date(form.next_date).toISOString() : null,
        },
      );
      setMessage('Proceeding recorded. The lifecycle, next event, calendar, tasks and audit history were updated.');
      window.location.reload();
    } catch (error) {
      setMessage(error.response?.data?.detail || error.response?.data?.outcome?.[0] || 'Unable to record the proceeding.');
    } finally {
      setSaving(false);
    }
  };

  const summary = caseData.lifecycle_summary || {};
  const jurisdiction = caseData.jurisdiction_history?.[0];
  const cts = caseData.judiciary_cts_snapshots?.[0];

  return (
    <div className='space-y-5'>
      <section className={box}>
        <h2 className='text-lg font-semibold'>Case Lifecycle Summary</h2>
        <div className='mt-3 grid gap-3 md:grid-cols-4'>
          <p><span className='text-xs text-text-muted-light'>Current stage</span><br />{summary.current_stage_label || caseData.lifecycle_stage_label}</p>
          <p><span className='text-xs text-text-muted-light'>Last proceeding</span><br />{summary.last_completed_proceeding || 'None recorded'}</p>
          <p><span className='text-xs text-text-muted-light'>Next event</span><br />{summary.next_event?.event_type_label || 'Not scheduled'}</p>
          <p><span className='text-xs text-text-muted-light'>Official case number</span><br />{caseData.official_court_case_number || 'Not registered'}</p>
          <p><span className='text-xs text-text-muted-light'>Court / station</span><br />{caseData.court_name || caseData.court_type || 'Not recorded'} — {caseData.court_station || 'station pending'}</p>
          <p><span className='text-xs text-text-muted-light'>Responsible advocate</span><br />{caseData.assigned_lawyer?.full_name || 'Not assigned'}</p>
          <p><span className='text-xs text-text-muted-light'>Next date</span><br />{summary.next_event?.starts_at ? formatDateTime(summary.next_event.starts_at) : 'Not scheduled'}</p>
          <p><span className='text-xs text-text-muted-light'>Key deadline</span><br />{summary.key_pending_deadline?.title || 'None pending'}</p>
        </div>
      </section>

      <section className={box}>
        <h2 className='text-lg font-semibold'>Next Court Event</h2>
        {current ? (
          <div className='mt-2 text-sm'>
            <p className='font-medium'>{current.event_type_label} — {formatDateTime(current.starts_at)}</p>
            <p>{current.court_station || current.court || 'Venue pending'} {current.virtual_meeting_url ? '· Virtual link recorded' : ''}</p>
          </div>
        ) : <p className='mt-2 text-sm'>No active court event is scheduled.</p>}
      </section>

      <div className='grid gap-5 lg:grid-cols-2'>
        <section className={box}>
          <h2 className='text-lg font-semibold'>Jurisdiction Summary</h2>
          <p className='mt-2 font-medium'>{jurisdiction?.status_label || 'Not assessed'}</p>
          <p className='text-sm'>{jurisdiction?.assessment || caseData.jurisdiction_notes || 'No findings recorded.'}</p>
          <p className='mt-2 text-xs'>Source: {jurisdiction?.source_label || 'Not recorded'} · Confirmed by: {jurisdiction?.confirmed_by || 'Not recorded'}</p>
        </section>
        <section className={box}>
          <h2 className='text-lg font-semibold'>Judiciary/CTS Details</h2>
          <p className='mt-2'>CTS reference: {cts?.cts_reference || caseData.cts_reference || 'Not recorded'}</p>
          <p className='text-sm'>Official Judiciary status: {cts?.judiciary_status || 'Not checked'}</p>
          <p className='text-xs'>Last checked: {cts?.checked_at ? formatDateTime(cts.checked_at) : 'Never'} · Source: {cts?.source || 'Not recorded'}</p>
          <p className='mt-2 text-xs'>Sheria Master records checks against Judiciary information; it does not update the Judiciary CTS.</p>
        </section>
      </div>

      {current && (
        <form className={box} onSubmit={submit}>
          <h2 className='text-lg font-semibold'>Proceedings · Record Outcome</h2>
          <div className='mt-3 grid gap-3 md:grid-cols-2'>
            <select className='rounded-lg border p-2 bg-transparent' value={form.proceeded ? 'yes' : 'no'} onChange={(e) => setForm({ ...form, proceeded: e.target.value === 'yes' })}>
              <option value='yes'>Proceeded</option><option value='no'>Did not proceed</option>
            </select>
            <select className='rounded-lg border p-2 bg-transparent' value={form.outcome_code} onChange={(e) => setForm({ ...form, outcome_code: e.target.value })}>
              {['PROCEEDED', 'ADJOURNED', 'PART_HEARD', 'DIRECTIONS_ISSUED', 'DATE_ISSUED', 'RULING_DELIVERED', 'JUDGMENT_DELIVERED', 'SETTLED', 'WITHDRAWN', 'DISMISSED', 'DID_NOT_PROCEED', 'OTHER'].map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}
            </select>
            <textarea required className='rounded-lg border p-2 bg-transparent md:col-span-2' placeholder='Outcome' value={form.outcome} onChange={(e) => setForm({ ...form, outcome: e.target.value })} />
            <input className='rounded-lg border p-2 bg-transparent' placeholder='Appearances, comma-separated' value={form.attendance} onChange={(e) => setForm({ ...form, attendance: e.target.value })} />
            <input className='rounded-lg border p-2 bg-transparent' placeholder='Court orders and directions' value={form.orders_directions} onChange={(e) => setForm({ ...form, orders_directions: e.target.value })} />
            <select className='rounded-lg border p-2 bg-transparent' value={form.next_event_type} onChange={(e) => setForm({ ...form, next_event_type: e.target.value })}>
              <option value=''>No next event</option>
              {options.map((option) => <option key={option.value} value={option.value}>{option.recommended ? 'Recommended: ' : ''}{option.label}</option>)}
            </select>
            <input type='datetime-local' className='rounded-lg border p-2 bg-transparent' value={form.next_date} onChange={(e) => setForm({ ...form, next_date: e.target.value })} />
            {form.next_event_type === 'OTHER_COURT_DIRECTED' && <textarea required className='rounded-lg border p-2 bg-transparent md:col-span-2' placeholder='Details of the exceptional court direction' value={form.court_direction_details} onChange={(e) => setForm({ ...form, court_direction_details: e.target.value })} />}
          </div>
          {message && <p className='mt-3 text-sm'>{message}</p>}
          <button disabled={saving} className='mt-3 rounded-lg bg-primary px-4 py-2 text-white disabled:opacity-60'>{saving ? 'Saving…' : 'Save proceeding'}</button>
        </form>
      )}
    </div>
  );
}
