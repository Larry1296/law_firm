import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from '@/core/api/axios';
import service from './walkInEnquiryService';
vi.mock('@/core/api/axios', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }));
beforeEach(() => { vi.clearAllMocks(); axios.get.mockResolvedValue({ data: { enquiries: [], corrections: [] } }); axios.post.mockResolvedValue({ data: {} }); axios.put.mockResolvedValue({ data: {} }); });
describe('walk-in workspace API integration', () => {
  it.each(['admin', 'secretary'])('uses the %s privacy, delivery and correction routes', async (workspace) => {
    const root = `${workspace === 'admin' ? '/admin' : '/staff/secretary'}/clients/walk-in-enquiries/`;
    await service.notice(workspace); expect(axios.get).toHaveBeenLastCalledWith(`${root}privacy-notice/`);
    await service.deliver(workspace, { method: 'SCREEN' }); expect(axios.post).toHaveBeenLastCalledWith(`${root}notice-deliveries/`, { method: 'SCREEN' });
    await service.history(workspace, 'record-id'); expect(axios.get).toHaveBeenLastCalledWith(`${root}record-id/corrections/`);
    await service.correct(workspace, 'record-id', { revision: 1 }); expect(axios.post).toHaveBeenLastCalledWith(`${root}record-id/corrections/`, { revision: 1 });
    await service.create(workspace, { notice_receipt: 'token' }); expect(axios.post).toHaveBeenLastCalledWith(root, { notice_receipt: 'token' });
  });
  it('puts configuration to the admin notice endpoint', async () => {
    await service.configure('admin', { policy_version: 'v2' });
    expect(axios.put).toHaveBeenCalledWith('/admin/clients/walk-in-enquiries/privacy-notice/', { policy_version: 'v2' });
  });
});
