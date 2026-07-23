import React from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
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
  const routeParams = useParams();
  const navigate = useNavigate();
  const { createCase } = useAdminCreateCase();
  const { clients = [], isLoading = false } = useAdminClients();
  const { lawyers = [] } = useFirmLawyers();
  const { secretaries = [] } = useFirmSecretaries();
  const clientId = routeParams.id || searchParams.get('client') || searchParams.get('client_id') || '';
  const conflictCheckId = routeParams.checkId || searchParams.get('conflict_check') || '';
  const hasRequiredContext = Boolean(clientId && conflictCheckId);
  const { data: conflictCheck, isLoading: checkLoading } = useQuery({
    queryKey: ['admin-client-conflict-check', clientId, conflictCheckId],
    queryFn: () => adminClientsService.getConflictCheck(clientId, conflictCheckId),
    enabled: hasRequiredContext,
  });

  if (hasRequiredContext && checkLoading) {
    return (
      <div className='space-y-6 p-4 md:p-6'>
        <SectionHeading title='Open Matter' subtitle='Loading accepted proposed matter' />
        <Card className='p-6'>
          <p className='font-semibold text-text-primary-light dark:text-text-primary-dark'>
            Loading the accepted proposed matter before opening an internal matter.
          </p>
        </Card>
      </div>
    );
  }

  if (hasRequiredContext && (!conflictCheck || !conflictCheck.can_open_matter)) {
    return (
      <div className='space-y-6 p-4 md:p-6'>
        <SectionHeading title='Open Matter' subtitle='Accepted proposed matter required' />
        <Card className='p-6'>
          <p className='font-semibold text-text-primary-light dark:text-text-primary-dark'>
            Select a client, clear conflict, and record firm acceptance before opening a matter.
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
        <SectionHeading title='Open Matter' subtitle='Accepted proposed matter required' />
        <Card className='p-6'>
          <p className='font-semibold text-text-primary-light dark:text-text-primary-dark'>
            Select a client, clear conflict, and record firm acceptance before opening a matter.
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
        title='Open Matter'
        subtitle='Open an internal matter from the accepted proposed matter'
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
