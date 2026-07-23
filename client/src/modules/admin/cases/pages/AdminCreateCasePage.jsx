import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import SectionHeading from '@/components/ui/SectionHeading';
import Card from '@/components/ui/Card';
import Button3D from '@/components/ui/Button3D';
import CaseCreateForm from '@/modules/cases/shared/CaseCreateForm';
import useAdminCreateCase from '@/modules/admin/cases/hooks/useAdminCreateCase';
import useAdminClients from '@/modules/admin/clients/hooks/useAdminClients';
import useFirmLawyers from '@/modules/admin/cases/hooks/useFirmLawyers';
import useFirmSecretaries from '@/modules/admin/cases/hooks/useFirmSecretaries';
import adminClientsService from '@/modules/admin/clients/services/adminClientsService';

export default function AdminCreateCasePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { createCase } = useAdminCreateCase();
  const { clients = [], isLoading = false } = useAdminClients();
  const { lawyers = [] } = useFirmLawyers();
  const { secretaries = [] } = useFirmSecretaries();
  const clientId = searchParams.get('client') || searchParams.get('client_id') || '';
  const conflictCheckId = searchParams.get('conflict_check') || '';
  const hasRequiredContext = Boolean(clientId && conflictCheckId);
  const { data: conflictCheck, isLoading: checkLoading } = useQuery({
    queryKey: ['admin-client-conflict-check', clientId, conflictCheckId],
    queryFn: () => adminClientsService.getConflictCheck(clientId, conflictCheckId),
    enabled: hasRequiredContext,
  });

  if (hasRequiredContext && checkLoading) {
    return (
      <div className='space-y-6 p-4 md:p-6'>
        <SectionHeading title='Create Matter' subtitle='Loading conflict clearance' />
        <Card className='p-6'>
          <p className='font-semibold text-text-primary-light dark:text-text-primary-dark'>
            Loading the cleared conflict record before case creation.
          </p>
        </Card>
      </div>
    );
  }

  if (hasRequiredContext && (!conflictCheck || conflictCheck.status !== 'CLEARED' || conflictCheck.consumed_at || conflictCheck.created_case)) {
    return (
      <div className='space-y-6 p-4 md:p-6'>
        <SectionHeading title='Create Matter' subtitle='Conflict clearance required' />
        <Card className='p-6'>
          <p className='font-semibold text-text-primary-light dark:text-text-primary-dark'>
            Select a client and complete conflict clearance before creating a case.
          </p>
          <Button3D className='mt-4' onClick={() => navigate('/admin/clients')}>
            Go to Clients
          </Button3D>
        </Card>
      </div>
    );
  }

  if (!hasRequiredContext) {
    return (
      <div className='space-y-6 p-4 md:p-6'>
        <SectionHeading title='Create Matter' subtitle='Conflict clearance required' />
        <Card className='p-6'>
          <p className='font-semibold text-text-primary-light dark:text-text-primary-dark'>
            Select a client and complete conflict clearance before creating a case.
          </p>
          <Button3D className='mt-4' onClick={() => navigate('/admin/clients')}>
            Go to Clients
          </Button3D>
        </Card>
      </div>
    );
  }

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
        initialClientId={clientId}
        initialConflictCheckId={conflictCheckId}
        initialConflictCheck={conflictCheck}
        canCreate={true}
      />
    </div>
  );
}
