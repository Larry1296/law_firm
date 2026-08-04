import axiosInstance from '@/core/api/axios';

const adminBillingService = {
  async getInvoices(params = {}) { return (await axiosInstance.get('/finance/invoices/', { params })).data; },
  async createInvoice(payload) { return (await axiosInstance.post('/finance/invoices/', payload)).data; },
  async invoiceAction(id, action, payload = {}) { return (await axiosInstance.post(`/finance/invoices/${id}/${action}/`, payload)).data; },
  async addInvoiceBillables(id, payload) { return (await axiosInstance.post(`/finance/invoices/${id}/billable-items/`, payload)).data; },
  async getCreditNotes(params = {}) { return (await axiosInstance.get('/finance/credit-notes/', { params })).data; },
  async createCreditNote(payload) { return (await axiosInstance.post('/finance/credit-notes/', payload)).data; },
  async creditNoteAction(id, action) { return (await axiosInstance.post(`/finance/credit-notes/${id}/${action}/`)).data; },
  async getAccounts() { return (await axiosInstance.get('/finance/accounts/')).data; },
  async createAccount(payload) { return (await axiosInstance.post('/finance/accounts/', payload)).data; },
  async receiveClientMoney(payload) { return (await axiosInstance.post('/finance/client-money/receipts/', payload)).data; },
  async receivePreMatterRetainer(payload) { return (await axiosInstance.post('/finance/client-money/retainers/', payload)).data; },
  async getClientUnallocatedFunds(clientId) { return (await axiosInstance.get(`/finance/clients/${clientId}/unallocated-funds/`)).data; },
  async getPaymentInstructions() { return (await axiosInstance.get('/finance/client-money/payments/')).data; },
  async requestPayment(payload) { return (await axiosInstance.post('/finance/client-money/payments/', payload)).data; },
  async approvePayment(id) { return (await axiosInstance.post(`/finance/client-money/payments/${id}/approve/`)).data; },
  async transferToOffice(payload) { return (await axiosInstance.post('/finance/client-money/transfers/', payload)).data; },
  async getMatterLedger(matterId) { return (await axiosInstance.get(`/finance/matters/${matterId}/client-ledger/`)).data; },
  async reverseTransaction(id, reason) { return (await axiosInstance.post(`/finance/transactions/${id}/reverse/`, { reason })).data; },
  async getTimeEntries() { return (await axiosInstance.get('/finance/time-entries/')).data; },
  async createTimeEntry(payload) { return (await axiosInstance.post('/finance/time-entries/', payload)).data; },
  async approveTimeEntry(id) { return (await axiosInstance.post(`/finance/time-entries/${id}/approve/`)).data; },
  async getDisbursements() { return (await axiosInstance.get('/finance/disbursements/')).data; },
  async createDisbursement(payload) { return (await axiosInstance.post('/finance/disbursements/', payload)).data; },
  async approveDisbursement(id) { return (await axiosInstance.post(`/finance/disbursements/${id}/approve/`)).data; },
  async receiveOfficeMoney(payload) { return (await axiosInstance.post('/finance/office-money/receipts/', payload)).data; },
  async getReconciliations() { return (await axiosInstance.get('/finance/reconciliations/')).data; },
  async createReconciliation(payload) { return (await axiosInstance.post('/finance/reconciliations/', payload)).data; },
  async approveReconciliation(id) { return (await axiosInstance.post(`/finance/reconciliations/${id}/approve/`)).data; },
};

export default adminBillingService;
