import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@/core/api/axios';
import { BellRing, History, Loader2, UserPlus } from 'lucide-react';
import { TextInput, SelectInput } from '@/components/forms';
import Button3D from '@/components/ui/Button3D';
import Card from '@/components/ui/Card';
import Swal from '@/core/utils/themedSwal';
import ClientQueueBoard from './ClientQueueBoard';
import { OUTCOMES, useClientQueue, useQueueAction } from './useClientQueue';

const emptyArrival = { visitor_name: '', visitor_phone: '', client: '', advocate: '', urgency_flag: false, urgency_note: '' };
const emptyIntake = { contact_details: '', acting_capacity: '', other_parties: '', broad_issue: '', deadline: '' };
const ON_BEHALF = 'On behalf of: ';
const actingOptions = [{ value: 'PERSONALLY', label: 'Personally' }, { value: 'ON_BEHALF', label: 'On behalf of someone else' }];
// Acting capacity is stored as "Personally" or "On behalf of: <who and in what capacity>".
const splitActing = (value = '') => (value === 'Personally' ? { acting_mode: 'PERSONALLY', acting_for: '' }
  : value.startsWith(ON_BEHALF) ? { acting_mode: 'ON_BEHALF', acting_for: value.slice(ON_BEHALF.length) } : { acting_mode: '', acting_for: '' });
const intakePayload = ({ acting_mode, acting_for, ...intake }) => ({ ...intake, deadline: intake.deadline || null,
  acting_capacity: acting_mode === 'PERSONALLY' ? 'Personally' : acting_mode === 'ON_BEHALF' ? `${ON_BEHALF}${acting_for.trim()}` : '' });
const intakeLabels = { contact_details: 'Contact details', acting_capacity: 'Acting personally or representing someone', other_parties: 'Other parties', broad_issue: 'Broad nature of enquiry', deadline: 'Known deadline' };
const errorText = (error) => {
  const data = error?.response?.data;
  return typeof data === 'string' ? data : data ? Object.entries(data).map(([key, value]) => `${key === 'detail' ? '' : `${key}: `}${Array.isArray(value) ? value.join(', ') : value}`).join(' ') : 'Unable to save. Please try again.';
};

// The visitor register: every client starts as a visitor, so search past visits by phone, or by name.
const registerQuery = ({ visitor_name, visitor_phone }) => {
  const digits = visitor_phone.replace(/\D/g, '');
  return digits.length >= 4 ? visitor_phone.trim() : visitor_name.trim().length >= 3 ? visitor_name.trim() : '';
};

function useVisitorRegister(arrival, enabled) {
  const [term, setTerm] = useState('');
  const next = registerQuery(arrival);
  useEffect(() => { const timer = setTimeout(() => setTerm(next), 300); return () => clearTimeout(timer); }, [next]);
  return useQuery({
    queryKey: ['visitor-register', term],
    queryFn: async () => (await axios.get('/arrivals/visitors/', { params: { q: term } })).data,
    enabled: enabled && !!term,
  });
}

