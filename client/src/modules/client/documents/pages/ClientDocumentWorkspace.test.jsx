import {afterEach, describe, expect, it, vi} from 'vitest';
import {cleanup, render, screen} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {MemoryRouter} from 'react-router-dom';
import documentsService from '@/modules/client/documents/services/documentsService';
import ClientDocumentWorkspace from './ClientDocumentWorkspace';

vi.mock('@/modules/client/documents/services/documentsService', () => ({
  default: {getDocuments: vi.fn(), uploadRequestedDocument: vi.fn()},
}));
afterEach(cleanup);

const request = (id, status, extra = {}) => ({
  id, status, title: `Request ${id}`, case_number: 'MAT-2026-00001', case_title: 'Kamau v Baraka', instructions: '', ...extra,
});

const renderWith = async (requests) => {
  documentsService.getDocuments.mockResolvedValue({requests, documents: [], cases: []});
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter><ClientDocumentWorkspace /></MemoryRouter>
    </QueryClientProvider>,
  );
  await screen.findByText('Request 1');
};

describe('client document requests', () => {
  it.each([
    ['OPEN', true],
    ['REPLACEMENT_REQUIRED', true],
    ['PENDING_SECRETARY', false],
    ['UPLOADED', false],
    ['ACCEPTED', false],
  ])('%s shows an upload control: %s', async (status, canUpload) => {
    await renderWith([request('1', status)]);
    expect(Boolean(screen.queryByRole('button', {name: /upload/i}))).toBe(canUpload);
  });

  it('shows no upload control when nothing is requested', async () => {
    documentsService.getDocuments.mockResolvedValue({requests: [], documents: [], cases: []});
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter><ClientDocumentWorkspace /></MemoryRouter>
      </QueryClientProvider>,
    );
    expect(await screen.findByText('Nothing has been requested from you.')).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: /upload/i})).not.toBeInTheDocument();
  });

  it('explains why a replacement is needed', async () => {
    await renderWith([request('1', 'REPLACEMENT_REQUIRED', {review_notes: 'March delivery note unsigned.'})]);
    expect(screen.getByText(/March delivery note unsigned/)).toBeInTheDocument();
  });
});
