import axios from '@/core/api/axios';
const root = (workspace) => `${workspace === 'admin' ? '/admin' : `/staff/${workspace}`}/clients/preliminary-enquiries/`;
export default {
  async list(workspace) { return (await axios.get(root(workspace))).data; },
  async detail(workspace, id) { return (await axios.get(`${root(workspace)}${id}/`)).data; },
  async act(workspace, id, action, data) { return (await axios.post(`${root(workspace)}${id}/${action}/`, data)).data; },
};
