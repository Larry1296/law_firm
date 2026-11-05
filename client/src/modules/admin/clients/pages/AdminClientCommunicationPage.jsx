import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import axiosInstance from '@/core/api/axios';
import useAuth from '@/core/hooks/useAuth';
import { FormAlert, FormButton, FormCard, FormGrid, FormHeader, FormPage, FormSection, SelectInput, TextArea, TextInput } from '@/components/forms';
import { serverNow } from '@/core/utils/serverClock';
import adminClientsService from '../services/adminClientsService';
import useLiveRefresh from '@/core/live/useLiveRefresh';

const CHANNELS = [
  ['TELEPHONE', 'Telephone'],
  ['IN_PERSON', 'In-person meeting'],
  ['WHATSAPP', 'WhatsApp'],
  ['EMAIL', 'Email'],
  ['LETTER', 'Letter'],
  ['VIDEO', 'Video meeting'],
  ['CLIENT_PORTAL', 'Client portal'],
  ['COURT_ATTENDANCE', 'Court attendance'],
  ['OTHER', 'Other'],
].map(([value, label]) => ({ value, label }));
const CHANNEL_LABEL = Object.fromEntries(CHANNELS.map((option) => [option.value, option.label]));
const DIRECTIONS = [{ value: 'OUTGOING', label: 'Firm contacted the client' }, { value: 'INCOMING', label: 'Client contacted the firm' }];

const nowLocal = () => {
  const now = serverNow();
  now.setSeconds(0, 0);
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const blankForm = () => ({ occurred_at: nowLocal(), channel: 'TELEPHONE', direction: 'OUTGOING', subject: '', summary: '', advice_given: '', instructions_received: '', instructions_confirmed_in_writing: false, follow_up_required: false, follow_up_deadline: '' });

export default function AdminClientCommunicationPage() {
  const { id } = useParams();
  const { user } = useAuth() || {};
  const [client, setClient] = useState(null);
  const [matterId, setMatterId] = useState('');
  const [records, setRecords] = useState([]);
  const [form, setForm] = useState(blankForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminClientsService.getClientDetails(id).then((data) => {
      setClient(data.client);
      const matters = data.client?.cases || [];
      if (matters.length === 1) setMatterId(matters[0].id);
    });
  }, [id]);
  const loadRecords = (matter) => axiosInstance.get(`/communications/matters/${matter}/records/`).then(({ data }) => setRecords(data.communications || []));
  useEffect(() => { if (matterId) loadRecords(matterId); }, [matterId]);
  useLiveRefresh(() => loadRecords(matterId), { enabled: Boolean(matterId) });

  const matterOptions = useMemo(() => (client?.cases || []).map((matter) => ({ value: matter.id, label: `${matter.reference} · ${matter.title}` })), [client]);
  const change = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      await axiosInstance.post(`/communications/matters/${matterId}/records/`, {
        ...form,
        communication_type: 'ATTENDANCE_NOTE',
        occurred_at: new Date(form.occurred_at).toISOString(),
        follow_up_deadline: form.follow_up_required && form.follow_up_deadline ? new Date(form.follow_up_deadline).toISOString() : null,
        participants: [user?.full_name, client?.full_name].filter(Boolean),
        responsible_staff: user?.id,
      });
      setForm(blankForm());
      await loadRecords(matterId);
    } catch (err) {
      setError(err.userMessage || 'The attendance note could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormPage>
      <FormHeader eyebrow='Attendance notes' title='Client Communications' description={`Record each call, meeting or message with ${client?.full_name || 'the client'}: what was discussed, the advice given and any instructions received.`} />
      <FormCard>
        <SelectInput label='Matter' name='matter' required value={matterId} onChange={(event) => { setRecords([]); setMatterId(event.target.value); }} options={matterOptions} placeholder={matterOptions.length ? 'Select a matter' : 'This client has no open matter'} />
      </FormCard>
      {matterId && (
        <FormCard>
          <form className='space-y-5' onSubmit={submit}>
            <FormSection title='New attendance note'>
              <FormGrid columns={3}>
                <TextInput label='Date and time' name='occurred_at' type='datetime-local' required value={form.occurred_at} max={nowLocal()} onChange={change} />
                <SelectInput label='How' name='channel' required placeholder={null} value={form.channel} onChange={change} options={CHANNELS} />
                <SelectInput label='Who made contact' name='direction' required placeholder={null} value={form.direction} onChange={change} options={DIRECTIONS} />
              </FormGrid>
              <TextInput label='Subject' name='subject' required value={form.subject} onChange={change} />
              <TextArea label='What was discussed' name='summary' required minRows={3} value={form.summary} onChange={change} />
              <TextArea label='Advice given' name='advice_given' optional minRows={2} value={form.advice_given} onChange={change} />
              <TextArea label='Instructions received' name='instructions_received' optional minRows={2} value={form.instructions_received} onChange={change} />
              <label className='flex items-center gap-2 text-sm'><input type='checkbox' name='instructions_confirmed_in_writing' checked={form.instructions_confirmed_in_writing} onChange={change} />Instructions confirmed in writing</label>
              <label className='flex items-center gap-2 text-sm'><input type='checkbox' name='follow_up_required' checked={form.follow_up_required} onChange={change} />Follow-up needed</label>
              {form.follow_up_required && <TextInput label='Follow up by' name='follow_up_deadline' type='datetime-local' required value={form.follow_up_deadline} min={nowLocal()} onChange={change} />}
            </FormSection>
            {error && <FormAlert variant='error'>{error}</FormAlert>}
            <FormButton type='submit' disabled={saving}>{saving ? 'Saving…' : 'Save attendance note'}</FormButton>
          </form>
        </FormCard>
      )}
      {matterId && (
        <FormCard>
          <FormSection title='Notes on this matter'>
            {records.length === 0 && <p className='text-sm text-text-muted-light dark:text-text-muted-dark'>No attendance notes recorded yet.</p>}
            <div className='space-y-3'>
              {records.map((record) => (
                <article className='rounded-lg border border-border-light p-4 dark:border-border-dark' key={record.id}>
                  <div className='flex flex-wrap items-baseline justify-between gap-2'><b>{record.subject}</b><span className='text-xs text-text-muted-light dark:text-text-muted-dark'>{CHANNEL_LABEL[record.channel] || record.channel} · {record.direction === 'INCOMING' ? 'Client contacted the firm' : 'Firm contacted the client'} · {new Date(record.occurred_at).toLocaleString()}</span></div>
                  <p className='mt-2 whitespace-pre-line text-sm'>{record.summary}</p>
                  {record.advice_given && <p className='mt-2 whitespace-pre-line text-sm'><b>Advice:</b> {record.advice_given}</p>}
                  {record.instructions_received && <p className='mt-2 whitespace-pre-line text-sm'><b>Instructions:</b> {record.instructions_received}{record.instructions_confirmed_in_writing ? ' (confirmed in writing)' : ''}</p>}
                  {record.follow_up_required && <p className='mt-2 text-sm font-semibold text-error'>Follow up by {new Date(record.follow_up_deadline).toLocaleString()}</p>}
                </article>
              ))}
            </div>
          </FormSection>
        </FormCard>
      )}
    </FormPage>
  );
}
