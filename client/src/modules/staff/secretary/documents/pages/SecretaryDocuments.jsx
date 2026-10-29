import { withCriticalAction } from '@/core/utils/confirmationContext';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import Card from '@/components/ui/Card';
import { FormButton as Button3D } from '@/components/forms';
import FloatingInput from '@/components/ui/FloatingInput';
import FormSection from '@/components/ui/FormSection';
import SectionHeading from '@/components/ui/SectionHeading';
import Select3D from '@/components/ui/Select3D';
import TableHeaderText from '@/components/ui/TableHeaderText';
import Swal, { toneColor } from '@/core/utils/themedSwal';
import secretaryDocumentsService from '../services/secretaryDocumentsService';
import { formatDateTime } from '@/core/utils/dateFormatter';
import PrintReceiptButton from '@/modules/clients/shared/DocumentReceiptPrint';
import DeliveriesExpected from '../components/DeliveriesExpected';

const TYPES = [
  ['NATIONAL_ID', 'National ID', 'IDENTIFICATION', 'KYC_IDENTITY'],
  ['PASSPORT', 'Passport', 'IDENTIFICATION', 'KYC_IDENTITY'],
  ['KRA_PIN', 'KRA PIN Certificate', 'TAX', 'KYC_TAX'],
  ['INCORPORATION', 'Certificate of Incorporation', 'REGISTRATION', 'ENTITY_RECORD'],
  ['CR12', 'CR12', 'REGISTRATION', 'ENTITY_RECORD'],
  ['AUTHORITY_TO_INSTRUCT', 'Authority/Resolution to Instruct', 'LEGAL', 'ENTITY_RECORD'],
  ['PROOF_OF_ADDRESS', 'Proof of Address', 'IDENTIFICATION', 'KYC_IDENTITY'],
  ['BUSINESS_REGISTRATION', 'Business/Partnership Registration', 'REGISTRATION', 'ENTITY_RECORD'],
  ['TRUST_DEED', 'Trust Registration/Deed', 'REGISTRATION', 'ENTITY_RECORD'],
  ['ENGAGEMENT_LETTER', 'Engagement letter / retainer agreement', 'LEGAL', 'OTHER'],
  ['OTHER', 'Other', 'OTHER', 'OTHER'],
];

const blankForm = { document_reference: '', subtype: 'NATIONAL_ID', document_type: 'IDENTIFICATION', category: 'KYC_IDENTITY', title: 'National ID', document_identifier: '', document_owner_contact: '', received_from_contact: '', source_copy_type: 'COPY', page_count: 1, document_date: '', physical_storage_location: '', condition_description: '', return_required: false, expected_return_date: '', verification_status: 'NOT_VERIFIED', verification_method: '', custody_notes: '' };

const message = (error) => {
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (detail && typeof detail === 'object') return String(Object.values(detail).flat()[0]);
  return 'The record could not be saved.';
};

