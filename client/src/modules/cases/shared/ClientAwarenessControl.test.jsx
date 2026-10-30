import '@testing-library/jest-dom/vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ClientAwarenessControl from './ClientAwarenessControl';

const updateAwareness = vi.hoisted(() => vi.fn(async () => ({})));
vi.mock('@/modules/events/services/eventsService', () => ({ default: { updateAwareness } }));

const event = { id: 'event-1', is_client_visible: true, starts_at: '2099-11-18T06:00:00Z', client_awareness: { status: 'NOT_NOTIFIED' } };
const renderControl = (props) => render(
  <QueryClientProvider client={new QueryClient()}><ClientAwarenessControl clientName='Grace Mwende' clientPhone='0711234567' {...props} /></QueryClientProvider>,
);

describe('ClientAwarenessControl', () => {
  it('asks the advocate to tell a client without the portal and records how', async () => {
    renderControl({ event });
    expect(screen.getByText('Tell Grace Mwende about this date: 0711234567')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('How the client was told'), { target: { value: 'SMS' } });
    fireEvent.click(screen.getByRole('button', { name: 'Told the client' }));
    await waitFor(() => expect(updateAwareness).toHaveBeenCalledWith('event-1', { status: 'NOTIFIED', confirmation_channel: 'SMS' }));
  });

  it('shows once the client has been told', () => {
    renderControl({ event: { ...event, client_awareness: { status: 'NOTIFIED', confirmation_channel: 'PHONE' } } });
    expect(screen.getByText('Grace Mwende was told (Phone call)')).toBeInTheDocument();
  });
});
