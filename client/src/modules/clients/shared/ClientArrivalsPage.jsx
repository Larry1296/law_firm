import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '@/core/api/axios';
import { BellRing, Loader2, UserPlus } from 'lucide-react';
import { TextInput, SelectInput } from '@/components/forms';
import Button3D from '@/components/ui/Button3D';
import Card from '@/components/ui/Card';
import Swal from '@/core/utils/themedSwal';
import ClientQueueBoard from './ClientQueueBoard';
import QueueConfiguration from './QueueConfiguration';
import { useClientQueue, useQueueAction } from './useClientQueue';

const emptyArrival = { visitor_name: '', client: '', advocate: '', urgency_flag: false, urgency_note: '' };
const emptyIntake = { contact_details: '', acting_capacity: '', other_parties: '', broad_issue: '', deadline: '' };
const intakeLabels = { contact_details: 'Contact details', acting_capacity: 'Acting personally or representing someone', other_parties: 'Other parties', broad_issue: 'Broad nature of enquiry', deadline: 'Known deadline' };
const errorText = (error) => {
  const data = error?.response?.data;
  return typeof data === 'string' ? data : data ? Object.entries(data).map(([key, value]) => `${key === 'detail' ? '' : `${key}: `}${Array.isArray(value) ? value.join(', ') : value}`).join(' ') : 'Unable to save. Please try again.';
};