export default function SecretaryDocuments({ caseId = '', clientId: fileClientId = '', compact = false }) {
  const queryClient = useQueryClient();
  const [clientId, setClientId] = useState(fileClientId);
  const [drawerReference, setDrawerReference] = useState('');
  const [cabinetLocation, setCabinetLocation] = useState('');
  const [kycPlaceId, setKycPlaceId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [receipt, setReceipt] = useState({ document_ids: [], received_from_contact: '' });
  const [issuedReceipt, setIssuedReceipt] = useState(null);
  const [matterFileDraft, setMatterFileDraft] = useState({ case_id: '', storage_location_id: '', storage_zone: 'Active Matters', cabinet: '', shelf_or_drawer: '', location_detail: '', notes: '' });
  const params = caseId ? { case_id: caseId } : (clientId ? { client_id: clientId } : {});
  const { data, isLoading, isError } = useQuery({ queryKey: ['secretary-documents', caseId, clientId], queryFn: () => secretaryDocumentsService.getDocuments(params), retry: !fileClientId });
  const selectedId = data?.selected_client_id || clientId;
  const clients = data?.clients || [];
  const client = clients.find((item) => String(item.id) === String(selectedId));
  const receivedFromOptions = client?.received_from_options || [];
  const isEntityClient = client?.client_type && client.client_type !== 'INDIVIDUAL';
  const isPersonalIdentityDocument = ['NATIONAL_ID', 'PASSPORT', 'ALIEN_ID'].includes(form.subtype);
  const effectiveDocumentOwnerContact = form.document_owner_contact || receivedFromOptions[0]?.value || '';
  const documents = useMemo(() => data?.documents || [], [data?.documents]);
  const receipts = data?.receipts || [];
  const kycDocuments = documents.filter((item) => item.classification === 'CLIENT_KYC');
  const matterEvidence = documents.filter((item) => item.classification === 'MATTER_SPECIFIC');
  const selectedMatterFile = data?.physical_file;
  const physicalFileQueue = data?.physical_file_queue || [];
  const unreceiptedDocuments = useMemo(
    () => documents.filter((item) => !item.receipt_number),
    [documents],
  );
  const receiptSelectionKey = `${selectedId}:${unreceiptedDocuments.map((item) => item.id).sort().join(',')}`;
  const initializedReceiptSelection = useRef('');

  useEffect(() => {
    if (initializedReceiptSelection.current === receiptSelectionKey) return;
    initializedReceiptSelection.current = receiptSelectionKey;
    setReceipt((current) => ({
      ...current,
      document_ids: unreceiptedDocuments.map((item) => item.id),
    }));
  }, [receiptSelectionKey, unreceiptedDocuments]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['secretary-documents'] });
    // The client's file (and the engagement letter choices on its proposed matters) reads the same register.
    if (fileClientId) ['admin-client', 'admin-client-document-workspace'].forEach((key) => queryClient.invalidateQueries({ queryKey: [key, fileClientId] }));
  };
  // A blank number takes the next KYC number; the drawer comes from the firm's records-room layout.
  const assign = useMutation({ mutationFn: () => secretaryDocumentsService.assignDrawer({ client_id: selectedId, kyc_drawer_reference: drawerReference, location_id: kycPlaceId || null, cabinet_location: cabinetLocation }), onSuccess: refresh });
  const kycPlaces = data?.kyc_places || [];
  const matterPlaces = data?.matter_places || [];
  const deliveries = (data?.deliveries_expected || []).filter((item) => (!caseId || String(item.case_id) === String(caseId)) && (!fileClientId || String(item.client_id) === String(fileClientId)));
  const assignMatterFile = useMutation({
    mutationFn: () => secretaryDocumentsService.assignMatterFile(matterFileDraft.case_id, matterFileDraft),
    onSuccess: () => { setMatterFileDraft({ case_id: '', storage_location_id: '', storage_zone: 'Active Matters', cabinet: '', shelf_or_drawer: '', location_detail: '', notes: '' }); refresh(); },
  });
  const propose = useMutation({ mutationFn: () => secretaryDocumentsService.proposeReference(selectedId), onSuccess: ({ document_reference }) => setForm((v) => ({ ...v, document_reference })) });
  const register = useMutation({
    mutationFn: () => secretaryDocumentsService.registerPhysicalDocument({ ...form, document_owner_contact: effectiveDocumentOwnerContact, received_from_contact: form.received_from_contact || receivedFromOptions[0]?.value, client_id: selectedId, physical_storage_location: form.physical_storage_location || client?.kyc_cabinet_location }),
    onSuccess: () => { setForm(blankForm); setShowForm(false); refresh(); },
  });
  const transferEvidence = useMutation({
    mutationFn: (documentId) => secretaryDocumentsService.transferMatterEvidence(caseId, { document_id: documentId, physical_section: 'EVIDENCE', reason: 'Matter-specific evidence transferred from the client register to its authoritative physical matter file.' }),
    onSuccess: ({ document_reference }) => { Swal.fire({ icon: 'success', title: 'Evidence transferred', text: `${document_reference} was allocated in the physical matter file.` }); refresh(); },
  });
  const createReceipt = useMutation({
    mutationFn: () => secretaryDocumentsService.createReceipt({
      ...receipt,
      client_id: selectedId,
      received_from_contact: receipt.received_from_contact || receivedFromOptions[0]?.value,
    }),
    onSuccess: ({ receipt: issued }) => { setIssuedReceipt(issued); setReceipt({ document_ids: [], received_from_contact: '' }); refresh(); },
  });
  const removeDocument = useMutation({
    mutationFn: ({ documentId, reason, confirmation }) => withCriticalAction({ confirmation }, () => secretaryDocumentsService.removeFromRegister(documentId, reason)),
    onSuccess: refresh,
  });
  const requestRemoval = async (document) => {
    const result = await Swal.fire({
      title: `Remove ${document.reference}?`,
      text: `${document.subtype_label} will leave the active physical register, but its audit history will be preserved.`,
      icon: 'warning',
      input: 'textarea',
      inputLabel: 'Reason for removal',
      inputPlaceholder: 'Explain why this entry is being removed…',
      inputAttributes: { 'aria-label': 'Reason for removing the physical document entry' },
      showCancelButton: true,
      confirmButtonText: 'Remove from active register',
      confirmButtonColor: toneColor('danger'),
      cancelButtonText: 'Keep document',
      reverseButtons: true,
      inputValidator: (value) => (!value?.trim() ? 'A removal reason is required.' : undefined),
    });
    if (result.isConfirmed) {
      removeDocument.mutate(
        { documentId: document.id, reason: result.value.trim(), confirmation: result.confirmation },
        {
          onSuccess: () => Swal.fire({ title: 'Document removed', text: `${document.reference} was removed from the active register.`, icon: 'success' }),
          onError: (error) => { if (error?.isActionCancelled) return; return Swal.fire({ title: 'Could not remove document', text: message(error), icon: 'error' }); },
        },
      );
    }
  };
  const toggleReceiptDocument = (id) => setReceipt((current) => ({ ...current, document_ids: current.document_ids.includes(id) ? current.document_ids.filter((item) => item !== id) : [...current.document_ids, id] }));

  const chooseType = (subtype) => {
    const [, label, document_type, category] = TYPES.find(([value]) => value === subtype);
    setForm((v) => ({ ...v, subtype, document_type, category, title: subtype === 'OTHER' ? '' : label }));
  };

  // Inside a client's file the register shows only to whoever keeps it: records staff, or an advocate practising without them.
  if (fileClientId && isError) return null;

  return <div className={compact ? 'space-y-4' : 'space-y-6 p-4 md:p-6'}>
    {!compact && <SectionHeading title='Physical client records' subtitle='Index exactly what is filed in each client’s physical KYC file.' />}
    <DeliveriesExpected deliveries={deliveries} originalsPlaces={data?.originals_places || []} onDone={refresh} />
    {!compact && <FormSection title='Physical matter files awaiting preparation' description='Prepare, label and place the actual folder before confirming its storage assignment.'>
      <div className='space-y-3'>{physicalFileQueue.map((item) => <div key={item.case_id} className='rounded-xl border border-border-light p-4 dark:border-border-dark'><div className='flex flex-wrap items-start justify-between gap-3'><div><strong>{item.case_number} — {item.title}</strong><p className='mt-1 text-sm text-text-muted-light dark:text-text-muted-dark'>{item.client_name} · Advocate: {item.responsible_advocate} · Priority: {item.priority}</p></div><Button3D size='sm' onClick={() => setMatterFileDraft((current) => ({ ...current, case_id: item.case_id }))}>Prepare and assign file</Button3D></div></div>)}</div>
      {!physicalFileQueue.length && <p className='text-sm text-text-muted-light dark:text-text-muted-dark'>No physical matter files are awaiting preparation.</p>}
      {matterFileDraft.case_id && <div className='mt-4 rounded-xl border border-brand-primary/30 bg-brand-primary/5 p-4'><h3 className='font-semibold'>Assign physical matter file</h3>{matterPlaces.length > 0 && <label className='mt-3 block text-sm font-semibold'>Drawer or shelf<select aria-label='Matter file drawer or shelf' className='form-control mt-1 w-full' value={matterFileDraft.storage_location_id} onChange={(e) => setMatterFileDraft({ ...matterFileDraft, storage_location_id: e.target.value })}><option value=''>Type the location instead</option>{matterPlaces.map((place) => <option key={place.id} value={place.id}>{place.path}</option>)}</select></label>}{!matterFileDraft.storage_location_id && <div className='mt-3 grid gap-4 md:grid-cols-2'><FloatingInput label='Storage zone' value={matterFileDraft.storage_zone} onChange={(e) => setMatterFileDraft({ ...matterFileDraft, storage_zone: e.target.value })} required /><FloatingInput label='Cabinet' value={matterFileDraft.cabinet} onChange={(e) => setMatterFileDraft({ ...matterFileDraft, cabinet: e.target.value })} placeholder='Cabinet B' required /><FloatingInput label='Shelf or drawer' value={matterFileDraft.shelf_or_drawer} onChange={(e) => setMatterFileDraft({ ...matterFileDraft, shelf_or_drawer: e.target.value })} placeholder='Shelf 3' required /><FloatingInput label='Additional location detail' value={matterFileDraft.location_detail} onChange={(e) => setMatterFileDraft({ ...matterFileDraft, location_detail: e.target.value })} /></div>}<p className='mt-2 rounded-lg bg-surface-light p-3 text-sm dark:bg-surface-dark'><strong>Location preview:</strong> {matterFileDraft.storage_location_id ? matterPlaces.find((place) => place.id === matterFileDraft.storage_location_id)?.path : [matterFileDraft.storage_zone, matterFileDraft.cabinet, matterFileDraft.shelf_or_drawer, matterFileDraft.location_detail].filter(Boolean).join(' / ')}</p>{(assignMatterFile.error && !assignMatterFile.error?.isActionCancelled) && <p className='mt-2 text-error'>{message(assignMatterFile.error)}</p>}<div className='mt-3 flex justify-end gap-2'><Button3D variant='secondary' onClick={() => setMatterFileDraft((current) => ({ ...current, case_id: '' }))}>Cancel</Button3D><Button3D disabled={!(matterFileDraft.storage_location_id || (matterFileDraft.storage_zone && matterFileDraft.cabinet && matterFileDraft.shelf_or_drawer)) || assignMatterFile.isPending} onClick={() => assignMatterFile.mutate()}>Confirm physical assignment</Button3D></div></div>}
    </FormSection>}
    {!compact && <FormSection title='1. Select client' description='Choose the client whose physical file you are handling.'>
      <Select3D label='Client' value={clientId} onChange={(e) => { setClientId(e.target.value); setShowForm(false); }} options={clients.map((item) => ({ value: item.id, label: item.name }))} placeholder='Select a client' wrapperClassName='mb-0' />
    </FormSection>}
    {!selectedId && <Card className='p-5'>Select a client to view the physical KYC file.</Card>}
    {selectedId && <>
      <FormSection title='2. Physical KYC file' description='Each client has one KYC folder, numbered and kept in a labelled drawer.'>
        {client?.kyc_drawer_reference ? <div className='grid gap-2 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm dark:border-emerald-800 dark:bg-emerald-950/30 md:grid-cols-3'>
          <p><strong>Client:</strong><br />{client.name}</p><p><strong>KYC file:</strong><br />{client.kyc_drawer_reference}</p><p><strong>Location:</strong><br />{client.kyc_cabinet_location || 'Not recorded'}</p>
        </div> : <div className='grid gap-4 md:grid-cols-2'>
          <FloatingInput label='KYC file number' value={drawerReference} onChange={(e) => setDrawerReference(e.target.value.toUpperCase())} placeholder={data?.next_kyc_reference || 'KYC-2026-001'} />
          {kycPlaces.length ? (
            <label className='text-sm font-semibold'>Drawer or shelf
              <select aria-label='Drawer or shelf' className='form-control mt-1 w-full' value={kycPlaceId} onChange={(e) => setKycPlaceId(e.target.value)} required>
                <option value=''>Choose where the folder goes</option>
                {kycPlaces.map((place) => <option key={place.id} value={place.id}>{place.path}</option>)}
              </select>
            </label>
          ) : (
            <FloatingInput label='Cabinet location' value={cabinetLocation} onChange={(e) => setCabinetLocation(e.target.value)} placeholder='Cabinet A / Drawer 3' required />
          )}
          <p className='text-sm text-[color:var(--text-secondary)] md:col-span-2'>
            Leave the number blank to use the next one, <strong>{data?.next_kyc_reference}</strong>. Write it on the folder before filing.
            {!kycPlaces.length && ' Your firm owner can lay out the records room in Settings so drawers can be picked from a list.'}
          </p>
          {(assign.error && !assign.error?.isActionCancelled) && <p className='text-error md:col-span-2'>{message(assign.error)}</p>}
          <Button3D disabled={!(kycPlaceId || cabinetLocation) || assign.isPending} onClick={() => assign.mutate()}>Open KYC file</Button3D>
        </div>}
      </FormSection>
      <FormSection title='3. Physical KYC File Contents' description='An index of documents actually present in this physical file.'>
        <div className='flex justify-end'><Button3D disabled={!client?.kyc_drawer_reference} onClick={() => setShowForm((v) => !v)}>Add document</Button3D></div>
        {showForm && <div className='mt-4 space-y-4 rounded-xl border p-4'>
          <div className='grid gap-4 md:grid-cols-2'>
            <div className='flex items-end gap-2'><FloatingInput className='mb-0 flex-1' label='Document reference' value={form.document_reference} onChange={(e) => setForm({ ...form, document_reference: e.target.value.toUpperCase() })} placeholder={`${client?.kyc_drawer_reference}/D1`} required /><Button3D size='sm' className='mb-8 whitespace-nowrap' disabled={propose.isPending} onClick={() => propose.mutate()}>Suggest next</Button3D></div>
            <label className='text-sm font-semibold'>Document type<select aria-label='Document type' className='form-control mt-1 w-full' value={form.subtype} onChange={(e) => chooseType(e.target.value)}>{TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <FloatingInput label={form.subtype === 'OTHER' ? 'Descriptive document title' : 'Document title'} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required={form.subtype === 'OTHER'} />
            {isEntityClient && isPersonalIdentityDocument && <label className='text-sm font-semibold'>Identity document belongs to<select aria-label='Identity document belongs to' className='form-control mt-1 w-full' value={effectiveDocumentOwnerContact} onChange={(e) => setForm({ ...form, document_owner_contact: e.target.value })} required><option value=''>Select authorised representative</option>{receivedFromOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>}
            <FloatingInput label='Document identifier (where applicable)' value={form.document_identifier} onChange={(e) => setForm({ ...form, document_identifier: e.target.value })} />
            <label className='text-sm font-semibold'>Original or copy<select aria-label='Copy type' className='form-control mt-1 w-full' value={form.source_copy_type} onChange={(e) => setForm({ ...form, source_copy_type: e.target.value })}><option value='ORIGINAL'>Original</option><option value='COPY'>Copy</option><option value='CERTIFIED_COPY'>Certified copy</option></select></label>
            <FloatingInput label='Number of pages' type='number' min='1' value={form.page_count} onChange={(e) => setForm({ ...form, page_count: e.target.value })} />
            <FloatingInput label='Date on document' type='date' value={form.document_date} onChange={(e) => setForm({ ...form, document_date: e.target.value })} noFloat />
            <label className='text-sm font-semibold'>Received from<select aria-label='Received from' className='form-control mt-1 w-full' value={form.received_from_contact || receivedFromOptions[0]?.value || ''} onChange={(e) => setForm({ ...form, received_from_contact: e.target.value })} disabled={!receivedFromOptions.length}><option value=''>{receivedFromOptions.length ? 'Select authorised contact' : 'No verified authorised contact recorded'}</option>{receivedFromOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <div className='rounded-xl border p-3 text-sm'><strong>Date and time received</strong><p className='mt-1 text-[color:var(--text-secondary)]'>Recorded automatically when you save this entry.</p></div>
            <FloatingInput label='Physical location' value={form.physical_storage_location || client?.kyc_cabinet_location || ''} onChange={(e) => setForm({ ...form, physical_storage_location: e.target.value })} required />
            <FloatingInput label='Short condition / remarks' value={form.condition_description} onChange={(e) => setForm({ ...form, condition_description: e.target.value })} />
            <label className='flex items-center gap-2'><input type='checkbox' checked={form.return_required} onChange={(e) => setForm({ ...form, return_required: e.target.checked })} /> Return required</label>
            {form.return_required && <FloatingInput label='Expected return date' type='date' value={form.expected_return_date} onChange={(e) => setForm({ ...form, expected_return_date: e.target.value })} noFloat />}
          </div>
          <button type='button' className='text-sm font-semibold text-brand-primary' onClick={() => setAdvanced((v) => !v)}>{advanced ? 'Hide' : 'Show'} advanced custody / verification</button>
          {advanced && <div className='grid gap-4 md:grid-cols-2'><label className='text-sm font-semibold'>Verification status<select className='form-control mt-1 w-full' value={form.verification_status} onChange={(e) => setForm({ ...form, verification_status: e.target.value })}><option value='NOT_VERIFIED'>Not verified</option><option value='VERIFIED'>Verified</option><option value='FAILED'>Verification failed</option></select></label><FloatingInput label='Verification method' value={form.verification_method} onChange={(e) => setForm({ ...form, verification_method: e.target.value })} /><FloatingInput label='Custody notes' value={form.custody_notes} onChange={(e) => setForm({ ...form, custody_notes: e.target.value })} /></div>}
          {(register.error && !register.error?.isActionCancelled) && <p className='text-error'>{message(register.error)}</p>}
          {!receivedFromOptions.length && <p className='text-sm text-error'>Record an authorised representative with instruction authority for this organisation before receiving documents.</p>}
          <div className='pt-2'><Button3D disabled={!form.document_reference || !form.title || !receivedFromOptions.length || (isEntityClient && isPersonalIdentityDocument && !effectiveDocumentOwnerContact) || register.isPending} onClick={() => register.mutate()}>Record physical document</Button3D></div>
        </div>}
        <div className='mt-5 overflow-x-auto'><table className='w-full text-left text-sm'><thead><tr className='border-b'>{['Reference', 'KYC document', 'Identifier', 'Copy type', 'Pages', 'Physical location', 'Action'].map((label) => <th key={label} className='p-2'><TableHeaderText>{label}</TableHeaderText></th>)}</tr></thead><tbody>{kycDocuments.map((item) => <tr key={item.id} className='border-b'><td className='p-2 font-semibold'>{item.reference}</td><td className='p-2'>{item.subtype_label}</td><td className='p-2'>{item.document_identifier || '—'}</td><td className='p-2'>{item.source_copy_type_label || item.source_copy_type}</td><td className='p-2'>{item.page_count}</td><td className='p-2'>{item.physical_storage_location}</td><td className='p-2'><button type='button' className='font-semibold text-error disabled:opacity-50' disabled={removeDocument.isPending} onClick={() => requestRemoval(item)}>Remove</button></td></tr>)}</tbody></table>{isLoading && <p className='p-3'>Loading file contents…</p>}{!isLoading && !kycDocuments.length && <p className='p-3'>No KYC identity or authority documents recorded.</p>}</div>
      </FormSection>
      {matterEvidence.length > 0 && <FormSection title='Matter evidence awaiting correct filing' description='These records are not KYC. Transfer them through the audited custody workflow after the physical matter file is assigned.'><div className='space-y-2'>{matterEvidence.map((item) => <div key={item.id} className='flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/30'><span><strong>{item.reference} — {item.subtype_label}</strong><br />Current custody: {item.physical_storage_location}</span>{caseId && <Button3D size='sm' disabled={!selectedMatterFile || selectedMatterFile.assignment_pending || transferEvidence.isPending} onClick={() => transferEvidence.mutate(item.id)}>Transfer to {selectedMatterFile?.reference || 'matter file'}</Button3D>}</div>)}</div>{(transferEvidence.error && !transferEvidence.error?.isActionCancelled) && <p className='mt-3 text-error'>{message(transferEvidence.error)}</p>}</FormSection>}
      <FormSection title='4. Issue receipt for a delivery' description='Issue one receipt covering all documents delivered together by the same person at the recorded date and time.'>
        <p className='mb-3 text-sm text-[color:var(--text-secondary)]'>All unreceipted documents are included initially. Untick a document only when it should not appear on this receipt.</p>
        <div className='space-y-2'>{unreceiptedDocuments.map((item) => <label key={item.id} className='flex items-center gap-3 rounded-lg border p-3'><input type='checkbox' checked={receipt.document_ids.includes(item.id)} onChange={() => toggleReceiptDocument(item.id)} /><span><strong>{item.reference} — {item.subtype_label}</strong>{item.document_identifier ? ` — ${item.document_identifier}` : ''}</span></label>)}</div>
        {!unreceiptedDocuments.length && <p className='text-sm'>No unreceipted documents are available for this client.</p>}
        <div className='mt-4 grid gap-4 md:grid-cols-2'>
          <label className='text-sm font-semibold'>Received from<select className='form-control mt-1 w-full' value={receipt.received_from_contact || receivedFromOptions[0]?.value || ''} onChange={(e) => setReceipt({ ...receipt, received_from_contact: e.target.value })} disabled={!receivedFromOptions.length}><option value=''>Select authorised contact</option>{receivedFromOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <div className='rounded-xl border p-3 text-sm'><strong>Date and time received</strong><p className='mt-1 text-[color:var(--text-secondary)]'>Taken automatically from the selected documents’ recorded intake timestamp.</p></div>
        </div>
        {(createReceipt.error && !createReceipt.error?.isActionCancelled) && <p className='text-error'>{message(createReceipt.error)}</p>}
        {issuedReceipt && <div className='flex flex-wrap items-center justify-between gap-3 rounded-lg bg-emerald-50 p-3 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200'><span>Receipt issued: <strong>{issuedReceipt.receipt_number}</strong>. Print it, sign it with whoever delivered the papers, and hand it over.</span><PrintReceiptButton receipt={issuedReceipt} /></div>}
        <Button3D disabled={!receipt.document_ids.length || !receivedFromOptions.length || createReceipt.isPending} onClick={() => createReceipt.mutate()}>Issue one receipt for selected documents</Button3D>
        {receipts.length > 0 && <div className='mt-5 space-y-2'><p className='text-sm font-semibold'>Receipts issued</p>{receipts.map((item) => <div key={item.id} className='flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-light p-3 text-sm dark:border-border-dark'><span><strong>{item.receipt_number}</strong> · {formatDateTime(item.received_at)} · from {item.received_from} · {item.documents.length} document{item.documents.length === 1 ? '' : 's'}</span><PrintReceiptButton receipt={item} /></div>)}</div>}
      </FormSection>
    </>}
  </div>;
}
