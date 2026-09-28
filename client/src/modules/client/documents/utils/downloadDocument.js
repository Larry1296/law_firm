import axiosInstance from '@/core/api/axios';

export default async function downloadDocument(document) {
  if (!document?.file_url) return;
  // The API returns site-absolute paths (/api/documents/...); the client's base URL already ends in /api.
  const path = document.file_url.replace(/^\/api(?=\/)/, '');
  const response = await axiosInstance.get(path, { responseType: 'blob' });
  const url = URL.createObjectURL(response.data);
  const link = window.document.createElement('a');
  link.href = url;
  link.download = document.file_name || document.title;
  window.document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
