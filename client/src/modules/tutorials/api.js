import api from '@/core/api/axios';
export const tutorials = {
  list: (params = {}) => api.get('/tutorials/', {
    params
  }).then(r => r.data),
  categories: (manage = false) => api.get('/tutorials/categories/', {
    params: {
      manage: manage ? 1 : undefined
    }
  }).then(r => r.data),
  get: (id, manage = false) => api.get(`/tutorials/${id}/`, {
    params: {
      manage: manage ? 1 : undefined
    }
  }).then(r => r.data),
  featured: () => api.get('/tutorials/featured/').then(r => r.data),
  recent: () => api.get('/tutorials/progress/').then(r => r.data),
  save: (id, data) => (id ? api.patch(`/tutorials/${id}/?manage=1`, data) : api.post('/tutorials/', data)).then(r => r.data),
  category: (id, data) => (id ? api.patch(`/tutorials/categories/${id}/`, data) : api.post('/tutorials/categories/', data)).then(r => r.data),
  progress: (id, data) => api.post(`/tutorials/${id}/progress/`, data)
};
export function formatTime(value = 0) {
  const seconds = Math.max(0, Math.floor(value));
  const parts = [Math.floor(seconds / 60) % 60, seconds % 60].map(n => String(n).padStart(2, '0'));
  if (seconds >= 3600) parts.unshift(String(Math.floor(seconds / 3600)));
  return parts.join(':');
}
export function parseTime(value) {
  if (!/^\d+:\d{2}(:\d{2})?$/.test(value)) throw new Error('Use MM:SS or HH:MM:SS.');
  const parts = value.split(':').map(Number);
  if (parts.slice(1).some(n => n > 59)) throw new Error('Minutes and seconds must be below 60.');
  return parts.reduce((total, n) => total * 60 + n, 0);
}
export function helpBase(path) {
  if (path.startsWith('/staff/')) return path.split('/').slice(0, 3).join('/') + '/help';
  return '/' + path.split('/')[1] + '/help';
}
