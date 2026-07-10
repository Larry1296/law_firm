import { useQuery } from '@tanstack/react-query';

import Card from '@/components/ui/Card';
import SectionHeading from '@/components/ui/SectionHeading';
import secretaryDocumentsService from '@/modules/staff/secretary/documents/services/secretaryDocumentsService';

export default function SecretaryDocuments() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['secretary-documents'],
    queryFn: secretaryDocumentsService.getDocuments,
  });

  return (
    <div className='space-y-6 p-4 md:p-6'>
      <SectionHeading title='Documents' subtitle='Secretarial document work' />

      <Card className='p-6'>
        {isLoading && <p>Loading documents...</p>}
        {error && <p>{error?.response?.data?.detail || 'Failed to load documents.'}</p>}
        {!isLoading &&
          !error &&
          (data?.documents || []).map((document) => (
            <div key={document.id} className='border-b py-3'>
              <strong>{document.title}</strong>
              <p>{document.document_type} - {document.status}</p>
            </div>
          ))}
      </Card>
    </div>
  );
}
