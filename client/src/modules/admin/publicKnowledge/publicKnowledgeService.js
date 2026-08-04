import api from '@/core/api/axios';

export const listPublicKnowledge = (params) => api.get('/admin/public-knowledge/', { params }).then(({ data }) => data);
export const createPublicKnowledge = (payload) => api.post('/admin/public-knowledge/', payload).then(({ data }) => data);
export const updatePublicKnowledge = (id, payload) => api.patch(`/admin/public-knowledge/${id}/`, payload).then(({ data }) => data);
export const actOnPublicKnowledge = (id, action, payload = {}) => api.post(`/admin/public-knowledge/${id}/${action}/`, payload).then(({ data }) => data);
