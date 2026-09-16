import {afterEach, expect, it, vi} from 'vitest';
import {cleanup, render, screen} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import RoleRoute from './RoleRoute';
import useAuth from '@/core/hooks/useAuth';
vi.mock('@/core/hooks/useAuth', () => ({default: vi.fn()}));
afterEach(cleanup);
it.each([false, undefined, true])('gates prospect business routes with acceptance %s', (allowed) => {
  useAuth.mockReturnValue({isAuthenticated:true, user:{role:'PROSPECT', client:{portal_access_allowed:allowed}}});
  render(<RoleRoute allowedRoles={['PROSPECT']}><p>Documents, intake, matters and messages</p></RoleRoute>);
  expect(Boolean(screen.queryByText('Documents, intake, matters and messages'))).toBe(allowed === true);
});
