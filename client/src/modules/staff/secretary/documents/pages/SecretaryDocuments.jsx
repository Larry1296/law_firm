import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText } from 'lucide-react';

import Card from '@/components/ui/Card';
import Button3D from '@/components/ui/Button3D';
import FloatingInput from '@/components/ui/FloatingInput';
import FormSection from '@/components/ui/FormSection';
import SectionHeading from '@/components/ui/SectionHeading';
import Select3D from '@/components/ui/Select3D';
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

const DOCUMENT_PRESETS = [
  { label: 'NGO Registration Certificate', title: 'Certificate of NGO Registration', document_type: 'REGISTRATION', category: 'ENTITY_RECORD', subtype: 'INCORPORATION' },
  { label: 'KRA PIN Certificate', title: 'KRA PIN Certificate', document_type: 'TAX', category: 'KYC_TAX', subtype: 'KRA_PIN' },
  { label: 'National ID', title: 'National ID of Authorized NGO Official', document_type: 'IDENTIFICATION', category: 'KYC_IDENTITY', subtype: 'NATIONAL_ID' },
  { label: 'Authority to Instruct', title: 'Authority to Instruct Advocates', document_type: 'LEGAL', category: 'ENTITY_RECORD', subtype: 'AUTHORITY_TO_INSTRUCT' },
  { label: 'Contract', title: 'Contract or Agreement', document_type: 'CONTRACT', category: 'TRANSACTION', subtype: 'CONTRACT' },
  { label: 'Invoice', title: 'Invoice', document_type: 'FINANCIAL', category: 'TRANSACTION', subtype: 'INVOICE' },
  { label: 'Delivery Note', title: 'Delivery Note', document_type: 'EVIDENCE', category: 'TRANSACTION', subtype: 'DELIVERY_NOTE' },
];

