import axiosInstance from '@/core/api/axios';

const secretaryDocumentsService = {
  async getDocuments(params = {}) {
    const { data } = await axiosInstance.get('/staff/secretary/documents/', {
      params,
    });
    return data;
  },
  async registerPhysicalDocument(payload) {
    const { data } = await axiosInstance.post('/staff/secretary/documents/', { ...payload, action: 'register_physical' });
    return data;
  },
  async assignDrawer(payload) {
    const { data } = await axiosInstance.post('/staff/secretary/documents/', { ...payload, action: 'assign_drawer' });
    return data;
  },
  async assignMatterFile(caseId, payload) {
    const { data } = await axiosInstance.post(`/cases/${caseId}/physical-file/`, {
      ...payload,
      operation: 'assign',
    });
    return data;
  },
  async transferMatterEvidence(caseId, payload) {
    const { data } = await axiosInstance.post(`/cases/${caseId}/physical-file/`, {
      ...payload,
      operation: 'transfer_document',
    });
    return data;
  },
  async proposeReference(clientId) {
    const { data } = await axiosInstance.post('/staff/secretary/documents/', { action: 'propose_reference', client_id: clientId });
    return data;
  },
  async createReceipt(payload) {
    const { data } = await axiosInstance.post('/staff/secretary/documents/', { ...payload, action: 'create_receipt' });
    return data;
  },
  async recordCustodyMovement(documentId, payload) {
    const { data } = await axiosInstance.post(`/staff/secretary/documents/${documentId}/actions/`, { ...payload, action: 'custody_movement' });
    return data;
  },
  async removeFromRegister(documentId, reason) {
    const { data } = await axiosInstance.post(`/staff/secretary/documents/${documentId}/actions/`, { action: 'remove_from_register', reason });
    return data;
  },
  async createRequest(payload) {
    const { data } = await axiosInstance.post('/staff/secretary/documents/', { ...payload, action: 'request' });
    return data;
  },
  async verifyClientUpload(requestId, payload) {
    const { data } = await axiosInstance.patch(`/staff/secretary/documents/requests/${requestId}/verify/`, payload);
    return data;
  },
  async dispatchRequest(requestId, payload) {
    const { data } = await axiosInstance.post(`/staff/secretary/documents/requests/${requestId}/dispatch/`, payload);
    return data;
  },
};

export default secretaryDocumentsService;
