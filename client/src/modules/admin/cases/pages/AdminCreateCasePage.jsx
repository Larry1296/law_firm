import React from 'react';
import { useSearchParams } from 'react-router-dom';

import SectionHeading from '@/components/ui/SectionHeading';
import CaseCreateForm from '@/modules/cases/shared/CaseCreateForm';
import useAdminCreateCase from '@/modules/admin/cases/hooks/useAdminCreateCase';
import useAdminClients from '@/modules/admin/clients/hooks/useAdminClients';
import useFirmLawyers from '@/modules/admin/cases/hooks/useFirmLawyers';
import useFirmSecretaries from '@/modules/admin/cases/hooks/useFirmSecretaries';

export default function AdminCreateCasePage() {
  const [searchParams] = useSearchParams();
  const { createCase } = useAdminCreateCase();
  const { clients = [], isLoading = false } = useAdminClients();
  const { lawyers = [] } = useFirmLawyers();
  const { secretaries = [] } = useFirmSecretaries();

  return (
    <div className='space-y-6 p-4 md:p-6'>
      <SectionHeading
        title='Create Matter'
        subtitle='Register a legal matter or an already-filed court proceeding'
      />

      <CaseCreateForm
        clients={clients}
        clientsLoading={isLoading}
        lawyers={lawyers}
        secretaries={secretaries}
        createCase={createCase}
        cancelPath='/admin/cases'
        listPath='/admin/cases'
        detailsPath={(caseId) => `/admin/cases/${caseId}`}
        initialClientId={searchParams.get('client_id') || ''}
      />
    </div>
  );
}
