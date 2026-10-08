import axiosInstance from '@/core/api/axios';

const documentsService = {
  async getDocuments(params = {}) {
    const { data } = await axiosInstance.get('/client/documents/', {
      params,
    });
    return data;
  },

  // No file is sent: the firm keeps paper. The client says how the paper will reach the firm.
  async sendDeliveryNotice(requestId, { delivery_method, expected_delivery_date, note }) {
    const { data } = await axiosInstance.post('/client/documents/', {
      request_id: requestId, delivery_method, expected_delivery_date, note,
    });
    return data;
  },
};

export default documentsService;
