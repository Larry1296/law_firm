import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, UploadCloud } from 'lucide-react';

import Card from '@/components/ui/Card';
import SectionHeading from '@/components/ui/SectionHeading';
import secretaryDocumentsService from '../services/secretaryDocumentsService';
import downloadDocument from '@/modules/client/documents/utils/downloadDocument';

const errorMessage = (error, fallback) => {
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (detail && typeof detail === 'object') {
    const first = Object.values(detail).flat()[0];
    if (first) return String(first);
  }
  return error?.response?.data?.message || fallback;
};

export default function SecretaryDocuments({ caseId = '', compact = false }) {
  const queryClient = useQueryClient();
  const [selectedClientId, setSelectedClientId] = useState('');
  const [form, setForm] = useState({ client_id: '', case_id: caseId, request_id: '', title: '', document_type: 'EVIDENCE', purpose: 'CLIENT_INSTRUCTION', description: '', received_via: 'IN_PERSON', physical_copy_retained: false, physical_storage_location: '', custody_notes: '', file: null });
  const [requestForm, setRequestForm] = useState({ case_id: caseId, title: '', document_type: 'EVIDENCE', instructions: '', due_date: '' });
  const [verification, setVerification] = useState({ requestId: '', correct_client: false, readable_complete: false, matter_link_confirmed: false, physical_copy_retained: false, physical_storage_location: '', custody_notes: '', notes: '' });
  const [dispatch, setDispatch] = useState({ requestId: '', message: '' });
  const queryParams = caseId ? { case_id: caseId } : (selectedClientId ? { client_id: selectedClientId } : {});
  const { data, isLoading, isFetching, error } = useQuery({ queryKey: ['secretary-documents', caseId, selectedClientId], queryFn: () => secretaryDocumentsService.getDocuments(queryParams) });
  useEffect(() => {
    const clientId = data?.selected_client_id || selectedClientId;
    if (clientId) setForm((current) => ({ ...current, client_id: clientId }));
  }, [data?.selected_client_id, selectedClientId]);
  useEffect(() => {
    if (selectedClientId && data && !isFetching && !data.selected_client_id) {
      setSelectedClientId('');
      setForm((current) => ({ ...current, client_id: '', case_id: '', request_id: '' }));
    }
  }, [data, isFetching, selectedClientId]);
  const upload = useMutation({
    mutationFn: async () => { const payload = new FormData(); Object.entries(form).forEach(([key, value]) => value && payload.append(key, value)); return secretaryDocumentsService.uploadDocument(payload); },
    onSuccess: () => { setForm((current) => ({ ...current, request_id: '', title: '', description: '', file: null })); queryClient.invalidateQueries({ queryKey: ['secretary-documents'] }); },
  });
  const createRequest = useMutation({
    mutationFn: secretaryDocumentsService.createRequest,
    onSuccess: () => { setRequestForm((current) => ({ ...current, title: '', instructions: '', due_date: '' })); queryClient.invalidateQueries({ queryKey: ['secretary-documents'] }); },
  });
  const verify = useMutation({
    mutationFn: ({ requestId, payload }) => secretaryDocumentsService.verifyClientUpload(requestId, payload),
    onSuccess: () => { setVerification({ requestId: '', correct_client: false, readable_complete: false, matter_link_confirmed: false, physical_copy_retained: false, physical_storage_location: '', custody_notes: '', notes: '' }); queryClient.invalidateQueries({ queryKey: ['secretary-documents'] }); },
  });
  const dispatchRequest = useMutation({
    mutationFn: ({ requestId, payload }) => secretaryDocumentsService.dispatchRequest(requestId, payload),
    onSuccess: () => { setDispatch({ requestId: '', message: '' }); queryClient.invalidateQueries({ queryKey: ['secretary-documents'] }); queryClient.invalidateQueries({ queryKey: ['communications'] }); },
  });
  const cases = data?.cases || [];
  const clients = data?.clients || [];
  const requests = data?.requests || [];
  const documents = data?.documents || [];
  const outstanding = requests.filter((item) => ['OPEN', 'REPLACEMENT_REQUIRED'].includes(item.status));

  return <div className={compact ? 'space-y-4' : 'space-y-6 p-4 md:p-6'}>
    {!compact && <SectionHeading title='Client document desk' subtitle='Receive requested records into the client file without exposing legal strategy or privileged case work.' />}
    {!compact && <Card className='p-5'>
      <h3 className='font-semibold'>Select client file</h3>
      <p className='mt-1 text-sm text-text-muted-light dark:text-text-muted-dark'>Documents are owned by the client account. A matter link is added only where the document relates to a specific case.</p>
      <select className='mt-4 w-full rounded-xl border p-3 dark:bg-background-dark' value={selectedClientId} onChange={(event) => { const client_id = event.target.value; setSelectedClientId(client_id); setForm((current) => ({ ...current, client_id, case_id: '', request_id: '' })); }}>
        <option value=''>Select a client</option>
        {clients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
    </Card>}
    {!caseId && !selectedClientId && <Card className='p-5'><p>Select a client to view requests, receive documents, or inspect that client&apos;s document file.</p></Card>}
    {(caseId || selectedClientId) && <>
    <Card className='p-5'>
      <h3 className='font-semibold'>Ask this client for a document</h3>
      <p className='mt-1 text-sm text-text-muted-light dark:text-text-muted-dark'>Prepare the request here, then dispatch it through the secretary-controlled case communication. Advocate requests also arrive here for dispatch.</p>
      <div className='mt-4 grid gap-3 md:grid-cols-2'>
        {!caseId && <select className='rounded-xl border p-3 dark:bg-background-dark' value={requestForm.case_id} onChange={(e) => setRequestForm({ ...requestForm, case_id: e.target.value })}><option value=''>Select matter</option>{cases.map((item) => <option key={item.id} value={item.id}>{item.case_number} — {item.title}</option>)}</select>}
        <input className='rounded-xl border p-3 dark:bg-background-dark' placeholder='Required document' value={requestForm.title} onChange={(e) => setRequestForm({ ...requestForm, title: e.target.value })}/>
        <select className='rounded-xl border p-3 dark:bg-background-dark' value={requestForm.document_type} onChange={(e) => setRequestForm({ ...requestForm, document_type: e.target.value })}><option value='EVIDENCE'>Evidence</option><option value='CONTRACT'>Contract / agreement</option><option value='IDENTIFICATION'>Identification</option><option value='FINANCIAL'>Financial record</option><option value='OTHER'>Other</option></select>
        <input className='rounded-xl border p-3 dark:bg-background-dark' type='date' value={requestForm.due_date} onChange={(e) => setRequestForm({ ...requestForm, due_date: e.target.value })}/>
        <textarea className='rounded-xl border p-3 dark:bg-background-dark md:col-span-2' placeholder='Clear instructions to the client' value={requestForm.instructions} onChange={(e) => setRequestForm({ ...requestForm, instructions: e.target.value })}/>
      </div>
      {createRequest.error && <p className='mt-3 text-error'>{errorMessage(createRequest.error, 'Could not create request.')}</p>}
      <button className='mt-4 rounded-xl bg-brand-primary px-4 py-2 text-white disabled:opacity-50' disabled={!requestForm.case_id || !requestForm.title || createRequest.isPending} onClick={() => createRequest.mutate(requestForm)}>Prepare request for dispatch</button>
    </Card>
    <Card className='p-5'>
      <h3 className='font-semibold'>Receive and file a document</h3>
      <p className='mt-1 text-sm text-text-muted-light dark:text-text-muted-dark'>The upload is filed to this client account. Select a matter or the lawyer’s request only when a case reference is required.</p>
      <div className='mt-4 grid gap-3 md:grid-cols-2'>
        {!caseId && <select className='rounded-xl border p-3 dark:bg-background-dark' value={form.case_id} onChange={(e) => setForm({ ...form, case_id: e.target.value, request_id: '' })}><option value=''>No matter reference (client file only)</option>{cases.map((item) => <option key={item.id} value={item.id}>{item.case_number} — {item.title}</option>)}</select>}
        <select className='rounded-xl border p-3 dark:bg-background-dark' value={form.request_id} onChange={(e) => { const request = requests.find((item) => item.id === e.target.value); setForm({ ...form, request_id: e.target.value, case_id: request?.case_id || form.case_id, title: request?.title || form.title, document_type: request?.document_type || form.document_type }); }}><option value=''>General client document (not requested)</option>{outstanding.map((item) => <option key={item.id} value={item.id}>{item.case_number} — {item.title}</option>)}</select>
        <input className='rounded-xl border p-3 dark:bg-background-dark' placeholder='Document title' value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}/>
        <select className='rounded-xl border p-3 dark:bg-background-dark' value={form.document_type} onChange={(e) => setForm({ ...form, document_type: e.target.value })}><option value='EVIDENCE'>Evidence</option><option value='CONTRACT'>Contract / agreement</option><option value='LEGAL'>Legal correspondence</option><option value='IDENTIFICATION'>Identification</option><option value='FINANCIAL'>Financial record</option><option value='OTHER'>Other</option></select>
        <select className='rounded-xl border p-3 dark:bg-background-dark' value={form.received_via} onChange={(e) => setForm({ ...form, received_via: e.target.value })}><option value='IN_PERSON'>Received in person</option><option value='EMAIL'>Received by email</option><option value='WHATSAPP'>Received by WhatsApp</option><option value='COURIER'>Received by courier</option><option value='OTHER'>Other channel</option></select>
        <input className='rounded-xl border p-3 dark:bg-background-dark' type='file' onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })}/>
        <input className='rounded-xl border p-3 dark:bg-background-dark' placeholder='Receipt/file note (optional)' value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}/>
        <label className='flex items-center gap-2 text-sm'><input type='checkbox' checked={form.physical_copy_retained} onChange={(e) => setForm({ ...form, physical_copy_retained: e.target.checked })}/> Physical original/copy retained</label>
        {form.physical_copy_retained && <input className='rounded-xl border p-3 dark:bg-background-dark' placeholder='KYC drawer / physical file location' value={form.physical_storage_location} onChange={(e) => setForm({ ...form, physical_storage_location: e.target.value })}/>}
        <input className='rounded-xl border p-3 dark:bg-background-dark' placeholder='Custody notes (optional)' value={form.custody_notes} onChange={(e) => setForm({ ...form, custody_notes: e.target.value })}/>
      </div>
      {upload.error && <p className='mt-3 text-error'>{errorMessage(upload.error, 'Upload failed.')}</p>}
      {upload.isSuccess && <p className='mt-3 text-success'>Filed to the client account and linked to the matter. The advocate has been notified if this fulfilled a request.</p>}
      <button className='mt-4 flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-white disabled:opacity-50' disabled={!form.file || !form.client_id || upload.isPending} onClick={() => upload.mutate()}><UploadCloud size={17}/>{upload.isPending ? 'Uploading…' : 'File to client account'}</button>
    </Card>
    {data?.selection_error && <p className='rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800'>{data.selection_error}</p>}
    <Card className='p-5'><h3 className='font-semibold'>Required documents and receipt verification</h3><div className='mt-3 space-y-2'>{requests.map((item) => <div key={item.id} className='rounded-xl border p-3'><strong>{item.title}</strong><p className='text-sm'>{item.client_name} · {item.case_number} · {item.status.replaceAll('_', ' ')}</p><p className='text-sm text-text-muted-light dark:text-text-muted-dark'>{item.instructions}</p>{item.status === 'AWAITING_SECRETARY_DISPATCH' && <button className='mt-2 rounded-lg bg-brand-primary px-3 py-1 text-white' onClick={() => setDispatch({ requestId: item.id, message: '' })}>Review and dispatch to client</button>}{dispatch.requestId === item.id && <div className='mt-3 grid gap-2 rounded-xl bg-black/5 p-3 dark:bg-white/5'><textarea className='rounded-xl border p-2 dark:bg-background-dark' placeholder='Optional covering message from the firm' value={dispatch.message} onChange={(e) => setDispatch({ ...dispatch, message: e.target.value })}/><p className='text-xs text-text-muted-light dark:text-text-muted-dark'>Dispatching adds the request to the client portal and records it in the matter communication thread.</p>{dispatchRequest.error && <p className='text-error'>{errorMessage(dispatchRequest.error, 'Could not dispatch request.')}</p>}<button className='rounded-lg bg-success px-3 py-2 text-white disabled:opacity-50' disabled={dispatchRequest.isPending} onClick={() => dispatchRequest.mutate({ requestId: item.id, payload: { message: dispatch.message } })}>Send to client as the firm</button></div>}{item.status === 'PENDING_SECRETARY' && <button className='mt-2 rounded-lg bg-brand-primary px-3 py-1 text-white' onClick={() => setVerification((current) => ({ ...current, requestId: item.id }))}>Verify client upload</button>}{verification.requestId === item.id && <div className='mt-3 grid gap-2 rounded-xl bg-black/5 p-3 dark:bg-white/5'><label><input type='checkbox' checked={verification.correct_client} onChange={(e) => setVerification({ ...verification, correct_client: e.target.checked })}/> Correct client confirmed</label><label><input type='checkbox' checked={verification.readable_complete} onChange={(e) => setVerification({ ...verification, readable_complete: e.target.checked })}/> Scan is readable and administratively complete</label><label><input type='checkbox' checked={verification.matter_link_confirmed} onChange={(e) => setVerification({ ...verification, matter_link_confirmed: e.target.checked })}/> Matter reference confirmed</label><label><input type='checkbox' checked={verification.physical_copy_retained} onChange={(e) => setVerification({ ...verification, physical_copy_retained: e.target.checked })}/> Physical original/copy retained</label>{verification.physical_copy_retained && <input className='rounded-xl border p-2 dark:bg-background-dark' placeholder='KYC drawer / physical file location' value={verification.physical_storage_location} onChange={(e) => setVerification({ ...verification, physical_storage_location: e.target.value })}/>}<input className='rounded-xl border p-2 dark:bg-background-dark' placeholder='Custody notes' value={verification.custody_notes} onChange={(e) => setVerification({ ...verification, custody_notes: e.target.value })}/><textarea className='rounded-xl border p-2 dark:bg-background-dark' placeholder='Verification note for advocate' value={verification.notes} onChange={(e) => setVerification({ ...verification, notes: e.target.value })}/>{verify.error && <p className='text-error'>{errorMessage(verify.error, 'Verification failed.')}</p>}<button className='rounded-lg bg-success px-3 py-2 text-white disabled:opacity-50' disabled={!verification.correct_client || !verification.readable_complete || !verification.matter_link_confirmed || (verification.physical_copy_retained && !verification.physical_storage_location) || verify.isPending} onClick={() => verify.mutate({ requestId: item.id, payload: verification })}>Confirm receipt for advocate review</button></div>}</div>)}{!requests.length && <p>No document requests for this client.</p>}</div></Card>
    <Card className='p-5'><h3 className='font-semibold'>Recently received</h3>{isLoading && <p>Loading…</p>}{error && <p className='text-error'>Failed to load documents.</p>}<div className='mt-3 space-y-2'>{documents.map((item) => <button type='button' onClick={() => downloadDocument(item)} key={item.id} className='flex w-full gap-3 rounded-xl border p-3 text-left'><FileText/><span><strong>{item.title}</strong><small className='block'>{item.reference} · {item.client_name}</small></span></button>)}</div></Card>
    </>}
  </div>;
}
