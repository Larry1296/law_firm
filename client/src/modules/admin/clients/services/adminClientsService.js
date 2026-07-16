import axiosInstance from '@/core/api/axios';

/* =========================================================
   ADMIN CLIENTS SERVICE
========================================================= */

const adminClientsService = {
  createEndpoints: {
    INDIVIDUAL: '/admin/clients/individuals/create/',
    COMPANY: '/admin/clients/companies/create/',
    SACCO: '/admin/clients/companies/create/',
    COOPERATIVE: '/admin/clients/companies/create/',
    PARTNERSHIP: '/admin/clients/partnerships/create/',
    NGO: '/admin/clients/ngos/create/',
    ASSOCIATION: '/admin/clients/ngos/create/',
    RELIGIOUS: '/admin/clients/ngos/create/',
    TRUST: '/admin/clients/trusts/create/',
    ESTATE: '/admin/clients/estates/create/',
    GOVERNMENT: '/admin/clients/government/create/',
    SCHOOL: '/admin/clients/government/create/',
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
