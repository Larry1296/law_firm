import { describe, expect, it } from 'vitest';

import { resolveNotificationUrl } from '@/modules/notifications/utils/notificationLinks';

describe('notification links', () => {
  it('opens a role-neutral case link inside the reader\'s workspace', () => {
    expect(resolveNotificationUrl('/cases/42', { pathname: '/lawyer/dashboard' })).toBe('/lawyer/cases/42');
    expect(resolveNotificationUrl('/cases/42', { pathname: '/admin/clients' })).toBe('/admin/cases/42');
  });

  it('sends the generic notifications link to the reader\'s notification centre', () => {
    expect(resolveNotificationUrl('/notifications?event=7', { pathname: '/secretary/cases' })).toBe('/secretary/notifications?event=7');
    expect(resolveNotificationUrl('/notifications?event=7', {
      pathname: '/admin/dashboard', fallbackPath: '/admin/communication/notifications',
    })).toBe('/admin/communication/notifications?event=7');
  });

  it('keeps links that already name a workspace and falls back when there is none', () => {
    expect(resolveNotificationUrl('/platform/requests?request=1', { pathname: '/platform/overview' })).toBe('/platform/requests?request=1');
    expect(resolveNotificationUrl('', { pathname: '/hr/dashboard', fallbackPath: '/hr/notifications' })).toBe('/hr/notifications');
  });
});
