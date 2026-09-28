import axiosInstance from '@/core/api/axios';

const get = async (url, params) => (await axiosInstance.get(url, { params })).data;
const post = async (url, body) => (await axiosInstance.post(url, body)).data;
const patch = async (url, body) => (await axiosInstance.patch(url, body)).data;

const platformService = {
  getOverview: () => get('/platform/overview/'),
  getMeta: () => get('/platform/meta/'),

  getFirms: (params) => get('/platform/firms/', params),
  getFirm: (id) => get(`/platform/firms/${id}/`),
  registerFirm: (payload) => post('/platform/firms/', payload),
  updateFirm: (id, payload) => patch(`/platform/firms/${id}/`, payload),
  setFirmStatus: (id, payload) => post(`/platform/firms/${id}/status/`, payload),
  updateSubscription: (id, payload) => post(`/platform/firms/${id}/subscription/`, payload),
  resendOwnerInvitation: (id) => post(`/platform/firms/${id}/owner-invitation/`),
  uploadLogo: (id, file) => {
    const form = new FormData();
    form.append('logo', file);
    return post(`/platform/firms/${id}/logo/`, form);
  },

  getPlans: () => get('/platform/plans/'),
  createPlan: (payload) => post('/platform/plans/', payload),
  updatePlan: (id, payload) => patch(`/platform/plans/${id}/`, payload),
  deletePlan: async (id) => axiosInstance.delete(`/platform/plans/${id}/`),

  getUsers: (params) => get('/platform/users/', params),
  setUserStatus: (id, isActive) => patch(`/platform/users/${id}/`, { is_active: isActive }),

  getInvoices: (params) => get('/platform/invoices/', params),
  confirmInvoice: (id) => post(`/platform/invoices/${id}/confirm/`),
  voidInvoice: (id) => post(`/platform/invoices/${id}/void/`),

  getOnboardingRequests: (params) => get('/platform/onboarding-requests/', params),
  getOnboardingRequest: (id) => get(`/platform/onboarding-requests/${id}/`),
  updateOnboardingRequest: (id, payload) => patch(`/platform/onboarding-requests/${id}/`, payload),
  submitOnboardingRequest: (payload) => post('/platform/onboarding-requests/submit/', payload),
};

export default platformService;
