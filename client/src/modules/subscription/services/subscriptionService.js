import axiosInstance from '@/core/api/axios';

const subscriptionService = {
  async getPlans() {
    const { data } = await axiosInstance.get('/subscription/plans/');
    return data;
  },

  async getSummary() {
    const { data } = await axiosInstance.get('/subscription/');
    return data;
  },

  async getInvoices() {
    const { data } = await axiosInstance.get('/subscription/invoices/');
    return data;
  },

  async requestInvoice(payload) {
    const { data } = await axiosInstance.post('/subscription/invoices/', payload);
    return data;
  },

  async submitPayment(invoiceId, payload) {
    const { data } = await axiosInstance.post(
      `/subscription/invoices/${invoiceId}/payment/`,
      payload,
    );
    return data;
  },

  async registerFirm(payload) {
    const { data } = await axiosInstance.post('/auth/register-firm/', payload);
    return data;
  },
};

export default subscriptionService;
