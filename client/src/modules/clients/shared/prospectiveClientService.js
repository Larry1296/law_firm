import axios from '@/core/api/axios';

const root = (workspace) => workspace === 'secretary' ? '/staff/secretary/clients' : '/admin/clients';
export const prospectiveClientService = {
  async metadata(workspace) { return (await axios.get(`${root(workspace)}/onboarding-metadata/`)).data; },
  async create(workspace, payload) { return (await axios.post(`${root(workspace)}/prospective/`, payload)).data; },
  async detail(workspace, id) { return (await axios.get(`${root(workspace)}/${id}/prospective-detail/`)).data.client; },
  async invite(workspace, id) { return (await axios.post(`${root(workspace)}/${id}/portal-invitation/`, {})).data.client; },
  async complete(workspace, id, payload) { return (await axios.put(`${root(workspace)}/${id}/complete-onboarding/`, payload)).data.client; },
  async options(workspace) { return (await axios.get(`${root(workspace)}/entry-options/`)).data; },
  async proposedMatter(workspace, payload) { return (await axios.post(`${root(workspace)}/proposed-matters/`, payload)).data; },
};
export const creationError = (error) => {
  const data = error.response?.data;
  const messages = (value) => typeof value === 'string' ? value : Array.isArray(value) ? value.map(messages).join(' ') : value && typeof value === 'object' ? Object.entries(value).map(([key, item]) => `${key.replaceAll('_', ' ')}: ${messages(item)}`).join(' ') : '';
  return messages(data) || error.message || 'Unable to save. Please try again.';
};
