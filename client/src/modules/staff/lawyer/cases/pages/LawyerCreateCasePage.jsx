import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import SectionHeading from '@/components/ui/SectionHeading';
import Card from '@/components/ui/Card';
import Button3D from '@/components/ui/Button3D';
import CaseCreateForm from '@/modules/cases/shared/CaseCreateForm';
import lawyerCasesService from '@/modules/staff/lawyer/cases/services/lawyerCasesService';

export default function LawyerCreateCasePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const clientId = searchParams.get('client') || searchParams.get('client_id') || '';
  const conflictCheckId = searchParams.get('conflict_check') || '';
  const hasRequiredContext = Boolean(clientId && conflictCheckId);
  const { data: conflictCheck, isLoading: checkLoading } = useQuery({
    queryKey: ['lawyer-client-conflict-check', clientId, conflictCheckId],
    queryFn: () => lawyerCasesService.getConflictCheck(clientId, conflictCheckId),
    enabled: hasRequiredContext,
  });
  const [options, setOptions] = useState({
    clients: [],
    lawyers: [],
    secretaries: [],
    currentLawyer: null,
    canAssignOtherLawyer: false,
  });
  const [loading, setLoading] = useState(true);
  const [canCreate, setCanCreate] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadOptions = async () => {
      try {
        setLoading(true);
        const data = await lawyerCasesService.getCaseCreateOptions();
        if (!mounted) return;
        setOptions({
          clients: data.clients || [],
          lawyers: data.lawyers || [],
          secretaries: data.secretaries || [],
          currentLawyer: data.current_lawyer || null,
          canAssignOtherLawyer: Boolean(data.can_assign_other_lawyer),
        });
        setCanCreate(Boolean(data.can_create_matter));
      } catch {
        if (mounted) {
          setCanCreate(false);
          setOptions({ clients: [], lawyers: [], secretaries: [], currentLawyer: null, canAssignOtherLawyer: false });
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadOptions();
    return () => {
      mounted = false;
    };
  }, []);

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
          <Button3D className='mt-4' onClick={() => navigate('/lawyer/clients')}>
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
          <Button3D className='mt-4' onClick={() => navigate('/lawyer/clients')}>
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
        clients={options.clients}
        clientsLoading={loading}
        lawyers={options.lawyers}
        secretaries={options.secretaries}
        createCase={(payload) => lawyerCasesService.createCase(payload)}
        cancelPath='/lawyer/cases'
        listPath='/lawyer/cases'
        detailsPath={(caseId) => `/lawyer/cases/${caseId}`}
        canCreate={!loading && canCreate}
        currentLawyer={options.currentLawyer}
        canAssignOtherLawyer={options.canAssignOtherLawyer}
        initialClientId={clientId}
        initialConflictCheckId={conflictCheckId}
        initialConflictCheck={conflictCheck}
      />
    </div>
  );
}
