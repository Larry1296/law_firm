import { describe, expect, it } from 'vitest';
import { criticalAction } from './criticalActionPolicy';

describe('critical action coverage across workspaces', () => {
  it.each([
    ['post', '/platform/firms/', {}],
    ['delete', '/platform/firms/trial-1/', { confirmation: 'Trial Firm' }],
    ['patch', '/platform/plans/plan-1/', { monthly_price: '2500' }],
    ['post', '/platform/invoices/invoice-1/confirm/', {}],
    ['post', '/subscription/invoices/invoice-1/payment/', { mpesa_receipt: 'EXAMPLE123' }],
    ['patch', '/admin/staff/lawyers/user-1/permissions/', {}],
    ['post', '/admin/staff/temporary-password/', {}],
    ['post', '/admin/clients/client-1/portal-invitation/', {}],
    ['post', '/staff/secretary/clients/prospective/', {}],
    ['post', '/staff/lawyer/clients/client-1/conflict-checks/proposal-1/decide/', { decision: 'CLEARED' }],
    ['put', '/admin/clients/client-1/compliance-review/', {}],
    ['post', '/cases/open/', {}],
    ['post', '/cases/matter-1/transitions/', { to_state: 'FILED' }],
    ['post', '/cases/matter-1/filings/', {}],
    ['post', '/cases/deadlines/date-1/change/', {}],
    ['post', '/cases/matter-1/closure/review-1/finalise/', {}],
    ['post', '/cases/matter-1/closure/review-1/approve-finance/', {}],
    ['post', '/cases/matter-1/archive/', {}],
    ['post', '/cases/archives/archive-1/legal-hold/', { action: 'RELEASE' }],
    ['post', '/cases/archives/archive-1/destruction/', {}],
    ['post', '/finance/client-money/payments/payment-1/approve/', {}],
    ['post', '/finance/transactions/entry-1/reverse/', {}],
    ['post', '/finance/tax-configurations/', {}],
    ['patch', '/staff/lawyer/documents/requests/request-1/review/', { decision: 'ACCEPTED' }],
    ['post', '/staff/secretary/documents/document-1/actions/', { action: 'remove_from_register' }],
    ['post', '/communications/messages/message-1/forward-to-client/', {}],
    ['post', '/communications/threads/thread-1/messages/', {}],
    ['post', '/admin/public-knowledge/article-1/publish/', {}],
    ['patch', '/tutorials/video-1/?manage=1', { status: 'PUBLISHED' }],
    ['patch', '/courtroom/sessions/session-1/status/', {}],
    ['post', '/arrivals/visit-1/', { action: 'LEFT' }],
    ['post', '/auth/change-password/', { new_password: 'never-show-this' }],
    ['post', '/a-new-module/a-future-action/', {}],
  ])('requires confirmation for %s %s', (method, url, data) => {
    const result = criticalAction({ method, url, data });
    expect(result.title).toBeTruthy();
    expect(result.text).toBeTruthy();
    expect(result.confirmText).toBeTruthy();
    expect(JSON.stringify(result)).not.toContain('never-show-this');
  });

  it.each([
    ['get', '/cases/'], ['get', '/documents/1/download/'],
    ['post', '/auth/login/'], ['post', 'auth/token/refresh/'], ['post', '/auth/unlock/'],
    ['post', '/knowledge-base/ask/'], ['post', '/assistant/advocate/'],
    ['post', '/notifications/notice-1/read/'], ['post', '/notifications/mark-all-read/'],
    ['post', '/communications/announcements/notice-1/read/'],
    ['post', '/tutorials/video-1/progress/'], ['post', '/courtroom/launch/token-1/open/'],
  ])('leaves passive/read-only %s %s uninterrupted', (method, url) => {
    expect(criticalAction({ method, url })).toBeNull();
  });

  it('does not exempt writes merely because their path contains an exempt word', () => {
    expect(criticalAction({ method: 'delete', url: '/notifications/notice-1/read/' })).not.toBeNull();
    expect(criticalAction({ method: 'post', url: '/admin/public-knowledge/read/' })).not.toBeNull();
  });

  it('handles multipart document operations and only exempts reference previews', () => {
    const data = new FormData(); data.set('action', 'propose_reference');
    expect(criticalAction({ method: 'post', url: '/staff/secretary/documents/', data })).toBeNull();
    data.set('action', 'register_physical');
    expect(criticalAction({ method: 'post', url: '/staff/secretary/documents/', data })).not.toBeNull();
  });
});
