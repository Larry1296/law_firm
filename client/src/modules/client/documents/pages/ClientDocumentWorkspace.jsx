import { useQuery } from '@tanstack/react-query';
import { FileText } from 'lucide-react';

import Card from '@/components/ui/Card';
import SectionHeading from '@/components/ui/SectionHeading';
import documentsService from '@/modules/client/documents/services/documentsService';
import downloadDocument from '@/modules/client/documents/utils/downloadDocument';

export default function ClientDocumentWorkspace({ caseId = '', compact = false }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['client-documents', caseId],
    queryFn: () => documentsService.getDocuments(caseId ? { case_id: caseId } : {}),
  });
  const requests = data?.requests || [];
  const documents = data?.documents || [];

  return <div className='space-y-6'>
    {!compact && <SectionHeading title='My documents' subtitle='Physical records held in your firm KYC drawer.' />}
    <Card className='p-5'>
      <h3 className='font-semibold'>How to provide a required document</h3>
      <p className='mt-1 text-sm text-text-muted-light dark:text-text-muted-dark'>Deliver the physical document to the firm secretary. The secretary records it under your permanent KYC drawer reference and confirms receipt to the assigned advocate. Document uploads are not accepted.</p>
    </Card>
    {requests.length > 0 && <Card className='p-5'><h3 className='font-semibold'>Documents requested by your advocate</h3><div className='mt-3 space-y-2'>{requests.map((item) => <div key={item.id} className='rounded-xl border p-3'><strong>{item.title}</strong><p className='text-sm'>{item.case_number} · {item.status.replaceAll('_', ' ')}</p>{item.instructions && <p className='text-sm text-text-muted-light dark:text-text-muted-dark'>{item.instructions}</p>}</div>)}</div></Card>}
    <Card className='p-5'><h3 className='font-semibold'>Client file documents</h3>{isLoading && <p className='mt-3'>Loading…</p>}{error && <p className='mt-3 text-error'>Could not load documents.</p>}<div className='mt-3 space-y-2'>{documents.map((item) => <button type='button' onClick={() => downloadDocument(item)} key={item.id} className='flex w-full gap-3 rounded-xl border p-3 text-left hover:border-brand-primary'><FileText /><span><strong>{item.title}</strong><span className='block text-xs'>{item.reference} · {item.document_type_label} · {item.review_status.replaceAll('_', ' ')}</span></span></button>)}{!isLoading && documents.length === 0 && <p className='text-text-muted-light dark:text-text-muted-dark'>No documents uploaded yet.</p>}</div></Card>
  </div>;
}
