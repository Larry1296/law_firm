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
};
