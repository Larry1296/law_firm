import {afterEach, describe, expect, it, vi} from 'vitest';
import {cleanup, render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {MemoryRouter} from 'react-router-dom';
import documentsService from '@/modules/client/documents/services/documentsService';
import ClientDocumentWorkspace from './ClientDocumentWorkspace';

vi.mock('@/modules/client/documents/services/documentsService', () => ({
  default: {getDocuments: vi.fn(), sendDeliveryNotice: vi.fn()},
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
  ])('%s asks the client how the paper will reach the firm: %s', async (status, awaitsClient) => {
    await renderWith([request('1', status)]);
    expect(Boolean(screen.queryByRole('button', {name: /tell the firm/i}))).toBe(awaitsClient);
  });

  it('never offers a file upload', async () => {
    await renderWith([request('1', 'OPEN')]);
    expect(document.querySelector('input[type=file]')).toBeNull();
  });

  it('sends how and when the paper is coming, with no file', async () => {
    documentsService.sendDeliveryNotice.mockResolvedValue({document_id: 'd1'});
    await renderWith([request('1', 'OPEN')]);
    await userEvent.click(screen.getByLabelText('I will send it by courier'));
    await userEvent.click(screen.getByRole('button', {name: /tell the firm/i}));
    await waitFor(() => expect(documentsService.sendDeliveryNotice).toHaveBeenCalledWith('1', {delivery_method: 'COURIER', expected_delivery_date: null, note: ''}));
    expect(await screen.findByText(/The firm will receive the paper/)).toBeInTheDocument();
  });

  it('shows held papers by reference and status, not by cabinet', async () => {
    documentsService.getDocuments.mockResolvedValue({requests: [], cases: [], documents: [{
      id: 'd1', title: 'Copy of national ID', document_type_label: 'Identification Document',
      where: {reference: 'KYC-2026-039/D1', in_file: 'KYC-2026-039', status: 'filed'},
    }]});
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter><ClientDocumentWorkspace /></MemoryRouter>
      </QueryClientProvider>,
    );
    expect(await screen.findByText(/Reference KYC-2026-039\/D1 · in file KYC-2026-039/)).toBeInTheDocument();
    expect(screen.getByText('Filed')).toBeInTheDocument();
  });

  it('shows nothing to answer when nothing is requested', async () => {
    documentsService.getDocuments.mockResolvedValue({requests: [], documents: [], cases: []});
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter><ClientDocumentWorkspace /></MemoryRouter>
      </QueryClientProvider>,
    );
    expect(await screen.findByText('Nothing has been requested from you.')).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: /tell the firm/i})).not.toBeInTheDocument();
  });

  it('explains why a replacement is needed', async () => {
    await renderWith([request('1', 'REPLACEMENT_REQUIRED', {review_notes: 'March delivery note unsigned.'})]);
    expect(screen.getByText(/March delivery note unsigned/)).toBeInTheDocument();
  });
});
