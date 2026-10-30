import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import eventsService from '@/modules/events/services/eventsService';

const CHANNELS = [
  { value: 'PHONE', label: 'Phone call' },
  { value: 'SMS', label: 'SMS' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'IN_PERSON', label: 'In person' },
];

const OUTCOMES = [
  { status: 'NOTIFIED', label: 'Told the client' },
  { status: 'CONFIRMED', label: 'Client confirmed' },
  { status: 'UNREACHABLE', label: 'Could not reach' },
];

// A client without the portal hears of a court date from the advocate; this records that they did, and how.
export default function ClientAwarenessControl({ event, clientName, clientPhone }) {
  const queryClient = useQueryClient();
  const awareness = event.client_awareness;
  const [channel, setChannel] = useState(awareness?.confirmation_channel || 'PHONE');
  const save = useMutation({
    mutationFn: (status) => eventsService.updateAwareness(event.id, { status, confirmation_channel: channel }),
    onSuccess: () => queryClient.invalidateQueries(),
  });

  if (!event.is_client_visible || new Date(event.starts_at) < new Date()) return null;
  const status = awareness?.status || 'NOT_NOTIFIED';
  const told = ['NOTIFIED', 'CONFIRMED'].includes(status);

  return (
    <div className={`mt-3 rounded-lg border p-3 text-sm ${told ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30' : 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30'}`}>
      <p className='font-semibold text-text-primary-light dark:text-text-primary-dark'>
        {told
          ? `${clientName || 'Client'} ${status === 'CONFIRMED' ? 'confirmed this date' : 'was told'}${awareness?.confirmation_channel ? ` (${CHANNELS.find((item) => item.value === awareness.confirmation_channel)?.label || awareness.confirmation_channel})` : ''}`
          : `Tell ${clientName || 'the client'} about this date${clientPhone ? `: ${clientPhone}` : ''}`}
        {status === 'UNREACHABLE' && ' · could not be reached'}
      </p>
      {status !== 'CONFIRMED' && (
        <div className='mt-2 flex flex-wrap items-center gap-2'>
          <select aria-label='How the client was told' className='form-control w-auto py-1' value={channel} onChange={(e) => setChannel(e.target.value)}>
            {CHANNELS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          {OUTCOMES.filter((item) => item.status !== status).map((item) => (
            <button key={item.status} type='button' disabled={save.isPending} onClick={() => save.mutate(item.status)} className='rounded-lg border border-border-light px-3 py-1.5 font-semibold text-brand-primary hover:bg-brand-primary/5 disabled:opacity-50 dark:border-border-dark'>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
