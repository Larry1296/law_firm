import axiosInstance from '@/core/api/axios';

/* =========================================================
   ADMIN CLIENTS SERVICE
========================================================= */

const adminClientsService = {
  createEndpoints: {
    INDIVIDUAL: '/admin/clients/individuals/create/',
    COMPANY: '/admin/clients/companies/create/',
    SOLE_PROPRIETORSHIP: '/admin/clients/legal-entities/create/',
    PARTNERSHIP: '/admin/clients/legal-entities/create/',
    LIMITED_LIABILITY_PARTNERSHIP: '/admin/clients/legal-entities/create/',
    COOPERATIVE: '/admin/clients/legal-entities/create/',
    SOCIETY_OR_ASSOCIATION: '/admin/clients/legal-entities/create/',
    NON_PROFIT_ORGANIZATION: '/admin/clients/legal-entities/create/',
    TRUST: '/admin/clients/legal-entities/create/',
    ESTATE: '/admin/clients/legal-entities/create/',
    PUBLIC_ENTITY: '/admin/clients/legal-entities/create/',
    INTERNATIONAL_ORGANIZATION: '/admin/clients/legal-entities/create/',

    // Legacy UI aliases mapped to canonical legal-capacity endpoint.
    SACCO: '/admin/clients/legal-entities/create/',
    NGO: '/admin/clients/legal-entities/create/',
    NGO_ASSOCIATION: '/admin/clients/legal-entities/create/',
    ASSOCIATION: '/admin/clients/legal-entities/create/',
    RELIGIOUS_ORGANIZATION: '/admin/clients/legal-entities/create/',
    RELIGIOUS: '/admin/clients/legal-entities/create/',
    GOVERNMENT: '/admin/clients/legal-entities/create/',
    EDUCATIONAL_INSTITUTION: '/admin/clients/legal-entities/create/',
    SCHOOL: '/admin/clients/legal-entities/create/',
  },

  /* ======================================================
     CREATE INDIVIDUAL CLIENT
  ====================================================== */
  async createIndividualClient(payload) {
    const { data } = await axiosInstance.post(
      this.createEndpoints.INDIVIDUAL,
      payload,
    );

    return data;
  },

  /* ======================================================
     CREATE COMPANY CLIENT  🔴 ADD THIS
  ====================================================== */
  async createCompanyClient(payload) {
    const { data } = await axiosInstance.post(
      this.createEndpoints.COMPANY,
      payload,
    );

    return data;
  },

  async createClient(payload, clientType = 'INDIVIDUAL') {
    const endpoint =
      this.createEndpoints[clientType] || this.createEndpoints.INDIVIDUAL;
    const { data } = await axiosInstance.post(endpoint, payload);
    return data;
  },

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
