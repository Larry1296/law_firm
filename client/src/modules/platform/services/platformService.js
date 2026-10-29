import axiosInstance from '@/core/api/axios';

const get = async (url, params) => (await axiosInstance.get(url, { params })).data;
const post = async (url, body, options) => (await (options ? axiosInstance.post(url, body, options) : axiosInstance.post(url, body))).data;
const patch = async (url, body) => (await axiosInstance.patch(url, body)).data;

const platformService = {
  getOverview: () => get('/platform/overview/'),
  getMeta: () => get('/platform/meta/'),

  getFirms: (params) => get('/platform/firms/', params),
  getFirm: (id) => get(`/platform/firms/${id}/`),
  deleteTrialFirm: async (id, confirmation, options = {}) => (await axiosInstance.delete(`/platform/firms/${id}/`, { ...options, data: { confirmation } })).data,
  registerFirm: (payload) => post('/platform/firms/', payload),
  updateFirm: (id, payload) => patch(`/platform/firms/${id}/`, payload),
  setFirmStatus: (id, payload) => post(`/platform/firms/${id}/status/`, payload),
  updateSubscription: (id, payload) => post(`/platform/firms/${id}/subscription/`, payload),
  getPlanChange: (id) => get(`/platform/firms/${id}/plan-change/`),
  issuePlanChange: (id, payload) => post(`/platform/firms/${id}/plan-change/`, payload),
  generateTemporaryPassword: (id, options) => post(`/platform/firms/${id}/temporary-password/`, undefined, options),
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
  getOnboardingRequestLogo: async (id) => (
    await axiosInstance.get(`/platform/onboarding-requests/${id}/logo/`, { responseType: 'blob' })
  ).data,
  getOnboardingRequestChoices: () => get('/platform/onboarding-requests/submit/'),
  // A logo goes as multipart, with the rest of the request as JSON alongside it.
  submitOnboardingRequest: (payload, logo) => {
    if (!logo) return post('/platform/onboarding-requests/submit/', payload);
    const form = new FormData();
    form.append('payload', JSON.stringify(payload));
    form.append('logo', logo);
    return post('/platform/onboarding-requests/submit/', form);
  },
};

export default platformService;
