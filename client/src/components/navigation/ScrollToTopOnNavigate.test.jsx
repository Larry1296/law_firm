import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ScrollToTopOnNavigate from '@/components/navigation/ScrollToTopOnNavigate';

function Shell() {
  return (
    <main className='app-main' data-testid='content'>
      <Link to='/admin/cases'>Cases</Link>
      <Link to='/admin/clients?section=documents'>Documents tab</Link>
      <Link to='/admin/clients#contact'>Contact</Link>
      <Routes>
        <Route path='/admin/clients' element={<section id='contact'>Clients</section>} />
        <Route path='/admin/cases' element={<p>Cases page</p>} />
      </Routes>
    </main>
  );
}

const renderAt = (path) => render(
  <MemoryRouter initialEntries={[path]}><ScrollToTopOnNavigate /><Shell /></MemoryRouter>,
);

describe('ScrollToTopOnNavigate', () => {
  beforeEach(() => {
    window.scrollTo = vi.fn();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('opens a new page at the top of the window and of the dashboard content area', async () => {
    const user = userEvent.setup();
    renderAt('/admin/clients');
    const content = screen.getByTestId('content');
    content.scrollTop = 600;
    window.scrollTo.mockClear();

    await user.click(screen.getByRole('link', { name: 'Cases' }));

    expect(await screen.findByText('Cases page')).toBeInTheDocument();
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
    expect(content.scrollTop).toBe(0);
  });

  it('keeps its place when only a tab in the query changes', async () => {
    const user = userEvent.setup();
    renderAt('/admin/clients');
    const content = screen.getByTestId('content');
    content.scrollTop = 600;
    window.scrollTo.mockClear();

    await user.click(screen.getByRole('link', { name: 'Documents tab' }));

    expect(window.scrollTo).not.toHaveBeenCalled();
    expect(content.scrollTop).toBe(600);
  });

  it('scrolls to the section a link names', async () => {
    const user = userEvent.setup();
    renderAt('/admin/cases');

    await user.click(screen.getByRole('link', { name: 'Contact' }));

    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });
});
