import axiosInstance from '@/core/api/axios';

const adminBillingService = {
  async getInvoices() { return (await axiosInstance.get('/finance/invoices/')).data; },
  async createInvoice(payload) { return (await axiosInstance.post('/finance/invoices/', payload)).data; },
  async invoiceAction(id, action) { return (await axiosInstance.post(`/finance/invoices/${id}/${action}/`)).data; },
  async getAccounts() { return (await axiosInstance.get('/finance/accounts/')).data; },
  async createAccount(payload) { return (await axiosInstance.post('/finance/accounts/', payload)).data; },
  async receiveClientMoney(payload) { return (await axiosInstance.post('/finance/client-money/receipts/', payload)).data; },
  async getPaymentInstructions() { return (await axiosInstance.get('/finance/client-money/payments/')).data; },
  async requestPayment(payload) { return (await axiosInstance.post('/finance/client-money/payments/', payload)).data; },
  async approvePayment(id) { return (await axiosInstance.post(`/finance/client-money/payments/${id}/approve/`)).data; },
  async transferToOffice(payload) { return (await axiosInstance.post('/finance/client-money/transfers/', payload)).data; },
  async getMatterLedger(matterId) { return (await axiosInstance.get(`/finance/matters/${matterId}/client-ledger/`)).data; },
};

export default adminBillingService;
