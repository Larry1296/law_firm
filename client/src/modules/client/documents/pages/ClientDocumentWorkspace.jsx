import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { FileText, Upload } from 'lucide-react';

import Card from '@/components/ui/Card';
import SectionHeading from '@/components/ui/SectionHeading';
import { getApiErrorMessage } from '@/core/utils/errorMessages';
import documentsService from '@/modules/client/documents/services/documentsService';
import downloadDocument from '@/modules/client/documents/utils/downloadDocument';

// What each request status means to the client. Only the first two expect an upload.
const REQUEST_STATES = {
  OPEN: { label: 'Waiting for your upload', tone: 'bg-amber-100 text-amber-900', canUpload: true },
  REPLACEMENT_REQUIRED: { label: 'Replacement needed', tone: 'bg-red-100 text-red-900', canUpload: true },
  PENDING_SECRETARY: { label: 'Received, being checked by the firm', tone: 'bg-blue-100 text-blue-900' },
  UPLOADED: { label: 'Checked, with your advocate for review', tone: 'bg-blue-100 text-blue-900' },
  ACCEPTED: { label: 'Accepted', tone: 'bg-emerald-100 text-emerald-900' },
  CANCELLED: { label: 'Cancelled', tone: 'bg-slate-100 text-slate-700' },
};

const ACCEPTED_FILES = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt';

function RequestCard({ item, highlighted }) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState(null);
  const state = REQUEST_STATES[item.status] || { label: item.status.replaceAll('_', ' '), tone: 'bg-slate-100 text-slate-700' };
  const upload = useMutation({
    mutationFn: () => documentsService.uploadRequestedDocument(item.id, file),
    onSuccess: () => {
      setFile(null);
      setMessage({ tone: 'success', text: 'Uploaded. The firm will check it and let you know.' });
      queryClient.invalidateQueries({ queryKey: ['client-documents'] });
    },
    onError: (error) => setMessage({ tone: 'error', text: getApiErrorMessage(error, 'The document could not be uploaded.') }),
  });

  return (
    <div id={`request-${item.id}`} className={`rounded-xl border p-4 ${highlighted ? 'border-brand-primary ring-2 ring-brand-primary/30' : 'border-border-light dark:border-border-dark'}`}>
      <div className='flex flex-wrap items-start justify-between gap-2'>
        <div>
          <strong>{item.title}</strong>
          <p className='text-sm text-text-muted-light dark:text-text-muted-dark'>
            {item.case_number} · {item.case_title}
            {item.due_date ? ` · needed by ${new Date(item.due_date).toLocaleDateString()}` : ''}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${state.tone}`}>{state.label}</span>
      </div>
      {item.instructions && <p className='mt-2 text-sm'>{item.instructions}</p>}
      {item.status === 'REPLACEMENT_REQUIRED' && item.review_notes && (
        <p className='mt-2 rounded-lg bg-red-50 p-3 text-sm text-red-900'>Why a replacement is needed: {item.review_notes}</p>
      )}
      {state.canUpload && (
        <form
          className='mt-3 flex flex-col gap-2 sm:flex-row sm:items-center'
          onSubmit={(event) => { event.preventDefault(); setMessage(null); upload.mutate(); }}
        >
          <label className='min-w-0 flex-1 text-sm'>
            <span className='sr-only'>Choose the file for {item.title}</span>
            <input
              type='file'
              accept={ACCEPTED_FILES}
              onChange={(event) => setFile(event.target.files?.[0] || null)}
              className='block w-full text-sm'
            />
          </label>
          <button
            type='submit'
            disabled={!file || upload.isPending}
            className='inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50'
          >
            <Upload size={16} />
            {upload.isPending ? 'Uploading…' : 'Upload'}
          </button>
        </form>
      )}
      {message && (
        <p role={message.tone === 'error' ? 'alert' : 'status'} className={`mt-2 text-sm ${message.tone === 'error' ? 'text-red-700' : 'text-emerald-700'}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}

export default function ClientDocumentWorkspace({ caseId = '', compact = false }) {
  const [searchParams] = useSearchParams();
  const highlightedRequest = searchParams.get('request');
  const { data, isLoading, error } = useQuery({
    queryKey: ['client-documents', caseId],
    queryFn: () => documentsService.getDocuments(caseId ? { case_id: caseId } : {}),
  });
  const requests = data?.requests || [];
  const documents = data?.documents || [];
  const waiting = requests.filter((item) => REQUEST_STATES[item.status]?.canUpload);

  return <div className='space-y-6'>
    {!compact && <SectionHeading title='My documents' subtitle='Documents your firm holds or has asked you for.' />}
    <Card className='p-5'>
      <h3 className='font-semibold'>Documents requested by your firm</h3>
      <p className='mt-1 text-sm text-text-muted-light dark:text-text-muted-dark'>
        When your advocate or their secretary needs a document for one of your matters, it appears here with an upload button.
        Keep the original: the firm may ask to see it and records where the physical copy is kept.
      </p>
      {waiting.length > 0 && <p className='mt-2 text-sm font-semibold'>{waiting.length} waiting for you</p>}
      <div className='mt-3 space-y-3'>
        {requests.map((item) => <RequestCard key={item.id} item={item} highlighted={item.id === highlightedRequest} />)}
        {!isLoading && requests.length === 0 && (
          <p className='text-sm text-text-muted-light dark:text-text-muted-dark'>Nothing has been requested from you.</p>
        )}
      </div>
    </Card>
    <Card className='p-5'><h3 className='font-semibold'>Client file documents</h3>{isLoading && <p className='mt-3'>Loading…</p>}{error && <p className='mt-3 text-error'>Could not load documents.</p>}<div className='mt-3 space-y-2'>{documents.map((item) => <button type='button' onClick={() => downloadDocument(item)} key={item.id} className='flex w-full gap-3 rounded-xl border p-3 text-left hover:border-brand-primary'><FileText /><span><strong>{item.title}</strong><span className='block text-xs'>{item.reference || item.physical_storage_location} · {item.document_type_label} · {item.review_status.replaceAll('_', ' ')}</span></span></button>)}{!isLoading && documents.length === 0 && <p className='text-text-muted-light dark:text-text-muted-dark'>No documents shared with you yet.</p>}</div></Card>
  </div>;
}
