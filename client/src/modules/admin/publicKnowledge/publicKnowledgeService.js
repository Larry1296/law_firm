import api from '@/core/api/axios';

export const listPublicKnowledge = (params) => api.get('/api/admin/public-knowledge/', { params }).then(({ data }) => data);
export const createPublicKnowledge = (payload) => api.post('/api/admin/public-knowledge/', payload).then(({ data }) => data);
export const updatePublicKnowledge = (id, payload) => api.patch(`/api/admin/public-knowledge/${id}/`, payload).then(({ data }) => data);
export const actOnPublicKnowledge = (id, action, payload = {}) => api.post(`/api/admin/public-knowledge/${id}/${action}/`, payload).then(({ data }) => data);