export default function ClientArrivalsPage() {
  const queryClient = useQueryClient();
  const [arrival, setArrival] = useState(emptyArrival);
  const [selected, setSelected] = useState(null);
  const [intake, setIntake] = useState(emptyIntake);
  const [error, setError] = useState('');
  const [clientLinks, setClientLinks] = useState({});
  const { data, isLoading, isError } = useClientQueue();
  const queueAction = useQueueAction();
  const mutation = useMutation({
    mutationFn: async ({ id, payload }) => (await axios.post(id ? `/arrivals/${id}/` : '/arrivals/', payload)).data,
    onSuccess: (_result, variables) => {
      setError('');
      if (!variables.id) setArrival(emptyArrival);
      const messages = {
        LINK_CLIENT: ['Client linked', 'The arrival is now linked to the client record. Conflict clearance and matter opening remain separate.'],
        INTAKE: ['Intake saved', 'The preliminary intake details have been recorded.'],
        START: ['Consultation started', 'The waiting queue has been updated.'],
        COMPLETE: ['Consultation completed', 'The visit has been marked as completed.'],
        LEFT: ['Visit updated', 'The visitor has been marked as left.'],
      };
      const [title, text] = variables.id
        ? (messages[variables.payload.action] || ['Visit updated', 'Your changes have been saved.'])
        : ['Added to queue', `${variables.payload.visitor_name} is in the waiting queue. The advocate has been alerted.`];
      Swal.fire({ icon: 'success', title, text, confirmButtonText: 'Done' });
      if (variables.payload.action === 'INTAKE') setSelected(null);
      queryClient.invalidateQueries({ queryKey: ['client-arrivals'] });
    },
    onError: (err) => { if (err?.isActionCancelled) return;
      const message = errorText(err);
      setError(message);
      Swal.fire({ icon: 'error', title: 'Could not save', text: message, confirmButtonText: 'Try again' });
    },
  });
  const act = (id, action) => queueAction.mutate({ id, action });
  const pending = mutation.isPending || queueAction.isPending || isError;
  if (isLoading) return <p className='p-6'>Loading arrivals…</p>;
  if (isError && !data) return <p role='alert' className='p-6'>Unable to load arrivals. Your account must have active intake or advocate access.</p>;
  const waiting = data.visits.filter((visit) => visit.status === 'WAITING');
  const positions = new Map();
  const counts = {};
  waiting.forEach((visit) => { counts[visit.advocate] = (counts[visit.advocate] || 0) + 1; positions.set(visit.id, counts[visit.advocate]); });
  return (
    <div className='space-y-6 p-4 text-[color:var(--text-primary)] md:p-6'>
      <div><h1 className='text-2xl font-semibold'>Client arrivals & waiting queue</h1>
        <p className='mt-2 text-[color:var(--text-muted)]'>{data.has_receptionist ? 'Reception handles preliminary intake, then the advocate calls the client.' : 'The secretary records arrival and alerts the advocate. The advocate asks the intake questions during consultation.'}</p>
        {data.role === 'RECEPTIONIST' && <p className='mt-1 text-sm'>You are signed in as a designated receptionist.</p>}
      </div>
      {isError && <p role='alert' className='form-alert'>Queue updates are unavailable. Refresh before calling or receiving another client.</p>}
      {error && <p role='alert' className='form-alert'>{error}</p>}
      {data.role === 'ADMIN' && <QueueConfiguration />}
      <ClientQueueBoard data={data} pending={pending} onAction={act} />
      {data.can_receive && <Card className='overflow-hidden'>
        <div className='flex items-start gap-3 border-b border-[color:var(--border)] p-5 md:p-6'>
          <span className='rounded-xl bg-[color:var(--form-primary-soft)] p-3 text-[color:var(--form-primary)]'><UserPlus size={22} aria-hidden='true' /></span>
          <div><h2 className='text-lg font-semibold'>Record arrival</h2>
            <p className='form-hint mt-1'>Record basic arrival details here. Arrival does not accept instructions or open a case.</p>
          </div>
        </div>
        <form className='space-y-5 p-5 md:p-6' onSubmit={(event) => { event.preventDefault(); mutation.mutate({ payload: { ...arrival, client: arrival.client || null } }); }}>
          <fieldset disabled={pending} className='grid gap-5 md:grid-cols-3'>
            <TextInput name='visitor_name' label='Visitor name' required maxLength={255} placeholder='Enter the visitor’s full name' value={arrival.visitor_name} onChange={(event) => setArrival({ ...arrival, visitor_name: event.target.value })} />
            <SelectInput name='client' label='Client record' placeholder='New enquiry / no client record' options={data.clients} value={arrival.client} onChange={(event) => setArrival({ ...arrival, client: event.target.value })} />
            <SelectInput name='advocate' label='Advocate' required placeholder='Select advocate' options={data.advocates} value={arrival.advocate} onChange={(event) => setArrival({ ...arrival, advocate: event.target.value })} />
          </fieldset>
          <div className='space-y-4 rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] p-4'>
            <label className='flex cursor-pointer items-start gap-3 text-sm font-medium'>
              <input type='checkbox' className='mt-0.5 h-4 w-4 accent-[var(--form-primary)]' disabled={pending} checked={arrival.urgency_flag} onChange={(event) => setArrival({ ...arrival, urgency_flag: event.target.checked })} />Client has mentioned an urgent issue
            </label>
            {arrival.urgency_flag && <TextInput name='urgency_note' label='Urgency mentioned' maxLength={500} disabled={pending} value={arrival.urgency_note} onChange={(event) => setArrival({ ...arrival, urgency_note: event.target.value })} />}
          </div>
          <div className='flex flex-col gap-3 border-t border-[color:var(--border)] pt-5 sm:flex-row sm:items-center sm:justify-between'>
            <p className='form-hint text-sm'>The selected advocate will be notified of this arrival.</p>
            <Button3D type='submit' size='lg' className='w-full gap-2 shadow-[var(--form-shadow)] sm:w-auto' disabled={pending || !data.advocates.length}>
              {mutation.isPending ? <Loader2 size={18} className='animate-spin' aria-hidden='true' /> : <BellRing size={18} aria-hidden='true' />}
              {mutation.isPending ? 'Adding to queue…' : 'Add to queue & alert advocate'}
            </Button3D>
          </div>
          {!data.advocates.length && <p className='form-hint'>Add an active advocate account before recording arrivals.</p>}
        </form>
      </Card>}
      <section className='space-y-3'><h2 className='text-lg font-semibold'>Waiting and consultations</h2>
        {!data.visits.length && <p>No visits in the queue or completed today.</p>}
        {data.visits.map((visit) => <Card key={visit.id} className='space-y-3 p-5'>
          <div className='flex flex-wrap items-center justify-between gap-2'><h3 className='font-semibold'>{visit.visitor_name}</h3><span>{visit.status === 'CALLED' ? 'Ready to usher in' : visit.status.replaceAll('_', ' ')}{positions.has(visit.id) ? ` · Queue position ${positions.get(visit.id)}` : ''}</span></div>
          <p className='text-sm font-medium'>{visit.office_location || 'Office not assigned'}</p>
          <p className='text-sm'>{visit.advocate_name} · Arrived {new Date(visit.arrival_at).toLocaleString()} · Received by {visit.received_by_name}</p>
          {visit.urgency_flag && <p className='text-amber-700 dark:text-amber-300'>Urgent issue mentioned: {visit.urgency_note || 'Advocate to assess'}</p>}
          <p className='text-sm'>Intake: {visit.intake_completed_at ? 'Completed' : `Awaiting ${visit.intake_handler.toLowerCase()}`}</p>
          {visit.intake_completed_at && visit.broad_issue && <dl className='grid gap-2 text-sm md:grid-cols-2'>
            {Object.entries(intakeLabels).filter(([key]) => visit[key]).map(([key, label]) => <div key={key}><dt className='font-medium'>{label}</dt><dd>{visit[key]}</dd></div>)}
          </dl>}
          <div className='flex flex-wrap gap-3'>
            {visit.can_record_intake && <Button3D variant='outlineLight' disabled={pending} onClick={() => { setSelected(visit.id); setIntake(Object.fromEntries(Object.keys(emptyIntake).map((key) => [key, visit[key] || '']))); }}>Record preliminary intake</Button3D>}
            {data.role === 'ADMIN' && visit.status === 'WAITING' && <Button3D variant='outlineLight' disabled={pending || data.queues?.some((q) => q.advocate === visit.advocate && (q.current || q.called))} onClick={async () => {

              act(visit.id, 'CALL');
            }}>Call this client</Button3D>}
            {visit.can_usher && visit.status === 'CALLED' && <Button3D disabled={pending} onClick={() => act(visit.id, 'USHER')}>Client ushered in</Button3D>}
            {visit.can_consult && visit.status === 'CALLED' && <Button3D variant='outlineLight' disabled={pending} onClick={() => act(visit.id, 'START')}>Client is in office</Button3D>}
            {visit.can_consult && visit.status === 'IN_CONSULTATION' && <Button3D variant='outlineLight' disabled={pending} onClick={() => act(visit.id, 'COMPLETE')}>Complete consultation</Button3D>}
            {['WAITING', 'CALLED'].includes(visit.status) && <Button3D variant='outlineLight' disabled={pending} onClick={() => act(visit.id, 'LEFT')}>Mark as left</Button3D>}
          </div>
          {visit.client && ['ADMIN', 'SECRETARY', 'RECEPTIONIST'].includes(data.role) && <a className='inline-block text-sm font-semibold underline' href={`/${data.role === 'ADMIN' ? 'admin' : 'secretary'}/clients/${visit.client}`}>Continue client onboarding and proposed matter</a>}
          {!visit.client && visit.intake_completed_at && ['IN_CONSULTATION', 'COMPLETED'].includes(visit.status) && data.can_receive && <div className='space-y-3 border-t pt-3'>
            <p className='text-sm'>Create or select the client record after consultation, then link this arrival.</p>
            <a className='inline-block text-sm font-semibold underline' href={`/${data.role === 'ADMIN' ? 'admin' : 'secretary'}/clients/create`}>Create prospective client</a>
            <SelectInput name={`link-client-${visit.id}`} label='Client to link to this arrival' placeholder='Select the client record' options={data.clients} value={clientLinks[visit.id] || ''} onChange={(event) => setClientLinks({ ...clientLinks, [visit.id]: event.target.value })} />
            <Button3D disabled={pending || !clientLinks[visit.id]} onClick={() => mutation.mutate({ id: visit.id, payload: { action: 'LINK_CLIENT', client: clientLinks[visit.id] } })}>Link client record</Button3D>
          </div>}
          {selected === visit.id && visit.can_record_intake && <form className='space-y-4 border-t border-[color:var(--border)] pt-4' onSubmit={(event) => { event.preventDefault(); mutation.mutate({ id: visit.id, payload: { action: 'INTAKE', ...intake, deadline: intake.deadline || null } }); }}>
            <p className='text-sm'>Keep this preliminary. Record detailed instructions through the existing matter and conflict-check workflow.</p>
            <fieldset disabled={pending} className='grid gap-4 md:grid-cols-2'>
              {Object.entries(intakeLabels).map(([key, label]) => <TextInput key={key} name={`intake-${visit.id}-${key}`} label={label} type={key === 'deadline' ? 'date' : 'text'} required={key === 'broad_issue'} maxLength={key === 'other_parties' ? 1000 : key === 'broad_issue' ? 500 : 255} value={intake[key]} onChange={(event) => setIntake({ ...intake, [key]: event.target.value })} />)}
            </fieldset>
            <div className='flex flex-wrap gap-3'>
              <Button3D type='submit' disabled={pending}>{mutation.isPending ? 'Saving…' : 'Complete preliminary intake'}</Button3D>
              <Button3D variant='outlineLight' disabled={pending} onClick={() => setSelected(null)}>Cancel</Button3D>
            </div>
          </form>}
        </Card>)}
      </section>
    </div>
  );
}
