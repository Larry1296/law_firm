import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarCheck, Search } from 'lucide-react';
import axios from '@/core/api/axios';
import Button3D from '@/components/ui/Button3D';
import { TextInput } from '@/components/forms';

const time = (value) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

function useClientSearch(query, enabled) {
  const [term, setTerm] = useState('');
  const next = query.trim().length >= 3 ? query.trim() : '';
  useEffect(() => { const timer = setTimeout(() => setTerm(next), 300); return () => clearTimeout(timer); }, [next]);
  return useQuery({
    queryKey: ['arrival-clients', term],
    queryFn: async () => (await axios.get('/arrivals/clients/', { params: { q: term } })).data,
    enabled: enabled && !!term,
  });
}

/**
 * Who has arrived: a client expected today comes first, then any existing client
 * found by name or an identifier. A new visitor is entered below the picker.
 */
export default function ArrivalClientPicker({ expected = [], chosen, onChoose, onClear, disabled }) {
  const [query, setQuery] = useState('');
  const search = useClientSearch(query, !chosen);
  const results = (query.trim().length >= 3 && search.data) || [];

  if (chosen) {
    return (
      <div role='status' className='flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[color:var(--form-primary)] p-4 text-sm'>
        <span><span className='font-semibold'>Client record: {chosen.label}</span>
          {chosen.detail && <><br /><span className='form-hint'>{chosen.detail}</span></>}</span>
        <Button3D size='sm' variant='outlineLight' disabled={disabled} onClick={() => { setQuery(''); onClear(); }}>Change</Button3D>
      </div>
    );
  }

  const pickMeeting = (meeting) => onChoose({
    client: meeting.client, appointment: meeting.appointment, label: meeting.client_name, phone: meeting.client_phone,
    advocate: meeting.advocate, detail: `Expected at ${time(meeting.starts_at)} · ${meeting.matter}${meeting.advocate_name ? ` · ${meeting.advocate_name}` : ''}`,
  });
  const pickClient = (client) => {
    // A client found by search who was expected today still keeps their appointment.
    const meeting = expected.find((item) => item.client === client.value && !item.arrived);
    if (meeting) return pickMeeting(meeting);
    return onChoose({ client: client.value, appointment: '', label: client.label, phone: client.phone, detail: 'Existing client, no appointment today' });
  };

  return (
    <div className='space-y-4'>
      {expected.length > 0 && <div className='space-y-2'>
        <p className='flex items-center gap-2 text-sm font-semibold'><CalendarCheck size={16} aria-hidden='true' />Expected today ({expected.length})</p>
        <ul className='space-y-2'>
          {expected.map((meeting) => <li key={meeting.appointment} className='flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[color:var(--border)] p-3 text-sm'>
            <span><span className='font-medium'>{time(meeting.starts_at)} · {meeting.client_name}</span><br />
              <span className='form-hint'>{meeting.title} · {meeting.matter}{meeting.advocate_name ? ` · ${meeting.advocate_name}` : ''}</span></span>
            {meeting.arrived ? <span className='text-sm font-medium'>Arrived</span>
              : <Button3D size='sm' variant='outlineLight' disabled={disabled} onClick={() => pickMeeting(meeting)}>Has arrived</Button3D>}
          </li>)}
        </ul>
      </div>}
      <div className='space-y-2'>
        <TextInput name='client_search' label='Find an existing client' maxLength={100} disabled={disabled}
          placeholder='Name, phone, ID or passport number, KRA PIN or file reference'
          help='For a client who has instructed the firm before but has no appointment today.'
          value={query} onChange={(event) => setQuery(event.target.value)} />
        {results.length > 0 && <ul className='space-y-2'>
          {results.map((client) => <li key={client.value} className='flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[color:var(--border)] p-3 text-sm'>
            <span><span className='font-medium'>{client.label}</span><br />
              <span className='form-hint'>{[client.phone, client.identifier && `ID ${client.identifier}`, client.file_reference && `File ${client.file_reference}`].filter(Boolean).join(' · ')}</span></span>
            <Button3D size='sm' variant='outlineLight' disabled={disabled} onClick={() => pickClient(client)}>This is the client</Button3D>
          </li>)}
        </ul>}
        {query.trim().length >= 3 && search.isSuccess && !results.length && <p className='form-hint flex items-center gap-2 text-sm'><Search size={14} aria-hidden='true' />No client record matches. Treat them as a new visitor below.</p>}
        {query.trim().length < 3 && <p className='form-hint text-sm'>A new visitor? Leave this and enter their details below.</p>}
      </div>
    </div>
  );
}
