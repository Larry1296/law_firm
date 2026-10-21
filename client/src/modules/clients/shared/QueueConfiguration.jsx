import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DoorOpen, Settings2 } from 'lucide-react';
import axios from '@/core/api/axios';
import { TextInput, SelectInput } from '@/components/forms';
import Card from '@/components/ui/Card';
import Button3D from '@/components/ui/Button3D';
import Swal from '@/core/utils/themedSwal';
import { getApiErrorMessage } from '@/core/utils/errorMessages';

export default function QueueConfiguration() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(null);
  const cache = useQueryClient();
  const { data, isPending, isError } = useQuery({ queryKey: ['queue-configuration'], enabled: open,
    queryFn: async () => (await axios.get('/admin/firm/queue-configuration/')).data });
  const form = draft || data;
  const save = useMutation({
    mutationFn: async () => (await axios.patch('/admin/firm/queue-configuration/', {
      reception_mode: form.reception_mode,
      offices: form.advocates.map((x) => ({ advocate: x.id, office_location: x.office_location })),
      secretary_assignments: form.secretaries.map((x) => ({ secretary: x.id, advocates: x.advocates })),
    })).data,
    onSuccess: (result) => {
      cache.setQueryData(['queue-configuration'], result);
      cache.invalidateQueries({ queryKey: ['client-arrivals'] });
      cache.invalidateQueries({ queryKey: ['admin-staff'] });
      cache.invalidateQueries({ queryKey: ['admin-firm-settings'] });
      setDraft(null);
      Swal.fire({ icon: 'success', title: 'Queue setup saved', text: 'Office labels and reception coverage have been updated.', confirmButtonText: 'Done' });
    },
    onError: (error) => Swal.fire({ icon: 'error', title: 'Could not save queue setup', text: getApiErrorMessage(error) }),
  });
  const updateOffice = (id, value) => setDraft({ ...form, advocates: form.advocates.map((x) => x.id === id ? { ...x, office_location: value } : x) });
  const toggle = (secretaryId, lawyerId) => setDraft({ ...form, secretaries: form.secretaries.map((x) => x.id !== secretaryId ? x : {
    ...x, advocates: x.advocates.includes(lawyerId) ? x.advocates.filter((id) => id !== lawyerId) : [...x.advocates, lawyerId],
  }) });
  return <Card className='p-5 text-[color:var(--text-primary)] md:p-6'>
    <div className='flex flex-wrap items-center justify-between gap-3'>
      <div><h2 className='flex items-center gap-2 text-lg font-semibold'><DoorOpen size={21} aria-hidden='true' />Offices & reception coverage</h2><p className='form-hint mt-1 text-sm'>Label each advocate’s room and choose how secretaries cover the firm. You can reshuffle these assignments at any time.</p></div>
      <Button3D variant='outlineLight' aria-expanded={open} onClick={() => setOpen(!open)}><Settings2 size={17} aria-hidden='true' />{open ? 'Hide queue setup' : 'Configure queue'}</Button3D>
    </div>
    {open && <div className='mt-5'>
      {isPending && <p>Loading queue setup…</p>}
      {isError && <p role='alert' className='form-alert'>Unable to load queue setup.</p>}
      {form && <form className='space-y-5' onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>
        <fieldset disabled={save.isPending} className='space-y-5'>
          <SelectInput name='queue-reception-mode' label='Reception coverage' value={form.reception_mode} placeholder={null} onChange={(event) => setDraft({ ...form, reception_mode: event.target.value })} options={[
            { value: 'SHARED', label: 'Shared reception — secretaries cover all advocates' },
            { value: 'ASSIGNED', label: 'Assigned secretaries — each sees only their advocates' },
          ]} />
          <p className='form-hint text-sm'>Designated receptionists cover the whole firm in either mode. One secretary can be assigned to several advocates; several secretaries can support the same advocate.</p>
          <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>{form.advocates.map((x) => <TextInput key={x.id} name={`office-${x.id}`} label={`${x.name} — office / room`} help={x.branch || undefined} placeholder='e.g. Room 201, second floor' maxLength={255} value={x.office_location} onChange={(event) => updateOffice(x.id, event.target.value)} />)}</div>
          {!form.advocates.length && <p className='form-hint'>Create an advocate account to assign an office.</p>}
          {form.secretaries.map((secretary) => <fieldset key={secretary.id} className='rounded-xl border border-[color:var(--border)] p-4'>
            <legend className='px-2 font-semibold'>{secretary.name}{secretary.is_receptionist ? ' · Receptionist' : ''}</legend>
            {secretary.is_receptionist ? <p className='form-hint text-sm'>Covers all advocates for reception.</p> : <div className='grid gap-3 sm:grid-cols-2'>
              {form.advocates.map((lawyer) => <label key={lawyer.id} className='flex items-center gap-2 text-sm'><input type='checkbox' className='accent-[var(--form-primary)]' checked={secretary.advocates.includes(lawyer.id)} onChange={() => toggle(secretary.id, lawyer.id)} />{lawyer.name}</label>)}
              {form.reception_mode === 'ASSIGNED' && !secretary.advocates.length && <p className='form-hint text-sm'>Assign at least one advocate so this secretary can receive clients.</p>}
            </div>}
          </fieldset>)}
        </fieldset>
        <div className='flex flex-wrap gap-3'><Button3D type='submit' disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save offices & coverage'}</Button3D><Button3D variant='outlineLight' disabled={save.isPending} onClick={() => { setDraft(null); setOpen(false); }}>Cancel</Button3D></div>
      </form>}
    </div>}
  </Card>;
}
