import axiosInstance from '@/core/api/axios';

const secretaryClientsService = {
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

  async getClientById(clientId) {
    const { data } = await axiosInstance.get(`/staff/secretary/clients/${clientId}/prospective-detail/`);
    return data.client;
  },
};

export default secretaryClientsService;
