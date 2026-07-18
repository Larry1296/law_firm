import React, { useEffect, useState } from 'react';

import SectionHeading from '@/components/ui/SectionHeading';
import CaseCreateForm from '@/modules/cases/shared/CaseCreateForm';
import lawyerCasesService from '@/modules/staff/lawyer/cases/services/lawyerCasesService';

export default function LawyerCreateCasePage() {
  const [options, setOptions] = useState({ clients: [], lawyers: [], secretaries: [] });
  const [loading, setLoading] = useState(true);
  const [canCreate, setCanCreate] = useState(true);

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
        });
        setCanCreate(true);
      } catch {
        if (mounted) {
          setCanCreate(false);
          setOptions({ clients: [], lawyers: [], secretaries: [] });
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
        canCreate={canCreate}
      />
    </div>
  );
}
