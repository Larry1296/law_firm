import {afterEach, expect, it} from 'vitest';
import {cleanup, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import '@testing-library/jest-dom/vitest';
import MyWorkList from './MyWorkList';
afterEach(cleanup);

const renderList = (tasks) => render(
  <QueryClientProvider client={new QueryClient({defaultOptions: {queries: {retry: false}}})}>
    <MemoryRouter>
      <MyWorkList queryKey={['work', tasks.length]} queryFn={async () => ({tasks})} caseBasePath='/lawyer/cases' subtitle='Mine' />
    </MemoryRouter>
  </QueryClientProvider>,
);

it('shows each deadline with its matter link and flags overdue items', async () => {
  renderList([
    {id: '1', kind: 'DEADLINE', title: 'Response', description: 'Defence due (Order 7 rule 1).', priority: 'HIGH', due_at: '2020-01-01T14:00:00Z', overdue: true, case_id: 'm1', case_number: 'MAT-2026-00001', client_name: 'Kamau Hardware Limited'},
    {id: '2', kind: 'TASK', title: 'Draft witness statement', description: '', priority: 'MEDIUM', due_at: null, overdue: false, case_id: 'm1', case_number: 'MAT-2026-00001', client_name: 'Kamau Hardware Limited'},
  ]);
  expect(await screen.findByText('Defence due (Order 7 rule 1).')).toBeInTheDocument();
  expect(screen.getAllByRole('link', {name: 'MAT-2026-00001 · Kamau Hardware Limited'})[0]).toHaveAttribute('href', '/lawyer/cases/m1');
  expect(screen.getByText(/^Overdue · /)).toBeInTheDocument();
  expect(screen.getByText('No due date')).toBeInTheDocument();
});

it('says plainly when nothing is assigned', async () => {
  renderList([]);
  expect(await screen.findByText('Nothing is assigned to you right now.')).toBeInTheDocument();
});
