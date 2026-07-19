import axiosInstance from '@/core/api/axios';
import adminCasesService from '@/modules/admin/cases/services/adminCasesService';
import adminStaffService from '@/modules/admin/staff/services/adminStaffService';

const safeRequest = async (request, fallback) => {
  try {
    return await request();
  } catch {
    return fallback;
  }
};

const countCasesWithCourtInfo = (cases = []) =>
  cases.filter((item) => item.court_name || item.court_type || item.court_location)
    .length;

const countRecentActivity = (cases = []) =>
  cases.filter((item) => {
    if (!item.updated_at) return false;
    const updatedAt = new Date(item.updated_at).getTime();
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return Number.isFinite(updatedAt) && updatedAt >= sevenDaysAgo;
  }).length;

const adminDashboardService = {
  async getDashboard() {
    const [clientDashboard, casesPayload, staffPayload, announcementsPayload, threadsPayload, eventsPayload] =
      await Promise.all([
        safeRequest(async () => {
          const { data } = await axiosInstance.get('/admin/clients/dashboard/');
          return data.dashboard || {};
        }, {}),
        safeRequest(() => adminCasesService.getCases(), {}),
        safeRequest(() => adminStaffService.getStaff(), {}),
        safeRequest(async () => {
          const { data } = await axiosInstance.get('/admin/communications/announcements/');
          return data;
        }, {}),
        safeRequest(async () => {
          const { data } = await axiosInstance.get('/admin/communications/threads/');
          return data;
        }, {}),
        safeRequest(async () => {
          const { data } = await axiosInstance.get('/events/', { params: { scope: 'upcoming' } });
          return data;
        }, {}),
      ]);

    const caseSummary = casesPayload.summary || casesPayload.data?.summary || {};
    const cases = casesPayload.cases || casesPayload.data?.cases || [];
    const staffSummary = staffPayload.data?.summary || {};
    const announcements = announcementsPayload.announcements || [];
    const threads = threadsPayload.threads || [];
    const upcomingEvents = (eventsPayload.events || []).slice(0, 5);

    return {
      clients: clientDashboard,
      cases: {
        ...caseSummary,
        courtroom_cases: countCasesWithCourtInfo(cases),
        recent_activity: countRecentActivity(cases),
      },
      staff: staffSummary,
      communication: {
        announcements: announcements.length,
        threads: threads.length,
      },
      upcomingEvents,
    };
  },
};

export default adminDashboardService;