export default function ClientArrivalsPage() {
  const queryClient = useQueryClient();
  const [arrival, setArrival] = useState(emptyArrival);
  const [selected, setSelected] = useState(null);
  const [intake, setIntake] = useState(emptyIntake);
  const [error, setError] = useState('');
  const [chosenVisitor, setChosenVisitor] = useState('');
  const { data, isLoading, isError } = useClientQueue();
  const register = useVisitorRegister(arrival, !!data?.can_receive);
  const returning = chosenVisitor && chosenVisitor === arrival.visitor_phone ? [] : (registerQuery(arrival) && register.data) || [];
  const queueAction = useQueueAction();
  const mutation = useMutation({
    mutationFn: async ({ id, payload }) => (await axios.post(id ? `/arrivals/${id}/` : '/arrivals/', payload)).data,
    onSuccess: (_result, variables) => {
      setError('');
      if (!variables.id) { setArrival(emptyArrival); setChosenVisitor(''); }
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
  const canConductConsultation = ['ADVOCATE', 'ADMIN'].includes(data?.role);
  const pending = mutation.isPending || queueAction.isPending || isError;
  if (isLoading) return <p className='p-6'>Loading arrivals…</p>;
  if (isError && !data) return <p role='alert' className='p-6'>Unable to load arrivals. Your account must have active intake or advocate access.</p>;
  const waiting = data.visits.filter((visit) => visit.status === 'WAITING');
  const positions = new Map();
  const counts = {};
  waiting.forEach((visit) => { counts[visit.advocate] = (counts[visit.advocate] || 0) + 1; positions.set(visit.id, counts[visit.advocate]); });
  const visitCard = (visit) => <Card key={visit.id} className='space-y-3 p-5'>
          <div className='flex flex-wrap items-center justify-between gap-2'><h3 className='font-semibold'>{visit.visitor_name}</h3><span>{visit.status === 'CALLED' ? 'Ready to usher in' : visit.status.replaceAll('_', ' ')}{positions.has(visit.id) ? ` · Queue position ${positions.get(visit.id)}` : ''}</span></div>
          <p className='text-sm font-medium'>{visit.office_location || 'Office not assigned'}</p>
          {visit.visitor_phone && <p className='text-sm'>{visit.visitor_phone} · {visit.previous_visit_count ? `Returning visitor · ${visit.previous_visit_count} previous ${visit.previous_visit_count === 1 ? 'visit' : 'visits'}` : 'First visit'}</p>}
          <p className='text-sm'>{visit.advocate_name} · Arrived {new Date(visit.arrival_at).toLocaleString()} · Received by {visit.received_by_name}</p>
          {visit.urgency_flag && <p className='text-amber-700 dark:text-amber-300'>Urgent issue mentioned: {visit.urgency_note || 'Advocate to assess'}</p>}
          <p className='text-sm'>Intake: {visit.intake_completed_at ? 'Completed' : `Awaiting advocate`}</p>
          {visit.outcome && <p className='text-sm font-medium'>Outcome: {OUTCOMES[visit.outcome]}</p>}
          {visit.status === 'CALLED' && visit.called_at && <p className='text-sm'>Called {new Date(visit.called_at).toLocaleTimeString()}</p>}
          {visit.status === 'IN_CONSULTATION' && visit.consultation_started_at && <p className='text-sm'>In office since {new Date(visit.consultation_started_at).toLocaleTimeString()}</p>}
          {visit.file_due && <p className={`text-sm font-semibold ${visit.file_overdue ? 'text-red-700 dark:text-red-300' : 'text-amber-700 dark:text-amber-300'}`}>{visit.file_overdue ? `Client file overdue — instructions taken on ${new Date(visit.closed_at).toLocaleDateString()}` : visit.can_consult ? 'Create the prospective client record today' : 'Advocate is opening the client file'}</p>}
          {visit.intake_completed_at && visit.broad_issue && <dl className='grid gap-2 text-sm md:grid-cols-2'>
            {Object.entries(intakeLabels).filter(([key]) => visit[key]).map(([key, label]) => <div key={key}><dt className='font-medium'>{label}</dt><dd>{visit[key]}</dd></div>)}
          </dl>}
          <div className='flex flex-wrap gap-3'>
            {canConductConsultation && visit.can_record_intake && <Button3D variant='outlineLight' disabled={pending} onClick={() => { setSelected(visit.id); setIntake({ ...Object.fromEntries(Object.keys(emptyIntake).map((key) => [key, visit[key] || ''])), ...splitActing(visit.acting_capacity) }); }}>Record consultation intake</Button3D>}
            {data.role === 'ADMIN' && visit.status === 'WAITING' && <Button3D variant='outlineLight' disabled={pending || data.queues?.some((q) => q.advocate === visit.advocate && (q.current || q.called))} onClick={async () => {

              act(visit.id, 'CALL');
            }}>Call this client</Button3D>}
            {visit.can_usher && visit.status === 'CALLED' && <Button3D disabled={pending} onClick={() => act(visit.id, 'USHER')}>Client ushered in</Button3D>}
            {visit.can_consult && visit.status === 'CALLED' && <Button3D variant='outlineLight' disabled={pending} onClick={() => act(visit.id, 'START')}>Client is in office</Button3D>}
            {visit.can_consult && visit.status === 'IN_CONSULTATION' && <Button3D variant='outlineLight' disabled={pending} onClick={() => act(visit.id, 'COMPLETE')}>Complete consultation</Button3D>}
            {['WAITING', 'CALLED'].includes(visit.status) && <Button3D variant='outlineLight' disabled={pending} onClick={() => act(visit.id, 'LEFT')}>Mark as left</Button3D>}
          </div>
          {visit.client && data.role === 'ADVOCATE' && <a className='inline-block text-sm font-semibold underline' href={`/lawyer/clients/${visit.client}/conflict-checks/new`}>Record proposed matter / Start conflict check</a>}
          {visit.client && ['ADMIN', 'SECRETARY', 'RECEPTIONIST'].includes(data.role) && <a className='inline-block text-sm font-semibold underline' href={`/${data.role === 'ADMIN' ? 'admin' : 'secretary'}/clients/${visit.client}`}>Continue client onboarding and proposed matter</a>}
          {visit.file_due && visit.can_consult && <div className='space-y-2 border-t pt-3'>
            <p className='text-sm'>You took instructions. Create the prospective client record so the conflict check can start.</p>
            <a className='inline-block text-sm font-semibold underline' href={`/${data.role === 'ADMIN' ? 'admin' : 'lawyer'}/clients/create?visit=${visit.id}`}>Create prospective client</a>
          </div>}
          {selected === visit.id && canConductConsultation && visit.can_record_intake && <form className='space-y-4 border-t border-[color:var(--border)] pt-4' onSubmit={(event) => { event.preventDefault(); mutation.mutate({ id: visit.id, payload: { action: 'INTAKE', ...intakePayload(intake) } }); }}>
            <p className='text-sm'>Keep this preliminary. Record detailed instructions through the existing matter and conflict-check workflow.</p>
            <fieldset disabled={pending} className='grid gap-4 md:grid-cols-2'>
              {Object.entries(intakeLabels).map(([key, label]) => key === 'acting_capacity' ? <div key={key} className='space-y-4'>
                <SelectInput name={`intake-${visit.id}-acting-mode`} label={label} placeholder='Select' options={actingOptions} value={intake.acting_mode || ''} onChange={(event) => setIntake({ ...intake, acting_mode: event.target.value })} />
                {intake.acting_mode === 'ON_BEHALF' && <TextInput name={`intake-${visit.id}-acting-for`} label='Specify who and in what capacity' required maxLength={255 - ON_BEHALF.length} help='For example: director of Baraka Homes Limited, or administrator of the estate of the late J. Kamau.' value={intake.acting_for || ''} onChange={(event) => setIntake({ ...intake, acting_for: event.target.value })} />}
              </div> : <TextInput key={key} name={`intake-${visit.id}-${key}`} label={label} type={key === 'deadline' ? 'date' : 'text'} required={key === 'broad_issue'} maxLength={key === 'other_parties' ? 1000 : key === 'broad_issue' ? 500 : 255} value={intake[key]} onChange={(event) => setIntake({ ...intake, [key]: event.target.value })} />)}
            </fieldset>
            <div className='flex flex-wrap gap-3'>
              <Button3D type='submit' disabled={pending}>{mutation.isPending ? 'Saving…' : 'Save consultation intake'}</Button3D>
              <Button3D variant='outlineLight' disabled={pending} onClick={() => setSelected(null)}>Cancel</Button3D>
            </div>
          </form>}
  </Card>;
  // Reception follows each visitor from arrival, through the advocate's office, to the end of the day.
  // Reception keeps the arrivals register; an advocate sees only their own consultations.
  const stages = data.can_receive ? [
    ['Waiting', 'In arrival order for each advocate.', ['WAITING']],
    ['With advocate', 'Called or ushered in. Details stay here until the advocate completes the consultation.', ['CALLED', 'IN_CONSULTATION']],
    ['Seen today', 'Completed consultations and visitors who left, with the advocate’s outcome.', ['COMPLETED', 'LEFT']],
  ] : [
    ['Waiting for you', 'Reception will usher in the next client when you are ready.', ['WAITING']],
    ['In your office', 'Record the consultation intake, then complete the consultation.', ['CALLED', 'IN_CONSULTATION']],
    ['Seen today and follow-ups', 'Completed consultations, and any client record still to be created.', ['COMPLETED', 'LEFT']],
  ];
  return (
    <div className='space-y-6 p-4 text-[color:var(--text-primary)] md:p-6'>
      <div><h1 className='text-2xl font-semibold'>{data.can_receive ? 'Client arrivals & waiting queue' : 'My consultations'}</h1>
        <p className='mt-2 text-[color:var(--text-muted)]'>{data.self_reception ? 'No secretary covers reception for you, so record each walk-in here yourself, then call them in when you are ready. When the firm adds a secretary, reception passes to them.' : data.can_receive ? 'The secretary or receptionist records arrival, alerts the advocate and ushers the visitor in when called. Only the assigned advocate records legal intake and conducts and completes the consultation.' : 'Clients waiting for you, the client in your office and your follow-ups. Reception records arrivals and ushers clients in.'}</p>
        {data.role === 'RECEPTIONIST' && <p className='mt-1 text-sm'>You are signed in as a designated receptionist.</p>}
      </div>
      {isError && <p role='alert' className='form-alert'>Queue updates are unavailable. Refresh before calling or receiving another client.</p>}
      {error && <p role='alert' className='form-alert'>{error}</p>}
      {data.can_receive && <Card className='overflow-hidden'>
        <div className='flex items-start gap-3 border-b border-[color:var(--border)] p-5 md:p-6'>
          <span className='rounded-xl bg-[color:var(--form-primary-soft)] p-3 text-[color:var(--form-primary)]'><UserPlus size={22} aria-hidden='true' /></span>
          <div><h2 className='text-lg font-semibold'>Record arrival</h2>
            <p className='form-hint mt-1'>Record basic arrival details here. Arrival does not accept instructions or open a case.</p>
          </div>
        </div>
        <form className='space-y-5 p-5 md:p-6' onSubmit={(event) => { event.preventDefault(); mutation.mutate({ payload: { ...arrival, client: arrival.client || null } }); }}>
          <fieldset disabled={pending} className='grid gap-5 md:grid-cols-2'>
            <TextInput name='visitor_name' label='Visitor name' required maxLength={255} placeholder='Enter the visitor’s full name' value={arrival.visitor_name} onChange={(event) => setArrival({ ...arrival, visitor_name: event.target.value })} />
            <TextInput name='visitor_phone' label='Phone number' type='tel' required maxLength={20} placeholder='07XX XXX XXX' help='Recognises the visitor when they come back.' value={arrival.visitor_phone} onChange={(event) => setArrival({ ...arrival, visitor_phone: event.target.value })} />
            <SelectInput name='client' label='Client record' placeholder='New enquiry / no client record' options={data.clients} value={arrival.client} onChange={(event) => setArrival({ ...arrival, client: event.target.value })} />
            <SelectInput name='advocate' label='Advocate' required placeholder='Select advocate' options={data.advocates} value={arrival.advocate} onChange={(event) => setArrival({ ...arrival, advocate: event.target.value })} />
          </fieldset>
          {returning.length > 0 && <div role='status' className='space-y-3 rounded-xl border border-[color:var(--border)] p-4'>
            <p className='flex items-center gap-2 font-semibold'><History size={17} aria-hidden='true' />Returning visitor?</p>
            <ul className='space-y-3'>
              {returning.map((visitor) => <li key={visitor.visitor_phone} className='flex flex-wrap items-center justify-between gap-3 text-sm'>
                <span><span className='font-medium'>{visitor.visitor_name}</span> · {visitor.visitor_phone}<br />
                  <span className='form-hint'>{visitor.visit_count} previous {visitor.visit_count === 1 ? 'visit' : 'visits'} · last {new Date(visitor.last_arrival_at).toLocaleDateString()} with {visitor.last_advocate_name}{visitor.client_name ? ` · Client record: ${visitor.client_name}` : ''}</span></span>
                <Button3D size='sm' variant='outlineLight' disabled={pending} onClick={() => { setChosenVisitor(visitor.visitor_phone);
                  setArrival({ ...arrival, visitor_name: visitor.visitor_name, visitor_phone: visitor.visitor_phone, client: visitor.client && data.clients.some((c) => c.value === visitor.client) ? visitor.client : arrival.client }); }}>This is the visitor</Button3D>
              </li>)}
            </ul>
          </div>}
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
      <ClientQueueBoard data={data} pending={pending} onAction={act} />
      {stages.map(([title, hint, statuses]) => { const rows = data.visits.filter((visit) => statuses.includes(visit.status));
        return <section key={title} className='space-y-3'><div><h2 className='text-lg font-semibold'>{title} ({rows.length})</h2><p className='form-hint text-sm'>{hint}</p></div>
          {rows.length ? rows.map(visitCard) : <p className='text-sm'>None.</p>}
        </section>; })}
    </div>
  );
}
