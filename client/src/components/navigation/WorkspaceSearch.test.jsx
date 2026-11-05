import '@testing-library/jest-dom/vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/core/api/axios', () => ({ default: { get: vi.fn() } }));
import axios from '@/core/api/axios';
import AuthContext from '@/core/store/AuthContext';
import WorkspaceSearch from '@/components/navigation/WorkspaceSearch';
import { matchFeatures, publishWorkspaceFeatures } from '@/core/navigation/workspaceFeatures';
import { publishPageSections } from '@/core/navigation/pageSections';

const LINKS = [
  { name: 'Dashboard', path: '/admin/dashboard', section: 'Overview' },
  { name: 'Clients', path: '/admin/clients', section: 'Clients' },
  { name: 'Calendar', path: '/admin/calendar', section: 'Cases' },
  { name: 'Billing', path: '/admin/billing', section: 'Documents & Billing' },
];

function Where() {
  const location = useLocation();
  return <p data-testid='where'>{location.pathname}{location.search}{location.hash}</p>;
}

const start = (path = '/admin/dashboard') => render(
  <AuthContext.Provider value={{ user: { firm: { name: 'Mutiso Advocates' } } }}>
    <MemoryRouter initialEntries={[path]}>
      <WorkspaceSearch />
      <Routes><Route path='*' element={<Where />} /></Routes>
    </MemoryRouter>
  </AuthContext.Provider>,
);

beforeEach(() => {
  vi.clearAllMocks();
  act(() => publishWorkspaceFeatures(LINKS));
  axios.get.mockResolvedValue({ data: { firm: 'Mutiso Advocates', results: [] } });
});

describe('WorkspaceSearch', () => {
  it('finds a feature by another word for it and opens it with Enter', async () => {
    const user = userEvent.setup();
    start();
    await user.keyboard('{Control>}k{/Control}');
    expect(screen.getByRole('dialog', { name: 'Search' })).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveAttribute('placeholder', 'Search features, matters and clients in Mutiso Advocates');
    await user.type(screen.getByRole('combobox'), 'diary');
    expect(screen.getByRole('option', { name: /Calendar/ })).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{Enter}');
    expect(screen.getByTestId('where')).toHaveTextContent('/admin/calendar');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('offers an action inside a page only when that page is in the sidebar', () => {
    const features = [...LINKS];
    expect(matchFeatures([...features, { name: 'New client', path: '/admin/clients/create', words: 'add register' }], 'add client')[0].name).toBe('New client');
  });

  it('lists the firm\'s records from the server and opens the one picked', async () => {
    axios.get.mockResolvedValue({ data: { firm: 'Mutiso Advocates', results: [
      { kind: 'matter', id: 'm1', title: 'Kamau land dispute', detail: 'HCCC 12/2026 · Kamau Land Holdings' },
      { kind: 'staff', id: 'u7', role: 'LAWYER', title: 'Jane Kamau', detail: 'Lawyer' },
    ] } });
    const user = userEvent.setup();
    start();
    await user.click(screen.getByRole('button', { name: 'Search features and records' }));
    await user.type(screen.getByRole('combobox'), 'kamau');
    const option = await screen.findByRole('option', { name: /Jane Kamau/ });
    expect(axios.get).toHaveBeenCalledWith('/search/', expect.objectContaining({ params: { q: 'kamau' } }));
    expect(screen.getByText('Matters · Mutiso Advocates')).toBeInTheDocument();
    await user.click(option);
    expect(screen.getByTestId('where')).toHaveTextContent('/admin/staff/u7?role=LAWYER');
  });

  it('does not look up records in a workspace with no record pages', async () => {
    const user = userEvent.setup();
    start('/hr/dashboard');
    await user.keyboard('/');
    await user.type(screen.getByRole('combobox'), 'kamau');
    await waitFor(() => expect(screen.getByText(/Nothing found for “kamau”/)).toBeInTheDocument());
    expect(axios.get).not.toHaveBeenCalled();
  });

  it('opens a section of the last matter opened from anywhere, in its tab', async () => {
    act(() => publishPageSections({
      path: '/admin/cases/m1',
      title: 'Grace Mwende v Baraka Supplies Ltd',
      entries: [
        { id: 'tab-record', label: 'Matter record', tab: 'Matter record', isTab: true },
        { id: 'record-controls', label: 'Deadlines, workstream & closing', tab: 'Matter record' },
      ],
    }));
    const user = userEvent.setup();
    start();
    await user.keyboard('{Control>}k{/Control}');
    await user.type(screen.getByRole('combobox'), 'Deadlines, workstream & closing');
    const option = screen.getByRole('option', { name: /Deadlines, workstream & closing/ });
    expect(option).toHaveTextContent('Grace Mwende v Baraka Supplies Ltd · Matter record tab');
    await user.click(option);
    expect(screen.getByTestId('where')).toHaveTextContent('/admin/cases/m1#record-controls');
  });
});
