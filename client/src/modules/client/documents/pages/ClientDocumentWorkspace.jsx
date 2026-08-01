import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, UploadCloud } from 'lucide-react';

import Card from '@/components/ui/Card';
import SectionHeading from '@/components/ui/SectionHeading';
import documentsService from '@/modules/client/documents/services/documentsService';
import downloadDocument from '@/modules/client/documents/utils/downloadDocument';

const TYPES = [
  ['IDENTIFICATION', 'Identification'], ['REGISTRATION', 'Registration'],
  ['CONTRACT', 'Contract / agreement'], ['COURT_ORDER', 'Court order'],
  ['EVIDENCE', 'Evidence'], ['TAX', 'Tax document'], ['FINANCIAL', 'Financial document'],
  ['LEGAL', 'Legal correspondence'], ['OTHER', 'Other'],
];

export default function ClientDocumentWorkspace({ caseId = '', compact = false }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ title: '', document_type: 'EVIDENCE', case_id: caseId, request_id: '', description: '', file: null });
  const { data, isLoading, error } = useQuery({
    queryKey: ['client-documents', caseId],
    queryFn: () => documentsService.getDocuments(caseId ? { case_id: caseId } : {}),
  });
  const upload = useMutation({
    mutationFn: async () => {
      const payload = new FormData();
      Object.entries(form).forEach(([key, value]) => value && payload.append(key, value));
      return documentsService.uploadDocument(payload);
    },
    onSuccess: () => {
      setForm((current) => ({ ...current, title: '', description: '', request_id: '', file: null }));
      queryClient.invalidateQueries({ queryKey: ['client-documents'] });
    },
  });
  const requests = data?.requests || [];
  const documents = data?.documents || [];
  const cases = data?.cases || [];

  return <div className='space-y-6'>
    {!compact && <SectionHeading title='My documents' subtitle='Secure client file — upload once, then reference the document to a matter.' />}
    <Card className='p-5'>
      <h3 className='font-semibold'>Upload to your client file</h3>
      <p className='mt-1 text-sm text-text-muted-light dark:text-text-muted-dark'>Choose the related matter or an outstanding request. The original remains on your client account.</p>
      <div className='mt-4 grid gap-3 md:grid-cols-2'>
        <input className='rounded-xl border p-3 dark:bg-background-dark' placeholder='Document title' value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <select className='rounded-xl border p-3 dark:bg-background-dark' value={form.document_type} onChange={(e) => setForm({ ...form, document_type: e.target.value })}>{TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        {!caseId && <select className='rounded-xl border p-3 dark:bg-background-dark' value={form.case_id} onChange={(e) => setForm({ ...form, case_id: e.target.value })}><option value=''>Client file only (no matter yet)</option>{cases.map((item) => <option key={item.id} value={item.id}>{item.case_number} — {item.title}</option>)}</select>}
        <select className='rounded-xl border p-3 dark:bg-background-dark' value={form.request_id} onChange={(e) => setForm({ ...form, request_id: e.target.value })}><option value=''>Not fulfilling a specific request</option>{requests.filter((item) => ['OPEN', 'REPLACEMENT_REQUIRED'].includes(item.status)).map((item) => <option key={item.id} value={item.id}>Required: {item.title} ({item.case_number})</option>)}</select>
        <input className='rounded-xl border p-3 dark:bg-background-dark' type='file' onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })} />
        <input className='rounded-xl border p-3 dark:bg-background-dark' placeholder='Short description (optional)' value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </div>
      {upload.error && <p className='mt-3 text-sm text-error'>{upload.error?.response?.data?.detail || 'Upload failed.'}</p>}
      {upload.isSuccess && <p className='mt-3 text-sm text-success'>Document sent to the firm successfully.</p>}
      <button className='mt-4 flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-white disabled:opacity-50' disabled={!form.file || upload.isPending} onClick={() => upload.mutate()}><UploadCloud size={17} />{upload.isPending ? 'Uploading…' : 'Upload document'}</button>
    </Card>
    {requests.length > 0 && <Card className='p-5'><h3 className='font-semibold'>Documents requested by your advocate</h3><div className='mt-3 space-y-2'>{requests.map((item) => <div key={item.id} className='rounded-xl border p-3'><strong>{item.title}</strong><p className='text-sm'>{item.case_number} · {item.status.replaceAll('_', ' ')}</p>{item.instructions && <p className='text-sm text-text-muted-light dark:text-text-muted-dark'>{item.instructions}</p>}</div>)}</div></Card>}
    <Card className='p-5'><h3 className='font-semibold'>Client file documents</h3>{isLoading && <p className='mt-3'>Loading…</p>}{error && <p className='mt-3 text-error'>Could not load documents.</p>}<div className='mt-3 space-y-2'>{documents.map((item) => <button type='button' onClick={() => downloadDocument(item)} key={item.id} className='flex w-full gap-3 rounded-xl border p-3 text-left hover:border-brand-primary'><FileText /><span><strong>{item.title}</strong><span className='block text-xs'>{item.reference} · {item.document_type_label} · {item.review_status.replaceAll('_', ' ')}</span></span></button>)}{!isLoading && documents.length === 0 && <p className='text-text-muted-light dark:text-text-muted-dark'>No documents uploaded yet.</p>}</div></Card>
  </div>;
}
