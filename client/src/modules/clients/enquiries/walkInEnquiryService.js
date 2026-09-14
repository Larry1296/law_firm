import axios from '@/core/api/axios';

const endpoint = (workspace) => `${workspace === 'secretary' ? '/staff/secretary' : '/admin'}/clients/walk-in-enquiries/`;

export default {
  async list(workspace) {
    const { data } = await axios.get(endpoint(workspace));
    return data.enquiries;
  },
  async create(workspace, payload) {
    const { data } = await axios.post(endpoint(workspace), payload);
    return data;
  },
  async notice(workspace) {
    const { data } = await axios.get(`${endpoint(workspace)}privacy-notice/`);
    return data;
  },
  async configure(workspace, payload) {
    const { data } = await axios.put(`${endpoint(workspace)}privacy-notice/`, payload);
    return data;
  },
  async deliver(workspace, payload) {
    const { data } = await axios.post(`${endpoint(workspace)}notice-deliveries/`, payload);
    return data;
  },
  async history(workspace, id) {
    const { data } = await axios.get(`${endpoint(workspace)}${id}/corrections/`);
    return data.corrections;
  },
  async correct(workspace, id, payload) {
    const { data } = await axios.post(`${endpoint(workspace)}${id}/corrections/`, payload);
    return data;
  },
};
