import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileSearch, FileText } from 'lucide-react';

import Card from '@/components/ui/Card';
import SectionHeading from '@/components/ui/SectionHeading';
import lawyerDocumentsService from '../services/lawyerDocumentsService';
import downloadDocument from '@/modules/client/documents/utils/downloadDocument';

const requestStatus = {
  AWAITING_SECRETARY_DISPATCH: 'Awaiting secretary dispatch',
  OPEN: 'Sent to client — awaiting upload',
  PENDING_SECRETARY: 'Client uploaded — secretary checking file',
  UPLOADED: 'Secretary verified — advocate review required',
  ACCEPTED: 'Accepted into the matter file',
  REPLACEMENT_REQUIRED: 'Replacement required',
  CANCELLED: 'Cancelled',
};

export default function LawyerDocumentsPage({ caseId = '', compact = false }) {
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const [request, setRequest] = useState({ action: 'request', case_id: caseId, title: '', document_type: 'EVIDENCE', instructions: '', due_date: '' });
  const [reference, setReference] = useState({ action: 'reference', case_id: caseId, document_id: '', purpose: 'EVIDENCE' });
  const { data, isLoading } = useQuery({ queryKey: ['lawyer-documents', caseId, q], queryFn: () => lawyerDocumentsService.getDocuments({ case_id: caseId || undefined, q }) });
  const action = useMutation({ mutationFn: lawyerDocumentsService.createAction, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lawyer-documents'] }) });
  const review = useMutation({ mutationFn: lawyerDocumentsService.reviewRequest, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lawyer-documents'] }) });
  const documents = data?.documents || [];
  const requests = data?.requests || [];
  const cases = data?.cases || [];
  const selectedCase = cases.find((item) => String(item.id) === String(reference.case_id));
  const selectableDocuments = documents.filter((item) => !selectedCase || String(item.client_id) === String(selectedCase.client_id));
  const matterDocuments = documents.filter((item) => item.matters?.some((matter) => String(matter.id) === String(caseId)));
  const clientFileDocuments = documents.filter((item) => !item.matters?.some((matter) => String(matter.id) === String(caseId)));

  return <div className={compact ? 'space-y-4' : 'space-y-6 p-4 md:p-6'}>
    {!compact && <SectionHeading title='Client documents' subtitle='Search the real client file, reference documents to matters, and request missing records.' />}
    {caseId && <Card className='border-l-4 border-l-brand-primary p-5'>
      <h3 className='font-semibold'>Advocate document workflow</h3>
      <p className='mt-1 text-sm text-text-muted-light dark:text-text-muted-dark'>Request the record here. A permanent KYC drawer reference is reserved immediately. The secretary dispatches, receives and files the physical record; any upload is only its safety copy.</p>
    </Card>}
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
      <h3 className='font-semibold'>Request an additional document through the secretary</h3>
      <div className='mt-3 grid gap-3 md:grid-cols-2'>
        {!caseId && <select className='rounded-xl border p-3 dark:bg-background-dark' value={request.case_id} onChange={(e) => setRequest({ ...request, case_id: e.target.value })}><option value=''>Select matter</option>{cases.map((item) => <option key={item.id} value={item.id}>{item.case_number} — {item.client_name}</option>)}</select>}
        <input className='rounded-xl border p-3 dark:bg-background-dark' placeholder='e.g. Signed credit agreement' value={request.title} onChange={(e) => setRequest({ ...request, title: e.target.value })}/>
        <textarea className='rounded-xl border p-3 dark:bg-background-dark' placeholder='What should the client or secretary provide?' value={request.instructions} onChange={(e) => setRequest({ ...request, instructions: e.target.value })}/>
        <input className='rounded-xl border p-3 dark:bg-background-dark' type='date' value={request.due_date} onChange={(e) => setRequest({ ...request, due_date: e.target.value })}/>
      </div>
      <button className='mt-3 rounded-xl bg-brand-primary px-4 py-2 text-white disabled:opacity-50' disabled={!request.case_id || !request.title || action.isPending} onClick={() => action.mutate(request)}>Send request to secretary</button>
    </Card>
    <Card className='p-5'><h3 className='font-semibold'>Required documents and advocate review</h3><p className='mt-1 text-sm text-text-muted-light dark:text-text-muted-dark'>Track each requested item from secretary dispatch through receipt verification and legal acceptance.</p><div className='mt-3 space-y-2'>{requests.map((item) => { const fulfilled = documents.find((document) => String(document.id) === String(item.fulfilled_document_id)); return <div key={item.id} className='border-l-4 border-l-brand-primary bg-black/[0.02] p-4 dark:bg-white/[0.03]'><div className='flex flex-wrap items-start justify-between gap-2'><strong>{item.title}</strong><span className='text-xs font-semibold uppercase tracking-wide text-brand-primary'>{requestStatus[item.status] || item.status.replaceAll('_', ' ')}</span></div><p className='mt-1 text-sm'>{item.client_name} · {item.case_number}{item.due_date ? ` · Due ${item.due_date}` : ''}</p>{item.instructions && <p className='mt-2 text-sm text-text-muted-light dark:text-text-muted-dark'>{item.instructions}</p>}{item.secretary_verified_by && <p className='mt-2 text-xs'>Filed and verified by {item.secretary_verified_by}</p>}{fulfilled && <button type='button' className='mt-2 inline-flex items-center gap-2 text-sm font-semibold text-brand-primary' onClick={() => downloadDocument(fulfilled)}><FileText size={16}/>Open supplied document</button>}{item.status === 'UPLOADED' && <div className='mt-3 flex flex-wrap gap-2'><button className='bg-success px-3 py-2 text-white' onClick={() => review.mutate({ requestId: item.id, decision: 'ACCEPTED' })}>Accept into matter file</button><button className='bg-warning px-3 py-2 text-white' onClick={() => review.mutate({ requestId: item.id, decision: 'REPLACEMENT_REQUIRED' })}>Return to secretary for replacement</button></div>}</div>; })}{requests.length === 0 && <p>No required documents have been recorded for this matter.</p>}</div></Card>
    <Card className='p-5'><h3 className='font-semibold'>Matter documents and client KYC file</h3>{isLoading && <p>Loading file…</p>}<div className='mt-4 grid gap-5 lg:grid-cols-2'><div><h4 className='text-sm font-bold uppercase tracking-wide'>Linked to this matter</h4><div className='mt-2 space-y-2'>{matterDocuments.map((item) => <button type='button' onClick={() => downloadDocument(item)} key={item.id} className='flex w-full gap-3 border-b p-3 text-left'><FileText/><span><strong>{item.title}</strong><small className='block'>{item.reference} · {item.document_type_label}</small></span></button>)}{!matterDocuments.length && <p className='text-sm text-text-muted-light dark:text-text-muted-dark'>No documents linked to this matter.</p>}</div></div><div><h4 className='text-sm font-bold uppercase tracking-wide'>Client/KYC drawer</h4><p className='text-xs text-text-muted-light dark:text-text-muted-dark'>Client-file records not yet referenced to this matter.</p><div className='mt-2 space-y-2'>{clientFileDocuments.map((item) => <button type='button' onClick={() => downloadDocument(item)} key={item.id} className='flex w-full gap-3 border-b p-3 text-left'><FileText/><span><strong>{item.title}</strong><small className='block'>{item.reference} · {item.document_type_label}</small></span></button>)}{!clientFileDocuments.length && <p className='text-sm text-text-muted-light dark:text-text-muted-dark'>No unlinked client/KYC documents.</p>}</div></div></div></Card>
  </div>;
}
