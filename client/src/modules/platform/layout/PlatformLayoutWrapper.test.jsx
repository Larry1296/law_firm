import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import AuthContext from '@/core/store/AuthContext';
import PlatformLayoutWrapper from '@/modules/platform/layout/PlatformLayoutWrapper';

vi.mock('@/modules/notifications/components/NotificationBellDropdown', () => ({
  default: () => <button type='button'>Notifications</button>,
}));

describe('platform console layout', () => {
  it('uses the shared dashboard shell: sidebar, top bar and footer', () => {
    window.matchMedia ??= vi.fn().mockReturnValue({ matches: false, addEventListener() {}, removeEventListener() {} });
    render(
      <QueryClientProvider client={new QueryClient()}>
        <AuthContext.Provider value={{ user: { id: 'ops', full_name: 'Platform Operator', role: 'PLATFORM_ADMIN' }, logout: vi.fn() }}>
          <MemoryRouter initialEntries={['/platform/overview']}>
            <Routes>
              <Route path='/platform/*' element={<PlatformLayoutWrapper />}>
                <Route path='overview' element={<p>Overview page</p>} />
              </Route>
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>
      </QueryClientProvider>,
    );

    expect(screen.getByRole('heading', { name: 'Platform Console' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Law firms/ })).toHaveAttribute('href', '/platform/firms');
    expect(screen.getByText('Platform administrator')).toBeInTheDocument();
    expect(screen.getByText('Platform Operator')).toBeInTheDocument();
    expect(screen.getByText('Overview page')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Notifications' })).not.toBeInTheDocument();
  });
});
