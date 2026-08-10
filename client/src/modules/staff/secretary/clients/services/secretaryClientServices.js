import axiosInstance from '@/core/api/axios';

const secretaryClientsService = {
  async getOnboardingMetadata() {
    const { data } = await axiosInstance.get('/staff/secretary/clients/onboarding-metadata/');
    return data;
  },
  async createOnboardingClient(payload) {
    const { data } = await axiosInstance.post('/staff/secretary/clients/onboarding/', payload);
    return data;
  },
  createEndpoints: {
    INDIVIDUAL: '/staff/secretary/clients/individuals/create/',
    COMPANY: '/staff/secretary/clients/companies/create/',
    SOLE_PROPRIETORSHIP: '/staff/secretary/clients/legal-entities/create/',
    PARTNERSHIP: '/staff/secretary/clients/legal-entities/create/',
    LIMITED_LIABILITY_PARTNERSHIP: '/staff/secretary/clients/legal-entities/create/',
    COOPERATIVE: '/staff/secretary/clients/legal-entities/create/',
    SOCIETY_OR_ASSOCIATION: '/staff/secretary/clients/legal-entities/create/',
    NON_PROFIT_ORGANIZATION: '/staff/secretary/clients/legal-entities/create/',
    TRUST: '/staff/secretary/clients/legal-entities/create/',
    ESTATE: '/staff/secretary/clients/legal-entities/create/',
    PUBLIC_ENTITY: '/staff/secretary/clients/legal-entities/create/',
    INTERNATIONAL_ORGANIZATION: '/staff/secretary/clients/legal-entities/create/',

  },

  async getClients(params = {}) {
    const { data } = await axiosInstance.get('/staff/secretary/clients/', {
      params,
    });

    const clients = (data.clients || []).map((client) => ({
      ...client,
      client_id: client.client_id || client.id,
    }));

    return { ...data, clients };
  },

  async createClient(payload, clientType = 'INDIVIDUAL') {
    const endpoint =
      this.createEndpoints[clientType] || this.createEndpoints.INDIVIDUAL;
    const { data } = await axiosInstance.post(endpoint, payload);
    return data;
  },

  async getClientById(clientId) {
    const { clients } = await this.getClients();
    return clients.find((client) => String(client.id) === String(clientId));
  },
};

export default secretaryClientsService;
