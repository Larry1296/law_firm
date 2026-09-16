import axios from '@/core/api/axios';
const root = '/admin/clients/intake-privacy/';
export const intakePrivacyService = {
  async list() { return (await axios.get(root)).data; },
  async create(data) { return (await axios.post(root, data)).data; },
  async activate(id) { return (await axios.post(`${root}${id}/activate/`, {})).data; },
  async retire(id) { return (await axios.post(`${root}${id}/retire/`, {})).data; },
};
