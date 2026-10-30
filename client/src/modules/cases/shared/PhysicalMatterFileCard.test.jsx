import '@testing-library/jest-dom/vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import PhysicalMatterFileCard from './PhysicalMatterFileCard';

const post = vi.hoisted(() => vi.fn(async () => ({ data: {} })));
vi.mock('@/core/api/axios', () => ({ default: { post } }));

const pendingFile = {
  reference: 'MAT-2026-00001',
  status_label: 'Requested',
  assignment_pending: true,
  movements: [],
  matter_places: [
    { id: 'general', path: 'GENERAL REGISTRY', purpose: 'GENERAL' },
    { id: 'drawer-1', path: 'REGISTRY › CABINET B › DRAWER 1', purpose: 'MATTER' },
  ],
};

const renderCard = (props) => render(
  <QueryClientProvider client={new QueryClient()}>
    <PhysicalMatterFileCard physicalFile={pendingFile} caseId='case-1' {...props} />
  </QueryClientProvider>,
);

describe('PhysicalMatterFileCard', () => {
  it('lets whoever keeps the records place a requested file in a matter drawer', async () => {
    renderCard({ canManage: true });
    expect(screen.getByLabelText(/Kept in/)).toHaveValue('drawer-1');
    await userEvent.click(screen.getByRole('button', { name: 'Confirm file prepared' }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/cases/case-1/physical-file/', { operation: 'assign', storage_location_id: 'drawer-1' }));
  });

  it('says so when the confirmation is cancelled instead of failing silently', async () => {
    post.mockRejectedValueOnce(Object.assign(new Error('cancelled'), { isActionCancelled: true }));
    renderCard({ canManage: true });
    await userEvent.click(screen.getByRole('button', { name: 'Confirm file prepared' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Nothing was recorded: the confirmation was cancelled.');
  });

  it('shows no placement form to someone who only requests files', () => {
    renderCard({ canRequest: true });
    expect(screen.queryByRole('button', { name: 'Confirm file prepared' })).not.toBeInTheDocument();
  });
});
