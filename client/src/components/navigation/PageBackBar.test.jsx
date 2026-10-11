import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import PageBackBar from '@/components/navigation/PageBackBar';
import { labelFromPath, parentPath } from '@/core/navigation/backTarget';

function Shell() {
  return (
    <div data-page-content>
      <PageBackBar />
      <Routes>
        <Route path='/admin/dashboard' element={<><h1>Firm dashboard</h1><Link to='/admin/clients'>Clients</Link></>} />
        <Route path='/admin/clients' element={<><h1>Clients</h1><Link to='/admin/clients/4f0c2a1e-1111-4222-8333-944455556666'>Open</Link></>} />
        <Route path='/admin/clients/:id' element={<h1>Achieng &amp; Co</h1>} />
        <Route path='/admin/clients/:id/conflict-checks/:checkId' element={<h1>Conflict check</h1>} />
      </Routes>
    </div>
  );
}

const start = (path) => {
  sessionStorage.clear();
  window.history.replaceState({ idx: 0 }, '', path);
  return render(<BrowserRouter><Shell /></BrowserRouter>);
};

describe('PageBackBar', () => {
  beforeEach(() => sessionStorage.clear());

  it('names the page the user came from and returns to it', async () => {
    const user = userEvent.setup();
    start('/admin/dashboard');
    expect(screen.queryByRole('button', { name: /Back to/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Clients' }));
    expect(await screen.findByRole('button', { name: 'Back to Firm dashboard' })).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Open' }));
    const back = await screen.findByRole('button', { name: 'Back to Clients' });
    await user.click(back);
    await waitFor(() => expect(window.location.pathname).toBe('/admin/clients'));
  });

  it('leads a page opened directly up to its section', async () => {
    const user = userEvent.setup();
    start('/admin/clients/4f0c2a1e-1111-4222-8333-944455556666/conflict-checks/77');
    await user.click(await screen.findByRole('button', { name: 'Back to Clients' }));
    await waitFor(() => expect(window.location.pathname).toBe('/admin/clients'));
  });
});

describe('back targets', () => {
  it('reads a label from the path', () => {
    expect(labelFromPath('/admin/clients/4f0c2a1e-1111-4222-8333-944455556666')).toBe('Client');
    expect(labelFromPath('/lawyer/cases/12?section=documents')).toBe('Case');
    expect(labelFromPath('/admin/communication/notifications')).toBe('Notifications');
    expect(labelFromPath('/platform/overview')).toBe('Overview');
  });

  it('goes up to the section, and from a section to the workspace home', () => {
    expect(parentPath('/admin/clients/abc/conflict-checks/9')).toBe('/admin/clients');
    expect(parentPath('/admin/clients')).toBe('/admin/dashboard');
    expect(parentPath('/platform/firms')).toBe('/platform/overview');
    expect(parentPath('/admin/dashboard')).toBeNull();
    expect(parentPath('/register-firm')).toBeNull();
  });
});