export default function SecretaryDocuments({ caseId = '', compact = false }) {
  const queryClient = useQueryClient();
  const [selectedClientId, setSelectedClientId] = useState('');
  const [form, setForm] = useState({ client_id: '', case_id: caseId, request_id: '', title: '', document_reference: '', received_from: '', received_at: '', document_type: 'EVIDENCE', category: 'MATTER_EVIDENCE', subtype: 'OTHER', document_identifier: '', document_owner_subject: '', issuing_authority: '', document_date: '', issue_date: '', expiry_date: '', source_copy_type: 'CLIENT_COPY', page_count: 1, return_required: false, expected_return_date: '', visible_damage_or_alteration: false, condition_description: '', confidentiality_level: 'STANDARD', verification_status: 'NOT_VERIFIED', verification_method: '', review_notes: '', purpose: 'CLIENT_INSTRUCTION', description: '', received_via: 'IN_PERSON', physical_storage_location: '', custody_notes: '' });
  const [drawerReference, setDrawerReference] = useState('');
  const [cabinetLocation, setCabinetLocation] = useState('');
  const [requestForm, setRequestForm] = useState({ case_id: caseId, title: '', document_type: 'EVIDENCE', instructions: '', due_date: '' });
  const [verification, setVerification] = useState({ requestId: '', correct_client: false, readable_complete: false, matter_link_confirmed: false, physical_copy_retained: true, physical_storage_location: '', custody_notes: '', notes: '' });
  const [dispatch, setDispatch] = useState({ requestId: '', message: '' });
  const [showAdvancedDetails, setShowAdvancedDetails] = useState(false);
  const queryParams = caseId ? { case_id: caseId } : (selectedClientId ? { client_id: selectedClientId } : {});
  const { data, isLoading, error } = useQuery({ queryKey: ['secretary-documents', caseId, selectedClientId], queryFn: () => secretaryDocumentsService.getDocuments(queryParams) });
  const effectiveClientId = data?.selected_client_id || selectedClientId || form.client_id;
  const selectedClient = (data?.clients || []).find((item) => String(item.id) === String(effectiveClientId));
  const assignedStorageLocation = selectedClient?.kyc_drawer_reference
    ? [
        `KYC DRAWER / ${selectedClient.kyc_drawer_reference}`,
        selectedClient.kyc_cabinet_location,
      ].filter(Boolean).join(' / ')
    : '';
  const registerPhysical = useMutation({
    mutationFn: () => secretaryDocumentsService.registerPhysicalDocument({
      ...form,
      client_id: effectiveClientId,
      document_owner_subject: form.document_owner_subject || selectedClient?.name || '',
      physical_storage_location: form.physical_storage_location || assignedStorageLocation,
    }),
    onSuccess: () => { setForm((current) => ({ ...current, request_id: '', title: '', document_reference: '', received_from: '', description: '', custody_notes: '' })); queryClient.invalidateQueries({ queryKey: ['secretary-documents'] }); },
  });
  const assignDrawer = useMutation({
    mutationFn: () => secretaryDocumentsService.assignDrawer({ client_id: effectiveClientId, kyc_drawer_reference: drawerReference, cabinet_location: cabinetLocation }),
    onSuccess: () => { setDrawerReference(''); setCabinetLocation(''); queryClient.invalidateQueries({ queryKey: ['secretary-documents'] }); },
  });
  const proposeReference = useMutation({
    mutationFn: () => secretaryDocumentsService.proposeReference(effectiveClientId),
    onSuccess: (result) => setForm((current) => ({ ...current, document_reference: result.document_reference })),
  });
  const createRequest = useMutation({
    mutationFn: secretaryDocumentsService.createRequest,
    onSuccess: () => { setRequestForm((current) => ({ ...current, title: '', instructions: '', due_date: '' })); queryClient.invalidateQueries({ queryKey: ['secretary-documents'] }); },
  });
  const verify = useMutation({
    mutationFn: ({ requestId, payload }) => secretaryDocumentsService.verifyClientUpload(requestId, payload),
    onSuccess: () => { setVerification({ requestId: '', correct_client: false, readable_complete: false, matter_link_confirmed: false, physical_copy_retained: true, physical_storage_location: '', custody_notes: '', notes: '' }); queryClient.invalidateQueries({ queryKey: ['secretary-documents'] }); },
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
    {!compact && <FormSection
      title='Client File'
      description='Select the client whose permanent KYC register, document receipts, and physical custody records you are managing.'
    >
      <Select3D
        label='Client'
        name='selected_client_id'
        value={selectedClientId}
        onChange={(event) => { const client_id = event.target.value; setSelectedClientId(client_id); setForm((current) => ({ ...current, client_id, case_id: '', request_id: '' })); }}
        options={clients.map((item) => ({ value: item.id, label: item.name }))}
        placeholder='Select a client'
        wrapperClassName='mb-0'
      />
    </FormSection>}
    {!caseId && !selectedClientId && <Card className='p-5'><p>Select a client to view requests, receive documents, or inspect that client&apos;s document file.</p></Card>}
    {(caseId || selectedClientId) && <>
    <FormSection
      title='Physical KYC Drawer Assignment'
      description='Assign the permanent file reference and exact cabinet location before receiving documents into the client register.'
    >
      {selectedClient?.kyc_drawer_reference ? (
        <div className='rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100'>
          <p><strong>Permanent drawer:</strong> {selectedClient.kyc_drawer_reference}</p>
          <p className='mt-1'><strong>Cabinet location:</strong> {selectedClient.kyc_cabinet_location || 'Not recorded'}</p>
          <p className='mt-2 text-xs'>This client already has one permanent KYC drawer. The initial-assignment controls are locked to prevent accidental reassignment.</p>
        </div>
      ) : (
        <>
          <div className='grid gap-4 md:grid-cols-2'>
            <FloatingInput label='KYC Drawer Reference' name='kyc_drawer_reference' value={drawerReference} onChange={(event) => setDrawerReference(event.target.value.toUpperCase())} placeholder='KYC-2026-039' format='none' required />
            <FloatingInput label='Cabinet Location' name='cabinet_location' value={cabinetLocation} onChange={(event) => setCabinetLocation(event.target.value)} placeholder='Cabinet A / Drawer 3' required />
          </div>
          {assignDrawer.error && <p className='mt-2 text-error'>{errorMessage(assignDrawer.error, 'Could not assign the drawer.')}</p>}
          <Button3D disabled={!effectiveClientId || !drawerReference || assignDrawer.isPending} onClick={() => assignDrawer.mutate()}>{assignDrawer.isPending ? 'Assigning…' : 'Assign Drawer'}</Button3D>
        </>
      )}
    </FormSection>
    <FormSection
      title='Register a Physical Document'
      description='Record the received physical document against the permanent KYC drawer. No digital file is uploaded or substituted for the official physical record.'
    >
      <div className='grid gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-100 md:grid-cols-2'>
        <p><strong>Destination drawer:</strong><br />{selectedClient?.kyc_drawer_reference || 'Assign a drawer first'}</p>
        <p><strong>Physical location:</strong><br />{form.physical_storage_location || assignedStorageLocation || 'Not recorded'}</p>
      </div>
      <div>
        <p className='font-semibold text-[color:var(--text-primary)]'>What document did you receive?</p>
        <p className='mt-1 text-sm text-[color:var(--text-secondary)]'>Choose the closest document type. The system will fill its legal classification for you.</p>
        <div className='mt-3 flex flex-wrap gap-2'>
          {DOCUMENT_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type='button'
              onClick={() => setForm((current) => ({ ...current, ...preset }))}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${form.subtype === preset.subtype ? 'border-brand-primary bg-brand-primary text-white' : 'border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--text-primary)] hover:border-brand-primary'}`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-5 md:grid-cols-2 [&_input:not([type='checkbox'])]:!rounded-none [&_input:not([type='checkbox'])]:!border-0 [&_input:not([type='checkbox'])]:!border-b [&_input:not([type='checkbox'])]:!bg-transparent [&_select]:!rounded-none [&_select]:!border-0 [&_select]:!border-b [&_select]:!bg-transparent [&_textarea]:!rounded-none [&_textarea]:!border-0 [&_textarea]:!border-b [&_textarea]:!bg-transparent">
        {!caseId && <Select3D label='Matter Reference' name='case_id' value={form.case_id} onChange={(e) => setForm({ ...form, case_id: e.target.value, request_id: '' })} options={cases.map((item) => ({ value: item.id, label: `${item.case_number} — ${item.title}` }))} placeholder='No matter reference (client file only)' wrapperClassName='mb-0' />}
        <Select3D label='Document Request' name='request_id' value={form.request_id} onChange={(e) => { const request = requests.find((item) => item.id === e.target.value); setForm({ ...form, request_id: e.target.value, case_id: request?.case_id || form.case_id, title: request?.title || form.title, document_type: request?.document_type || form.document_type }); }} options={outstanding.map((item) => ({ value: item.id, label: `${item.case_number} — ${item.title}` }))} placeholder='General client document (not requested)' wrapperClassName='mb-0' />
        <FloatingInput label='Document Title' name='title' value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        <div className='flex items-end gap-3'>
          <FloatingInput className='mb-0 flex-1' label='KYC Document Reference' name='document_reference' value={form.document_reference} onChange={(e) => setForm({ ...form, document_reference: e.target.value.toUpperCase() })} placeholder={`${selectedClient?.kyc_drawer_reference || 'KYC-YYYY-NNN'}/D1`} format='none' required />
          <Button3D type='button' size='sm' className='mb-8 whitespace-nowrap' disabled={!selectedClient?.kyc_drawer_reference || Boolean(form.document_reference) || proposeReference.isPending} onClick={() => proposeReference.mutate()}>{proposeReference.isPending ? 'Generating…' : 'Generate Next'}</Button3D>
        </div>
        <FloatingInput label='Received From' name='received_from' value={form.received_from} onChange={(e) => setForm({ ...form, received_from: e.target.value })} required />
        <FloatingInput label='Exact Date and Time Received' name='received_at' type='datetime-local' value={form.received_at} onChange={(e) => setForm({ ...form, received_at: e.target.value })} noFloat />
        <label className='text-sm font-semibold'>Document Type<select aria-label='Document type' className='mt-1 w-full rounded-xl border p-3 font-normal dark:bg-background-dark' value={form.document_type} onChange={(e) => setForm({ ...form, document_type: e.target.value })}><option value='REGISTRATION'>Registration document</option><option value='IDENTIFICATION'>Identification</option><option value='TAX'>Tax document</option><option value='CONTRACT'>Contract / agreement</option><option value='FINANCIAL'>Financial record</option><option value='LEGAL'>Legal correspondence</option><option value='EVIDENCE'>Evidence</option><option value='COURT_ORDER'>Court order</option><option value='OTHER'>Other</option></select></label>
        <label className='text-sm font-semibold'>Document Category<select className='mt-1 w-full border-b p-3 font-normal dark:bg-background-dark' value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option value='KYC_IDENTITY'>KYC / identity</option><option value='KYC_TAX'>KYC / tax identification</option><option value='ENTITY_RECORD'>Entity / authority record</option><option value='PROPERTY'>Property / land</option><option value='TRANSACTION'>Transaction / commercial</option><option value='MATTER_EVIDENCE'>Matter evidence</option><option value='CORRESPONDENCE'>Correspondence</option><option value='OTHER'>Other</option></select></label>
        <label className='text-sm font-semibold'>Exact Document Kind<select aria-label='Document subtype' className='mt-1 w-full border-b p-3 font-normal dark:bg-background-dark' value={form.subtype} onChange={(e) => setForm({ ...form, subtype: e.target.value })}><option value='NATIONAL_ID'>National ID</option><option value='PASSPORT'>Passport</option><option value='ALIEN_ID'>Alien ID / foreign national certificate</option><option value='KRA_PIN'>KRA PIN Certificate</option><option value='PROOF_OF_ADDRESS'>Proof of address</option><option value='INCORPORATION'>Certificate of incorporation / registration</option><option value='CR12'>CR12 / company search</option><option value='BUSINESS_REGISTRATION'>Partnership / business registration</option><option value='TRUST_DEED'>Trust deed</option><option value='AUTHORITY_TO_INSTRUCT'>Authority / resolution to instruct advocates</option><option value='TITLE_DEED'>Title deed</option><option value='OFFICIAL_SEARCH'>Official search</option><option value='SALE_AGREEMENT'>Sale agreement</option><option value='CONTRACT'>Contract / agreement</option><option value='INVOICE'>Invoice</option><option value='RECEIPT'>Receipt</option><option value='DELIVERY_NOTE'>Delivery note</option><option value='CORRESPONDENCE'>Correspondence</option><option value='MEDICAL_RECORD'>Medical record / report</option><option value='POLICE_ABSTRACT'>Police abstract</option><option value='OTHER'>Other</option></select></label>
        <input className='border-b p-3 dark:bg-background-dark' placeholder='Document identifier — ID, KRA PIN, title or invoice number' value={form.document_identifier} onChange={(e) => setForm({ ...form, document_identifier: e.target.value })}/>
        <input className='border-b p-3 dark:bg-background-dark' placeholder='Document owner / subject' value={form.document_owner_subject} onChange={(e) => setForm({ ...form, document_owner_subject: e.target.value })}/>
        <input className='border-b p-3 dark:bg-background-dark' placeholder='Issuing authority' value={form.issuing_authority} onChange={(e) => setForm({ ...form, issuing_authority: e.target.value })}/>
        {showAdvancedDetails && <>
        <label className='text-sm font-semibold'>Date appearing on document<input className='mt-1 w-full border-b p-3 font-normal dark:bg-background-dark' type='date' value={form.document_date} onChange={(e) => setForm({ ...form, document_date: e.target.value })}/></label>
        <label className='text-sm font-semibold'>Issue date<input className='mt-1 w-full border-b p-3 font-normal dark:bg-background-dark' type='date' value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })}/></label>
        <label className='text-sm font-semibold'>Expiry date<input className='mt-1 w-full border-b p-3 font-normal dark:bg-background-dark' type='date' value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}/></label>
        </>}
        <select className='border-b p-3 dark:bg-background-dark' value={form.source_copy_type} onChange={(e) => setForm({ ...form, source_copy_type: e.target.value })}><option value='ORIGINAL_INSPECTED'>Original held / inspected</option><option value='CERTIFIED_COPY'>Certified copy</option><option value='CLIENT_COPY'>Ordinary copy</option><option value='OFFICIAL_ELECTRONIC'>Official electronic record</option></select>
        {showAdvancedDetails && <>
        <input className='border-b p-3 dark:bg-background-dark' type='number' min='1' placeholder='Pages' value={form.page_count} onChange={(e) => setForm({ ...form, page_count: e.target.value })}/>
        <label className='flex items-center gap-2'><input type='checkbox' checked={form.return_required} onChange={(e) => setForm({ ...form, return_required: e.target.checked })}/> Return required</label>
        {form.return_required && <input className='border-b p-3 dark:bg-background-dark' type='date' value={form.expected_return_date} onChange={(e) => setForm({ ...form, expected_return_date: e.target.value })}/>}
        <label className='flex items-center gap-2'><input type='checkbox' checked={form.visible_damage_or_alteration} onChange={(e) => setForm({ ...form, visible_damage_or_alteration: e.target.checked })}/> Visible damage or alteration</label>
        <input className='border-b p-3 dark:bg-background-dark' placeholder='Condition / damage description' value={form.condition_description} onChange={(e) => setForm({ ...form, condition_description: e.target.value })}/>
        <select className='border-b p-3 dark:bg-background-dark' value={form.confidentiality_level} onChange={(e) => setForm({ ...form, confidentiality_level: e.target.value })}><option value='STANDARD'>Standard confidential</option><option value='RESTRICTED'>Restricted</option><option value='HIGHLY_RESTRICTED'>Highly restricted</option></select>
        <select className='border-b p-3 dark:bg-background-dark' value={form.verification_status} onChange={(e) => setForm({ ...form, verification_status: e.target.value })}><option value='NOT_VERIFIED'>Not verified</option><option value='VERIFIED'>Verified</option><option value='FAILED'>Verification failed</option><option value='EXPIRED'>Expired</option></select>
        <input className='border-b p-3 dark:bg-background-dark' placeholder='Verification method' value={form.verification_method} onChange={(e) => setForm({ ...form, verification_method: e.target.value })}/>
        <textarea className='border-b p-3 dark:bg-background-dark' placeholder='Review notes' value={form.review_notes} onChange={(e) => setForm({ ...form, review_notes: e.target.value })}/>
        <select className='rounded-xl border p-3 dark:bg-background-dark' value={form.received_via} onChange={(e) => setForm({ ...form, received_via: e.target.value })}><option value='IN_PERSON'>Received in person</option><option value='EMAIL'>Received by email</option><option value='WHATSAPP'>Received by WhatsApp</option><option value='COURIER'>Received by courier</option><option value='OTHER'>Other channel</option></select>
        <input className='rounded-xl border p-3 dark:bg-background-dark' placeholder='Receipt/file note (optional)' value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}/>
        <label className='flex items-center gap-2 text-sm font-semibold'><input type='checkbox' checked readOnly/> Physical document is the official record</label>
        <FloatingInput label='Physical Storage Location' name='physical_storage_location' value={form.physical_storage_location || assignedStorageLocation} onChange={(e) => setForm({ ...form, physical_storage_location: e.target.value })} required />
        <input className='rounded-xl border p-3 dark:bg-background-dark' placeholder='Custody notes (optional)' value={form.custody_notes} onChange={(e) => setForm({ ...form, custody_notes: e.target.value })}/>
        </>}
      </div>
      <button type='button' className='text-sm font-semibold text-brand-primary' onClick={() => setShowAdvancedDetails((current) => !current)}>{showAdvancedDetails ? 'Hide Optional Details' : 'Show Optional Details'}</button>
      {registerPhysical.error && <p className='mt-3 text-error'>{errorMessage(registerPhysical.error, 'Physical document registration failed.')}</p>}
      {registerPhysical.isSuccess && <div className='mt-3 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100'><p className='font-semibold'>Document received and entered in the client file.</p><p>Acknowledgement receipt: <strong>{registerPhysical.data?.receipt_number}</strong></p></div>}
      <Button3D disabled={!form.title || !form.document_reference || !form.received_from || !effectiveClientId || !selectedClient?.kyc_drawer_reference || registerPhysical.isPending} onClick={() => registerPhysical.mutate()}>{registerPhysical.isPending ? 'Recording Receipt…' : 'Receive Document and Issue Receipt'}</Button3D>
    </FormSection>
    <FormSection
      title='Request a Client Document'
      description='Prepare a clear document request for secretary-controlled dispatch. Requests from advocates also appear in this workspace.'
    >
      <div className="grid gap-5 md:grid-cols-2 [&_input]:!rounded-none [&_input]:!border-0 [&_input]:!border-b [&_input]:!bg-transparent [&_select]:!rounded-none [&_select]:!border-0 [&_select]:!border-b [&_select]:!bg-transparent [&_textarea]:!rounded-none [&_textarea]:!border-0 [&_textarea]:!border-b [&_textarea]:!bg-transparent">
        {!caseId && <select className='rounded-xl border p-3 dark:bg-background-dark' value={requestForm.case_id} onChange={(e) => setRequestForm({ ...requestForm, case_id: e.target.value })}><option value=''>Select matter</option>{cases.map((item) => <option key={item.id} value={item.id}>{item.case_number} — {item.title}</option>)}</select>}
        <input className='rounded-xl border p-3 dark:bg-background-dark' placeholder='Required document' value={requestForm.title} onChange={(e) => setRequestForm({ ...requestForm, title: e.target.value })}/>
        <select className='rounded-xl border p-3 dark:bg-background-dark' value={requestForm.document_type} onChange={(e) => setRequestForm({ ...requestForm, document_type: e.target.value })}><option value='EVIDENCE'>Evidence</option><option value='CONTRACT'>Contract / agreement</option><option value='IDENTIFICATION'>Identification</option><option value='FINANCIAL'>Financial record</option><option value='OTHER'>Other</option></select>
        <input className='rounded-xl border p-3 dark:bg-background-dark' type='date' value={requestForm.due_date} onChange={(e) => setRequestForm({ ...requestForm, due_date: e.target.value })}/>
        <textarea className='rounded-xl border p-3 dark:bg-background-dark md:col-span-2' placeholder='Clear instructions to the client' value={requestForm.instructions} onChange={(e) => setRequestForm({ ...requestForm, instructions: e.target.value })}/>
      </div>
      {createRequest.error && <p className='mt-3 text-error'>{errorMessage(createRequest.error, 'Could not create request.')}</p>}
      <Button3D disabled={!requestForm.case_id || !requestForm.title || createRequest.isPending} onClick={() => createRequest.mutate(requestForm)}>Prepare Request for Dispatch</Button3D>
    </FormSection>
    {data?.selection_error && <p className='rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800'>{data.selection_error}</p>}
    <Card className='p-5'><h3 className='font-semibold'>Required documents and receipt verification</h3><div className='mt-3 space-y-2'>{requests.map((item) => <div key={item.id} className='rounded-xl border p-3'><strong>{item.title}</strong><p className='text-sm'>{item.client_name} · {item.case_number} · {item.status.replaceAll('_', ' ')}</p><p className='text-sm text-text-muted-light dark:text-text-muted-dark'>{item.instructions}</p>{item.status === 'AWAITING_SECRETARY_DISPATCH' && <button className='mt-2 rounded-lg bg-brand-primary px-3 py-1 text-white' onClick={() => setDispatch({ requestId: item.id, message: '' })}>Review and dispatch to client</button>}{dispatch.requestId === item.id && <div className='mt-3 grid gap-2 rounded-xl bg-black/5 p-3 dark:bg-white/5'><textarea className='rounded-xl border p-2 dark:bg-background-dark' placeholder='Optional covering message from the firm' value={dispatch.message} onChange={(e) => setDispatch({ ...dispatch, message: e.target.value })}/><p className='text-xs text-text-muted-light dark:text-text-muted-dark'>Dispatching adds the request to the client portal and records it in the matter communication thread.</p>{dispatchRequest.error && <p className='text-error'>{errorMessage(dispatchRequest.error, 'Could not dispatch request.')}</p>}<button className='rounded-lg bg-success px-3 py-2 text-white disabled:opacity-50' disabled={dispatchRequest.isPending} onClick={() => dispatchRequest.mutate({ requestId: item.id, payload: { message: dispatch.message } })}>Send to client as the firm</button></div>}{item.status === 'PENDING_SECRETARY' && <button className='mt-2 rounded-lg bg-brand-primary px-3 py-1 text-white' onClick={() => setVerification((current) => ({ ...current, requestId: item.id }))}>Verify client upload</button>}{verification.requestId === item.id && <div className='mt-3 grid gap-2 rounded-xl bg-black/5 p-3 dark:bg-white/5'><label><input type='checkbox' checked={verification.correct_client} onChange={(e) => setVerification({ ...verification, correct_client: e.target.checked })}/> Correct client confirmed</label><label><input type='checkbox' checked={verification.readable_complete} onChange={(e) => setVerification({ ...verification, readable_complete: e.target.checked })}/> Scan is readable and administratively complete</label><label><input type='checkbox' checked={verification.matter_link_confirmed} onChange={(e) => setVerification({ ...verification, matter_link_confirmed: e.target.checked })}/> Matter reference confirmed</label><label><input type='checkbox' checked={verification.physical_copy_retained} onChange={(e) => setVerification({ ...verification, physical_copy_retained: e.target.checked })}/> Physical original/copy retained</label>{verification.physical_copy_retained && <input className='rounded-xl border p-2 dark:bg-background-dark' placeholder='KYC drawer / physical file location' value={verification.physical_storage_location} onChange={(e) => setVerification({ ...verification, physical_storage_location: e.target.value })}/>}<input className='rounded-xl border p-2 dark:bg-background-dark' placeholder='Custody notes' value={verification.custody_notes} onChange={(e) => setVerification({ ...verification, custody_notes: e.target.value })}/><textarea className='rounded-xl border p-2 dark:bg-background-dark' placeholder='Verification note for advocate' value={verification.notes} onChange={(e) => setVerification({ ...verification, notes: e.target.value })}/>{verify.error && <p className='text-error'>{errorMessage(verify.error, 'Verification failed.')}</p>}<button className='rounded-lg bg-success px-3 py-2 text-white disabled:opacity-50' disabled={!verification.correct_client || !verification.readable_complete || !verification.matter_link_confirmed || (verification.physical_copy_retained && !verification.physical_storage_location) || verify.isPending} onClick={() => verify.mutate({ requestId: item.id, payload: verification })}>Confirm receipt for advocate review</button></div>}</div>)}{!requests.length && <p>No document requests for this client.</p>}</div></Card>
    <Card className='p-5'><h3 className='font-semibold'>Recently received</h3>{isLoading && <p>Loading…</p>}{error && <p className='text-error'>Failed to load documents.</p>}<div className='mt-3 space-y-2'>{documents.map((item) => <button type='button' onClick={() => downloadDocument(item)} key={item.id} className='flex w-full gap-3 rounded-xl border p-3 text-left'><FileText/><span><strong>{item.title}</strong><small className='block'>{item.reference} · {item.client_name}</small></span></button>)}</div></Card>
    </>}
  </div>;
}
