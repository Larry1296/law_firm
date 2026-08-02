import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText } from 'lucide-react';

import Card from '@/components/ui/Card';
import SectionHeading from '@/components/ui/SectionHeading';
import lawyerDocumentsService from '../services/lawyerDocumentsService';
import downloadDocument from '@/modules/client/documents/utils/downloadDocument';
import { FormButton, ReadOnlyField, SelectInput, TextArea, TextInput } from '@/components/forms';

const requestStatus = {
  AWAITING_SECRETARY_DISPATCH: 'Awaiting secretary dispatch',
  OPEN: 'Sent to client — awaiting upload',
  PENDING_SECRETARY: 'Client uploaded — secretary checking file',
  UPLOADED: 'Secretary verified — advocate review required',
  ACCEPTED: 'Accepted into the matter file',
  REPLACEMENT_REQUIRED: 'Replacement required',
  CANCELLED: 'Cancelled',
};

const actionErrorMessage = (error) => {
  const response = error?.response?.data;
  const detail = response?.detail || response?.message || response;
  if (typeof detail === 'string') return detail;
  if (detail && typeof detail === 'object') return String(Object.values(detail).flat()[0]);
  return 'The document action could not be completed.';
};

export default function LawyerDocumentsPage({ caseId = '', compact = false }) {
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const [actionNotice, setActionNotice] = useState(null);
  const [request, setRequest] = useState({ action: 'request', case_id: caseId, title: '', document_type: 'EVIDENCE', instructions: '', due_date: '' });
  const [reference, setReference] = useState({ action: 'reference', case_id: caseId, document_id: '', purpose: 'EVIDENCE' });
  const [workProduct, setWorkProduct] = useState({ case_id: caseId, title: '', attachment_type: 'CORRESPONDENCE', description: '', physical_copy_type: 'OFFICE_COPY', physical_storage_location: '', document_date: '', is_client_visible: false });
  const { data, isLoading, error } = useQuery({ queryKey: ['lawyer-documents', caseId, q], queryFn: () => lawyerDocumentsService.getDocuments({ case_id: caseId || undefined, q: q || undefined }) });
  const action = useMutation({
    mutationFn: lawyerDocumentsService.createAction,
    onMutate: () => setActionNotice(null),
    onSuccess: (result, variables) => {
      if (variables.action === 'reference') {
        setActionNotice({ type: 'success', message: `${result.reference || 'The physical document'} was referenced to this matter as ${variables.purpose?.replaceAll('_', ' ').toLowerCase() || 'a supporting record'}.` });
        setReference((current) => ({ ...current, document_id: '' }));
      } else if (variables.action === 'request') {
        setActionNotice({ type: 'success', message: 'The additional document request was sent to the secretary.' });
        setRequest((current) => ({ ...current, title: '', instructions: '', due_date: '' }));
      }
      queryClient.invalidateQueries({ queryKey: ['lawyer-documents'] });
    },
    onError: (mutationError) => setActionNotice({
      type: 'error',
      message: actionErrorMessage(mutationError),
    }),
  });
  const review = useMutation({ mutationFn: lawyerDocumentsService.reviewRequest, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lawyer-documents'] }) });
  const createWorkProduct = useMutation({ mutationFn: lawyerDocumentsService.createMatterDocument, onMutate: () => setActionNotice(null), onSuccess: (result) => { setWorkProduct((current) => ({ ...current, title: '', description: '', document_date: '' })); setActionNotice({ type: 'success', message: `${result.document_reference} was registered in the physical matter file.` }); queryClient.invalidateQueries({ queryKey: ['lawyer-documents'] }); }, onError: (mutationError) => setActionNotice({ type: 'error', message: actionErrorMessage(mutationError) }) });
  const documents = data?.documents || [];
  const requests = data?.requests || [];
  const cases = data?.cases || [];
  const generatedMatterDocuments = data?.matter_documents || [];
  const selectedCase = cases.find((item) => String(item.id) === String(reference.case_id));
  const selectableDocuments = documents;
  const matterDocuments = data?.referenced_documents || documents.filter((item) => item.matters?.some((matter) => String(matter.id) === String(caseId)));

  return <div className={compact ? 'space-y-4' : 'space-y-6 p-4 md:p-6'}>
    {!compact && <SectionHeading title='Client documents' subtitle='Search the real client file, reference documents to matters, and request missing records.' />}
    {caseId && <Card className='border-l-4 border-l-brand-primary p-5'>
      <h3 className='font-semibold'>Advocate document workflow</h3>
      <p className='mt-1 text-sm text-text-muted-light dark:text-text-muted-dark'>Request a physical client record through the secretary. Its KYC document reference is issued only when the secretary receives and registers the actual record.</p>
    </Card>}
    <Card className='p-5'>
      <h3 className='font-semibold'>A. Client-supplied physical documents</h3>
      <p className='mt-1 text-sm'>Search all master-register records belonging to this matter&apos;s client. Selecting one creates a matter reference; it does not copy the document.</p>
      {error && <p role='alert' className='mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-error dark:border-red-900 dark:bg-red-950/30'>The physical register could not be loaded. Refresh the page or confirm that you are signed in as the assigned advocate.</p>}
      {actionNotice && <p role={actionNotice.type === 'error' ? 'alert' : 'status'} className={`mt-3 rounded-lg border p-3 text-sm ${actionNotice.type === 'error' ? 'border-red-200 bg-red-50 text-error dark:border-red-900 dark:bg-red-950/30' : 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200'}`}>{actionNotice.message}</p>}
      {selectedCase && <div className='mt-4 grid gap-4 md:grid-cols-3'><ReadOnlyField label='Matter' value={selectedCase.case_number} /><ReadOnlyField label='Client' value={selectedCase.client_name} /><ReadOnlyField label='KYC file' value={selectedCase.kyc_drawer_reference || 'Not assigned'} /></div>}
      <div className='mt-3 grid gap-3 md:grid-cols-3'>
        {!caseId && <SelectInput label='Matter' name='reference_case_id' value={reference.case_id} onChange={(e) => setReference({ ...reference, case_id: e.target.value, document_id: '' })} options={cases.map((item) => ({ value: item.id, label: `${item.case_number} — ${item.client_name}` }))} />}
        <TextInput label='Search physical register' name='document_search' placeholder='Example: Supply Agreement or KYC-2026-001/D3' value={q} onChange={(e) => setQ(e.target.value)} />
        <SelectInput label='Choose matching document' name='reference_document_id' value={reference.document_id} onChange={(e) => setReference({ ...reference, document_id: e.target.value })}>{selectableDocuments.map((item) => <option key={item.id} value={item.id}>{item.reference} — {item.subtype_label}{item.document_owner_subject ? ` — ${item.document_owner_subject}` : ''}{item.document_identifier ? ` — ${item.document_identifier}` : ''} — {item.source_copy_type_label || item.source_copy_type.replaceAll('_', ' ')}{item.page_count ? ` — ${item.page_count} pages` : ''}{item.verification_status ? ` — ${item.verification_status.replaceAll('_', ' ')}` : ''}{item.physical_storage_location ? ` — ${item.physical_storage_location}` : ''}</option>)}</SelectInput>
        <SelectInput label='Purpose' name='reference_purpose' value={reference.purpose} onChange={(e) => setReference({ ...reference, purpose: e.target.value })} placeholder={null} options={[{ value: 'EVIDENCE', label: 'Evidence' }, { value: 'DEMAND_LETTER', label: 'Demand letter sent to opposing party' }, { value: 'CORRESPONDENCE', label: 'Correspondence' }, { value: 'PLEADING', label: 'Pleading' }, { value: 'COURT_DOCUMENT', label: 'Court document' }, { value: 'OTHER', label: 'Other' }]} />
      </div>
      <FormButton className='mt-4' disabled={!reference.case_id || !reference.document_id || action.isPending} onClick={() => action.mutate(reference)}>Reference selected document</FormButton>
    </Card>
    <Card className='p-5'>
      <h3 className='font-semibold'>B. Matter-generated or matter-received work product</h3>
      <p className='mt-1 text-sm'>Register the physical office copy, original or court-stamped copy held in the matter file. No digital file is uploaded. It receives a stable {selectedCase?.case_number || 'MAT reference'}/D001 reference and remains separate from the client KYC register.</p>
      <div className='mt-3 grid gap-3 md:grid-cols-2'>
        {!caseId && <select className='border-b p-3 dark:bg-background-dark' value={workProduct.case_id} onChange={(e) => setWorkProduct({ ...workProduct, case_id: e.target.value })}><option value=''>Select matter</option>{cases.map((item) => <option key={item.id} value={item.id}>{item.case_number} — {item.client_name}</option>)}</select>}
        <TextInput label='Document title' name='matter_document_title' placeholder='Example: Demand Letter to Baraka Distributors Limited' value={workProduct.title} onChange={(e) => setWorkProduct({ ...workProduct, title: e.target.value })}/>
        <SelectInput label='Document type' name='matter_document_type' value={workProduct.attachment_type} onChange={(e) => setWorkProduct({ ...workProduct, attachment_type: e.target.value })} placeholder={null} options={[{ value: 'CORRESPONDENCE', label: 'Correspondence / demand letter' }, { value: 'PLEADING', label: 'Pleading' }, { value: 'AFFIDAVIT', label: 'Affidavit / witness statement' }, { value: 'COURT_ORDER', label: 'Court order' }, { value: 'RULING', label: 'Ruling' }, { value: 'JUDGMENT', label: 'Judgment' }, { value: 'DECREE', label: 'Decree' }, { value: 'RECEIPT', label: 'Filing / payment receipt' }, { value: 'OTHER', label: 'Other' }]} />
        <SelectInput label='Physical copy type' name='matter_document_copy_type' value={workProduct.physical_copy_type} onChange={(e) => setWorkProduct({ ...workProduct, physical_copy_type: e.target.value })} placeholder={null} options={[{ value: 'OFFICE_COPY', label: 'Office copy' }, { value: 'ORIGINAL', label: 'Original' }, { value: 'CERTIFIED_COPY', label: 'Certified copy' }, { value: 'COURT_STAMPED_COPY', label: 'Court-stamped copy' }, { value: 'PHOTOCOPY', label: 'Photocopy' }]} />
        <TextInput label='Document date' name='matter_document_date' type='date' value={workProduct.document_date} onChange={(e) => setWorkProduct({ ...workProduct, document_date: e.target.value })} optional />
        <TextInput label='Physical matter-file location' name='matter_document_location' placeholder={`Example: Active Matters / ${selectedCase?.case_number || 'MAT-…'} / Correspondence / Item 1`} help='Record the cabinet, physical matter file and internal section.' value={workProduct.physical_storage_location} onChange={(e) => setWorkProduct({ ...workProduct, physical_storage_location: e.target.value })} required className='md:col-span-2' />
        <TextArea label='Description or version note' name='matter_document_description' className='md:col-span-2' placeholder='Summarise the document and its purpose.' value={workProduct.description} onChange={(e) => setWorkProduct({ ...workProduct, description: e.target.value })}/>
        <label className='flex items-center gap-2'><input type='checkbox' checked={workProduct.is_client_visible} onChange={(e) => setWorkProduct({ ...workProduct, is_client_visible: e.target.checked })}/> Explicitly visible to client</label>
      </div>
      <FormButton className='mt-4' disabled={!workProduct.case_id || !workProduct.title || !workProduct.physical_storage_location || createWorkProduct.isPending} onClick={() => createWorkProduct.mutate(workProduct)}>Register physical matter document</FormButton>
    </Card>
    <Card className='p-5'>
      <h3 className='font-semibold'>Request an additional document through the secretary</h3>
      <div className='mt-3 grid gap-3 md:grid-cols-2'>
        {!caseId && <select className='rounded-xl border p-3 dark:bg-background-dark' value={request.case_id} onChange={(e) => setRequest({ ...request, case_id: e.target.value })}><option value=''>Select matter</option>{cases.map((item) => <option key={item.id} value={item.id}>{item.case_number} — {item.client_name}</option>)}</select>}
        <TextInput label='Document requested' name='requested_document_title' placeholder='Example: Acknowledged delivery note dated 20 January 2026' value={request.title} onChange={(e) => setRequest({ ...request, title: e.target.value })}/>
        <TextArea label='Requirement' name='requested_document_instructions' placeholder='Describe exactly what the supplied document must confirm.' value={request.instructions} onChange={(e) => setRequest({ ...request, instructions: e.target.value })}/>
        <TextInput label='Due date' name='requested_document_due_date' type='date' value={request.due_date} onChange={(e) => setRequest({ ...request, due_date: e.target.value })}/>
      </div>
      <FormButton className='mt-4' disabled={!request.case_id || !request.title || action.isPending} onClick={() => action.mutate(request)}>Send request to secretary</FormButton>
    </Card>
    <Card className='p-5'><h3 className='font-semibold'>Required documents and advocate review</h3><p className='mt-1 text-sm text-text-muted-light dark:text-text-muted-dark'>Track each requested item from secretary dispatch through receipt verification and legal acceptance.</p><div className='mt-3 space-y-2'>{requests.map((item) => { const fulfilled = documents.find((document) => String(document.id) === String(item.fulfilled_document_id)); return <div key={item.id} className='border-l-4 border-l-brand-primary bg-black/[0.02] p-4 dark:bg-white/[0.03]'><div className='flex flex-wrap items-start justify-between gap-2'><strong>{item.title}</strong><span className='text-xs font-semibold uppercase tracking-wide text-brand-primary'>{requestStatus[item.status] || item.status.replaceAll('_', ' ')}</span></div><p className='mt-1 text-sm'>{item.client_name} · {item.case_number}{item.due_date ? ` · Due ${item.due_date}` : ''}</p>{item.instructions && <p className='mt-2 text-sm text-text-muted-light dark:text-text-muted-dark'>{item.instructions}</p>}{item.secretary_verified_by && <p className='mt-2 text-xs'>Filed and verified by {item.secretary_verified_by}</p>}{fulfilled && <button type='button' className='mt-2 inline-flex items-center gap-2 text-sm font-semibold text-brand-primary' onClick={() => downloadDocument(fulfilled)}><FileText size={16}/>Open supplied document</button>}{item.status === 'UPLOADED' && <div className='mt-3 flex flex-wrap gap-2'><button className='bg-success px-3 py-2 text-white' onClick={() => review.mutate({ requestId: item.id, decision: 'ACCEPTED' })}>Accept into matter file</button><button className='bg-warning px-3 py-2 text-white' onClick={() => review.mutate({ requestId: item.id, decision: 'REPLACEMENT_REQUIRED' })}>Return to secretary for replacement</button></div>}</div>; })}{requests.length === 0 && <p>No required documents have been recorded for this matter.</p>}</div></Card>
    <Card className='p-5'><h3 className='font-semibold'>Matter documents</h3>{isLoading && <p>Loading register…</p>}<div className='mt-4 grid gap-5 lg:grid-cols-2'><div><h4 className='text-sm font-bold uppercase tracking-wide'>Referenced physical client documents</h4><div className='mt-2 space-y-2'>{matterDocuments.map((item) => <details key={item.id} className='border-b p-3'><summary className='cursor-pointer font-semibold text-brand-primary'>{item.reference}</summary><p className='mt-2 text-sm'>{item.subtype_label}{item.document_identifier ? ` · ${item.document_identifier}` : ''} · {item.source_copy_type_label || item.source_copy_type.replaceAll('_', ' ')}</p><p className='text-sm'>Physical location: {item.physical_storage_location || 'Not recorded'}</p></details>)}{!matterDocuments.length && <p className='text-sm text-text-muted-light dark:text-text-muted-dark'>No physical client documents referenced.</p>}</div></div><div><h4 className='text-sm font-bold uppercase tracking-wide'>Physical matter-file documents</h4><div className='mt-2 space-y-2'>{generatedMatterDocuments.map((item) => <div key={item.id} className='border-b p-3'><strong>{item.document_reference} — {item.title}</strong><small className='mt-1 block'>{item.attachment_type_label} · {item.physical_copy_type_label}</small><small className='block'>Physical location: {item.physical_storage_location}</small></div>)}{!generatedMatterDocuments.length && <p className='text-sm text-text-muted-light dark:text-text-muted-dark'>No physical matter documents recorded.</p>}</div></div></div></Card>
  </div>;
}
