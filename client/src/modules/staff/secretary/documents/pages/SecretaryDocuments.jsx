import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, UploadCloud } from 'lucide-react';

import Card from '@/components/ui/Card';
import SectionHeading from '@/components/ui/SectionHeading';
import secretaryDocumentsService from '../services/secretaryDocumentsService';
import downloadDocument from '@/modules/client/documents/utils/downloadDocument';

export default function SecretaryDocuments({ caseId = '', compact = false }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ case_id: caseId, request_id: '', title: '', document_type: 'EVIDENCE', purpose: 'CLIENT_INSTRUCTION', description: '', file: null });
  const { data, isLoading, error } = useQuery({ queryKey: ['secretary-documents', caseId], queryFn: () => secretaryDocumentsService.getDocuments(caseId ? { case_id: caseId } : {}) });
  const upload = useMutation({
    mutationFn: async () => { const payload = new FormData(); Object.entries(form).forEach(([key, value]) => value && payload.append(key, value)); return secretaryDocumentsService.uploadDocument(payload); },
    onSuccess: () => { setForm((current) => ({ ...current, request_id: '', title: '', description: '', file: null })); queryClient.invalidateQueries({ queryKey: ['secretary-documents'] }); },
  });
  const cases = data?.cases || [];
  const requests = data?.requests || [];
  const documents = data?.documents || [];
  const outstanding = requests.filter((item) => ['OPEN', 'REPLACEMENT_REQUIRED'].includes(item.status));

  return <div className={compact ? 'space-y-4' : 'space-y-6 p-4 md:p-6'}>
    {!compact && <SectionHeading title='Client document desk' subtitle='Receive requested records into the client file without exposing legal strategy or privileged case work.' />}
    <Card className='p-5'>
      <h3 className='font-semibold'>Receive and file a document</h3>
      <p className='mt-1 text-sm text-text-muted-light dark:text-text-muted-dark'>Select the lawyer’s request when applicable. Completion immediately appears on the advocate’s matter page.</p>
      <div className='mt-4 grid gap-3 md:grid-cols-2'>
        {!caseId && <select className='rounded-xl border p-3 dark:bg-background-dark' value={form.case_id} onChange={(e) => setForm({ ...form, case_id: e.target.value, request_id: '' })}><option value=''>Select assigned matter</option>{cases.map((item) => <option key={item.id} value={item.id}>{item.case_number} — {item.client_name}</option>)}</select>}
        <select className='rounded-xl border p-3 dark:bg-background-dark' value={form.request_id} onChange={(e) => { const request = requests.find((item) => item.id === e.target.value); setForm({ ...form, request_id: e.target.value, case_id: request?.case_id || form.case_id, title: request?.title || form.title, document_type: request?.document_type || form.document_type }); }}><option value=''>General client document (not requested)</option>{outstanding.map((item) => <option key={item.id} value={item.id}>{item.case_number} — {item.title}</option>)}</select>
        <input className='rounded-xl border p-3 dark:bg-background-dark' placeholder='Document title' value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}/>
        <select className='rounded-xl border p-3 dark:bg-background-dark' value={form.document_type} onChange={(e) => setForm({ ...form, document_type: e.target.value })}><option value='EVIDENCE'>Evidence</option><option value='CONTRACT'>Contract / agreement</option><option value='LEGAL'>Legal correspondence</option><option value='IDENTIFICATION'>Identification</option><option value='FINANCIAL'>Financial record</option><option value='OTHER'>Other</option></select>
        <input className='rounded-xl border p-3 dark:bg-background-dark' type='file' onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })}/>
        <input className='rounded-xl border p-3 dark:bg-background-dark' placeholder='Receipt/file note (optional)' value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}/>
      </div>
      {upload.error && <p className='mt-3 text-error'>{upload.error?.response?.data?.detail || 'Upload failed.'}</p>}
      {upload.isSuccess && <p className='mt-3 text-success'>Filed to the client account and linked to the matter. The advocate has been notified if this fulfilled a request.</p>}
      <button className='mt-4 flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-white disabled:opacity-50' disabled={!form.file || (!form.case_id && !form.request_id) || upload.isPending} onClick={() => upload.mutate()}><UploadCloud size={17}/>{upload.isPending ? 'Uploading…' : 'File document'}</button>
    </Card>
    <Card className='p-5'><h3 className='font-semibold'>Outstanding advocate requests</h3><div className='mt-3 space-y-2'>{outstanding.map((item) => <div key={item.id} className='rounded-xl border p-3'><strong>{item.title}</strong><p className='text-sm'>{item.client_name} · {item.case_number}{item.due_date ? ` · due ${item.due_date}` : ''}</p><p className='text-sm text-text-muted-light dark:text-text-muted-dark'>{item.instructions}</p></div>)}{!outstanding.length && <p>No outstanding requests.</p>}</div></Card>
    <Card className='p-5'><h3 className='font-semibold'>Recently received</h3>{isLoading && <p>Loading…</p>}{error && <p className='text-error'>Failed to load documents.</p>}<div className='mt-3 space-y-2'>{documents.map((item) => <button type='button' onClick={() => downloadDocument(item)} key={item.id} className='flex w-full gap-3 rounded-xl border p-3 text-left'><FileText/><span><strong>{item.title}</strong><small className='block'>{item.reference} · {item.client_name}</small></span></button>)}</div></Card>
  </div>;
}
