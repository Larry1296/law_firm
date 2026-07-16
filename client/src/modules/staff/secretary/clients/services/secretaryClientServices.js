import axiosInstance from '@/core/api/axios';

const secretaryClientsService = {
  createEndpoints: {
    INDIVIDUAL: '/staff/secretary/clients/individuals/create/',
    COMPANY: '/staff/secretary/clients/companies/create/',
    SACCO: '/staff/secretary/clients/saccos/create/',
    COOPERATIVE: '/staff/secretary/clients/cooperatives/create/',
    PARTNERSHIP: '/staff/secretary/clients/partnerships/create/',
    NGO: '/staff/secretary/clients/ngos/create/',
    NGO_ASSOCIATION: '/staff/secretary/clients/associations/create/',
    ASSOCIATION: '/staff/secretary/clients/associations/create/',
    RELIGIOUS_ORGANIZATION: '/staff/secretary/clients/religious-organizations/create/',
    RELIGIOUS: '/staff/secretary/clients/religious-organizations/create/',
    TRUST: '/staff/secretary/clients/trusts/create/',
    ESTATE: '/staff/secretary/clients/estates/create/',
    GOVERNMENT: '/staff/secretary/clients/government/create/',
    EDUCATIONAL_INSTITUTION: '/staff/secretary/clients/educational-institutions/create/',
    SCHOOL: '/staff/secretary/clients/educational-institutions/create/',
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
