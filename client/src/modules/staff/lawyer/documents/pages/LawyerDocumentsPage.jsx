import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileSearch, FileText } from 'lucide-react';

import Card from '@/components/ui/Card';
import SectionHeading from '@/components/ui/SectionHeading';
import lawyerDocumentsService from '../services/lawyerDocumentsService';
import downloadDocument from '@/modules/client/documents/utils/downloadDocument';

export default function LawyerDocumentsPage({ caseId = '', compact = false }) {
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const [request, setRequest] = useState({ action: 'request', case_id: caseId, title: '', document_type: 'EVIDENCE', instructions: '', due_date: '' });
  const [reference, setReference] = useState({ action: 'reference', case_id: caseId, document_id: '', purpose: 'EVIDENCE' });
  const [uploadForm, setUploadForm] = useState({ action: 'upload', case_id: caseId, title: '', document_type: 'LEGAL', purpose: 'CORRESPONDENCE', description: '', file: null });
  const { data, isLoading } = useQuery({ queryKey: ['lawyer-documents', caseId, q], queryFn: () => lawyerDocumentsService.getDocuments({ case_id: caseId || undefined, q }) });
  const action = useMutation({ mutationFn: lawyerDocumentsService.createAction, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lawyer-documents'] }) });
  const review = useMutation({ mutationFn: lawyerDocumentsService.reviewRequest, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lawyer-documents'] }) });
  const documents = data?.documents || [];
  const requests = data?.requests || [];
  const cases = data?.cases || [];
  const selectedCase = cases.find((item) => String(item.id) === String(reference.case_id));
  const selectableDocuments = documents.filter((item) => !selectedCase || String(item.client_id) === String(selectedCase.client_id));

  return <div className={compact ? 'space-y-4' : 'space-y-6 p-4 md:p-6'}>
    {!compact && <SectionHeading title='Client documents' subtitle='Search the real client file, reference documents to matters, and request missing records.' />}
    <Card className='p-5'>
      <h3 className='font-semibold'>File outgoing correspondence or a prepared document</h3>
      <p className='mt-1 text-sm text-text-muted-light dark:text-text-muted-dark'>For example, upload the demand letter actually sent to the opposing party. It is stored on the client file and referenced to this matter; Sheria Master does not send it to the opposing party.</p>
      <div className='mt-3 grid gap-3 md:grid-cols-2'>
        {!caseId && <select className='rounded-xl border p-3 dark:bg-background-dark' value={uploadForm.case_id} onChange={(e) => setUploadForm({ ...uploadForm, case_id: e.target.value })}><option value=''>Select matter</option>{cases.map((item) => <option key={item.id} value={item.id}>{item.case_number} — {item.client_name}</option>)}</select>}
        <input className='rounded-xl border p-3 dark:bg-background-dark' placeholder='Document title' value={uploadForm.title} onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}/>
        <select className='rounded-xl border p-3 dark:bg-background-dark' value={uploadForm.purpose} onChange={(e) => setUploadForm({ ...uploadForm, purpose: e.target.value })}><option value='CORRESPONDENCE'>Correspondence</option><option value='DEMAND_LETTER'>Demand letter sent to opposing party</option><option value='PLEADING'>Pleading</option><option value='COURT_DOCUMENT'>Court document</option><option value='EVIDENCE'>Evidence</option></select>
        <input className='rounded-xl border p-3 dark:bg-background-dark' type='file' onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files?.[0] || null })}/>
      </div>
      <button className='mt-3 rounded-xl bg-brand-primary px-4 py-2 text-white disabled:opacity-50' disabled={!uploadForm.case_id || !uploadForm.file || action.isPending} onClick={() => { const payload = new FormData(); Object.entries(uploadForm).forEach(([key, value]) => value && payload.append(key, value)); action.mutate(payload); }}>File to client and matter</button>
    </Card>
    <Card className='p-5'>
      <h3 className='font-semibold'>Find and reference a client document</h3>
      <div className='mt-3 grid gap-3 md:grid-cols-3'>
        {!caseId && <select className='rounded-xl border p-3 dark:bg-background-dark' value={reference.case_id} onChange={(e) => setReference({ ...reference, case_id: e.target.value, document_id: '' })}><option value=''>Select matter</option>{cases.map((item) => <option key={item.id} value={item.id}>{item.case_number} — {item.client_name}</option>)}</select>}
        <label className='relative'><FileSearch className='absolute left-3 top-3' size={18}/><input className='w-full rounded-xl border py-3 pl-10 pr-3 dark:bg-background-dark' placeholder='Start typing title, file name or DOC reference…' value={q} onChange={(e) => setQ(e.target.value)} /></label>
        <select className='rounded-xl border p-3 dark:bg-background-dark' value={reference.document_id} onChange={(e) => setReference({ ...reference, document_id: e.target.value })}><option value=''>Choose matching document</option>{selectableDocuments.map((item) => <option key={item.id} value={item.id}>{item.reference} — {item.title}</option>)}</select>
        <select className='rounded-xl border p-3 dark:bg-background-dark' value={reference.purpose} onChange={(e) => setReference({ ...reference, purpose: e.target.value })}><option value='EVIDENCE'>Evidence</option><option value='DEMAND_LETTER'>Demand letter sent to opposing party</option><option value='CORRESPONDENCE'>Correspondence</option><option value='PLEADING'>Pleading</option><option value='COURT_DOCUMENT'>Court document</option><option value='OTHER'>Other</option></select>
      </div>
      <button className='mt-3 rounded-xl bg-brand-primary px-4 py-2 text-white disabled:opacity-50' disabled={!reference.case_id || !reference.document_id || action.isPending} onClick={() => action.mutate(reference)}>Reference selected document</button>
    </Card>
    <Card className='p-5'>
      <h3 className='font-semibold'>Request a document from the client</h3>
      <div className='mt-3 grid gap-3 md:grid-cols-2'>
        {!caseId && <select className='rounded-xl border p-3 dark:bg-background-dark' value={request.case_id} onChange={(e) => setRequest({ ...request, case_id: e.target.value })}><option value=''>Select matter</option>{cases.map((item) => <option key={item.id} value={item.id}>{item.case_number} — {item.client_name}</option>)}</select>}
        <input className='rounded-xl border p-3 dark:bg-background-dark' placeholder='e.g. Signed credit agreement' value={request.title} onChange={(e) => setRequest({ ...request, title: e.target.value })}/>
        <textarea className='rounded-xl border p-3 dark:bg-background-dark' placeholder='What should the client or secretary provide?' value={request.instructions} onChange={(e) => setRequest({ ...request, instructions: e.target.value })}/>
        <input className='rounded-xl border p-3 dark:bg-background-dark' type='date' value={request.due_date} onChange={(e) => setRequest({ ...request, due_date: e.target.value })}/>
      </div>
      <button className='mt-3 rounded-xl bg-brand-primary px-4 py-2 text-white disabled:opacity-50' disabled={!request.case_id || !request.title || action.isPending} onClick={() => action.mutate(request)}>Send document request</button>
    </Card>
    <Card className='p-5'><h3 className='font-semibold'>Required documents and advocate review</h3><div className='mt-3 space-y-2'>{requests.map((item) => <div key={item.id} className='rounded-xl border p-3'><strong>{item.title}</strong><p className='text-sm'>{item.client_name} · {item.case_number} · {item.status.replaceAll('_', ' ')}</p>{item.status === 'UPLOADED' && <div className='mt-2 flex gap-2'><button className='rounded-lg bg-success px-3 py-1 text-white' onClick={() => review.mutate({ requestId: item.id, decision: 'ACCEPTED' })}>Accept</button><button className='rounded-lg bg-warning px-3 py-1 text-white' onClick={() => review.mutate({ requestId: item.id, decision: 'REPLACEMENT_REQUIRED' })}>Request replacement</button></div>}</div>)}{requests.length === 0 && <p>No document requests for this selection.</p>}</div></Card>
    <Card className='p-5'><h3 className='font-semibold'>Documents available to reference</h3>{isLoading && <p>Searching…</p>}<div className='mt-3 space-y-2'>{documents.map((item) => <button type='button' onClick={() => downloadDocument(item)} key={item.id} className='flex w-full gap-3 rounded-xl border p-3 text-left'><FileText/><span><strong>{item.title}</strong><small className='block'>{item.reference} · {item.document_type_label}{item.matters?.length ? ` · ${item.matters.map((m) => m.case_number).join(', ')}` : ' · Client file only'}</small></span></button>)}</div></Card>
  </div>;
}
