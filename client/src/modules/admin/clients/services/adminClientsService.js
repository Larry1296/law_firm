import axiosInstance from '@/core/api/axios';

/* =========================================================
   ADMIN CLIENTS SERVICE
========================================================= */

const adminClientsService = {
  /* ======================================================
     CLIENT LIST
  ====================================================== */
  async getClients(params = {}) {
    const { data } = await axiosInstance.get('/admin/clients/', {
      params,
    });
    const clients = (data.clients || []).map((client) => ({
      ...client,
      client_id: client.client_id || client.id,
    }));

    return {
      ...data,
      clients,
      analytics: data.analytics || data.metadata || {},
    };
  },

  /* ======================================================
     CLIENT DETAILS
  ====================================================== */
  async getClientDetails(clientId) {
    const { data } = await axiosInstance.get(`/admin/clients/${clientId}/`);

    const wrapper = data.client || {};
    const client = wrapper.detail || wrapper;

    return {
      ...data,
      client,
      analytics: data.analytics || {
        addresses: client.addresses?.length ?? 0,
        contacts: client.contacts?.length ?? 0,
        documents: client.documents?.length ?? 0,
        lifecycle_status: client.lifecycle_status,
      },
    };
  },

  async getConflictChecks(clientId) {
    const { data } = await axiosInstance.get(
      `/admin/clients/${clientId}/conflict-checks/`,
    );
    return data.conflict_checks || [];
  },

  async getComplianceReview(clientId) {
    const { data } = await axiosInstance.get(`/admin/clients/${clientId}/compliance-review/`);
    return data.compliance_review;
  },

  async recordComplianceReview(clientId, payload) {
    const { data } = await axiosInstance.put(`/admin/clients/${clientId}/compliance-review/`, payload);
    return data.compliance_review;
  },

  async getConflictCheck(clientId, checkId) {
    const { data } = await axiosInstance.get(
      `/admin/clients/${clientId}/conflict-checks/${checkId}/`,
    );
    return data.conflict_check;
  },

  async createConflictCheck(clientId, payload) {
    const { data } = await axiosInstance.post(
      `/admin/clients/${clientId}/conflict-checks/`,
      payload,
    );
    return data.conflict_check;
  },

  async updateConflictCheck(clientId, checkId, payload) {
    const { data } = await axiosInstance.patch(
      `/admin/clients/${clientId}/conflict-checks/${checkId}/`,
      payload,
    );
    return data.conflict_check;
  },

  async runConflictAction(clientId, checkId, action, payload = {}) {
    const { data } = await axiosInstance.post(
      `/admin/clients/${clientId}/conflict-checks/${checkId}/${action}/`,
      payload,
    );
    return data.conflict_check;
  },

  async recordFirmAcceptance(clientId, checkId, payload = {}) {
    const { data } = await axiosInstance.post(
      `/admin/clients/${clientId}/conflict-checks/${checkId}/acceptance/`,
      payload,
    );
    return data.conflict_check;
  },

  async getEngagements(clientId, checkId) {
    const { data } = await axiosInstance.get(
      `/admin/clients/${clientId}/conflict-checks/${checkId}/engagements/`,
    );
    return data.engagements || [];
  },

  async createEngagement(clientId, checkId, payload) {
    const { data } = await axiosInstance.post(
      `/admin/clients/${clientId}/conflict-checks/${checkId}/engagements/`, payload,
    );
    return data.engagement;
  },

  async approveEngagement(clientId, checkId, engagementId) {
    const { data } = await axiosInstance.post(
      `/admin/clients/${clientId}/conflict-checks/${checkId}/engagements/${engagementId}/approve/`, {},
    );
    return data.engagement;
  },

  async approveEngagementException(clientId, checkId, engagementId, payload) {
    const { data } = await axiosInstance.post(
      `/admin/clients/${clientId}/conflict-checks/${checkId}/engagements/${engagementId}/exception/`, payload,
    );
    return data.engagement;
  },

  async supersedeEngagement(clientId, checkId, engagementId, reason) {
    const { data } = await axiosInstance.post(
      `/admin/clients/${clientId}/conflict-checks/${checkId}/engagements/${engagementId}/supersede/`, { reason },
    );
    return data.engagement;
  },

  async generateJurisdictionSuggestion(clientId, checkId, payload = {}) {
    const { data } = await axiosInstance.post(`/admin/clients/${clientId}/conflict-checks/${checkId}/jurisdiction/`, payload);
    return data.jurisdiction;
  },

  async recordJurisdictionDecision(clientId, checkId, payload) {
    const { data } = await axiosInstance.post(`/admin/clients/${clientId}/conflict-checks/${checkId}/jurisdiction/decision/`, payload);
    return data.jurisdiction;
  },

  async confirmJurisdiction(clientId, checkId) {
    const { data } = await axiosInstance.post(`/admin/clients/${clientId}/conflict-checks/${checkId}/jurisdiction/confirm/`, {});
    return data.jurisdiction;
  },

  /* ======================================================
     UPDATE CLIENT
  ====================================================== */
  async updateClient(clientId, payload) {
    const { data } = await axiosInstance.patch(
      `/admin/clients/${clientId}/`,
      payload,
    );

    return data;
  },

  /* ======================================================
     DELETE CLIENT
  ====================================================== */
  async deleteClient(clientId) {
    const { data } = await axiosInstance.delete(
      `/admin/clients/${clientId}/delete/`,
    );
    return data;
  },

  async archiveClient(clientId) {
    const { data } = await axiosInstance.post(
      `/admin/clients/${clientId}/change-status/`,
      { action: 'archive' },
    );
    return data;
  },

  async restoreClient(clientId) {
    const { data } = await axiosInstance.post(
      `/admin/clients/${clientId}/change-status/`,
      { action: 'restore' },
    );
    return data;
  },
};

export default adminClientsService;
