import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import Card from '@/components/ui/Card';
import SectionHeading from '@/components/ui/SectionHeading';
import Swal from '@/core/utils/themedSwal';
import { getApiErrorMessage } from '@/core/utils/errorMessages';
import adminReportsService from '@/modules/admin/reports/services/adminReportsService';
import downloadDocument from '@/modules/client/documents/utils/downloadDocument';

const REQUEST_STATUS = {
  AWAITING_SECRETARY_DISPATCH: 'Awaiting secretary dispatch',
  OPEN: 'Waiting for the client',
  PENDING_SECRETARY: 'Uploaded — secretary verifying',
  UPLOADED: 'Verified — advocate to review',
  REPLACEMENT_REQUIRED: 'Replacement requested from client',
};

export default function AdminDocumentsPage() {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-document-register', query],
    queryFn: () => adminReportsService.getDocumentRegister(query ? { q: query } : {}),
  });
  const totals = data?.totals || {};

  const download = async (document) => {
    try { await downloadDocument(document); }
    catch (err) { Swal.fire('Download failed', getApiErrorMessage(err), 'error'); }
  };

  return (
    <div className='space-y-6 p-4 sm:p-6'>
      <SectionHeading
        title='Documents'
        subtitle='Every client document on record, where the original is held, and document requests still open across the firm.'
        size='hero'
        as='h1'
      />

      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        {[['Documents on record', totals.documents], ['Waiting for clients', totals.awaiting_client], ['With secretaries', totals.awaiting_secretary], ['Awaiting advocate review', totals.awaiting_advocate]].map(([label, value]) => (
          <Card key={label} className='p-4'><p className='text-sm text-[color:var(--text-muted)]'>{label}</p><p className='text-2xl font-bold tabular-nums'>{value ?? '…'}</p></Card>
        ))}
      </div>

      {error && <Card className='p-6 text-red-700 dark:text-red-300'>{getApiErrorMessage(error, 'Failed to load the document register.')}</Card>}

      {!error && (data?.open_requests || []).length > 0 && (
        <Card className='overflow-x-auto p-5'>
          <h2 className='font-semibold'>Open document requests</h2>
          <table className='mt-3 w-full min-w-[760px] text-left text-sm'>
            <thead className='text-[color:var(--text-muted)]'><tr>{['Document', 'Client', 'Matter', 'Due', 'Status'].map((h) => <th key={h} className='py-2 pr-3 font-medium'>{h}</th>)}</tr></thead>
            <tbody>
              {data.open_requests.map((item) => (
                <tr key={item.id} className='border-t border-border-light dark:border-border-dark'>
                  <td className='py-2 pr-3 font-medium'>{item.title}</td>
                  <td className='py-2 pr-3'>{item.client_name}</td>
                  <td className='py-2 pr-3'>{item.case_number}</td>
                  <td className='py-2 pr-3'>{item.due_date || '—'}</td>
                  <td className='py-2 pr-3'>{REQUEST_STATUS[item.status] || item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Card className='overflow-x-auto p-5'>
        <form className='flex flex-col gap-2 sm:flex-row sm:items-end' onSubmit={(event) => { event.preventDefault(); setQuery(search.trim()); }}>
          <label className='flex-1 text-sm'>
            <span className='mb-1 block font-medium'>Search by title, reference, file name or client</span>
            <input className='w-full rounded-lg border border-border-light bg-white px-3 py-2 dark:border-border-dark dark:bg-slate-900' value={search} onChange={(event) => setSearch(event.target.value)} />
          </label>
          <button type='submit' className='rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white dark:bg-blue-500'>Search</button>
        </form>
        {isLoading && <p className='mt-4'>Loading documents…</p>}
        {!isLoading && !error && (data?.documents || []).length === 0 && <p className='mt-4 text-[color:var(--text-muted)]'>No documents match.</p>}
        {!isLoading && !error && (data?.documents || []).length > 0 && (
          <table className='mt-4 w-full min-w-[900px] text-left text-sm'>
            <thead className='text-[color:var(--text-muted)]'><tr>{['Reference', 'Title', 'Client', 'Category', 'Review', 'Original held at', ''].map((h) => <th key={h} className='py-2 pr-3 font-medium'>{h}</th>)}</tr></thead>
            <tbody>
              {data.documents.map((item) => (
                <tr key={item.id} className='border-t border-border-light dark:border-border-dark'>
                  <td className='py-2 pr-3 whitespace-nowrap'>{item.reference || '—'}</td>
                  <td className='py-2 pr-3 font-medium'>{item.title}</td>
                  <td className='py-2 pr-3'>{item.client_name}</td>
                  <td className='py-2 pr-3'>{item.category_label || item.document_type_label}</td>
                  <td className='py-2 pr-3'>{String(item.review_status || '').replaceAll('_', ' ').toLowerCase() || '—'}</td>
                  <td className='py-2 pr-3'>{item.physical_storage_location || '—'}</td>
                  <td className='py-2 pr-3'>{item.file_url && <button type='button' className='font-semibold text-blue-700 hover:underline dark:text-blue-300' onClick={() => download(item)}>Download</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
