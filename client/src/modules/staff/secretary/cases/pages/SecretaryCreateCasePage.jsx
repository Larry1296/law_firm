import React, { useEffect, useState } from 'react';

import SectionHeading from '@/components/ui/SectionHeading';
import CaseCreateForm from '@/modules/cases/shared/CaseCreateForm';
import useSecretaryCreateCase from '@/modules/staff/secretary/cases/hooks/useSecretaryCreateCase';
import secretaryCasesService from '@/modules/staff/secretary/cases/services/secretaryCaseService';
import useSecretaryDashboard from '@/modules/staff/secretary/dashboard/hooks/useSecretaryDashboard';

const hasPermission = (permissions, permission) =>
  permissions.map((item) => String(item).toUpperCase()).includes(permission);

export default function SecretaryCreateCasePage() {
  const { createCase } = useSecretaryCreateCase();
  const { data: dashboardData, isLoading: dashboardLoading } = useSecretaryDashboard();
  const [options, setOptions] = useState({ clients: [], lawyers: [], secretaries: [] });
  const [optionsLoading, setOptionsLoading] = useState(true);

  const permissions = dashboardData?.permissions || [];
  const canManageCases = hasPermission(permissions, 'MANAGE_CASES');

  useEffect(() => {
    let mounted = true;

    const loadOptions = async () => {
      if (!canManageCases) {
        setOptionsLoading(false);
        return;
      }
      try {
        setOptionsLoading(true);
        const data = await secretaryCasesService.getCaseCreateOptions();
        if (!mounted) return;
        setOptions({
          clients: data.clients || [],
          lawyers: data.lawyers || [],
          secretaries: data.secretaries || [],
        });
      } catch {
        if (mounted) {
          setOptions({ clients: [], lawyers: [], secretaries: [] });
        }
      } finally {
        if (mounted) {
          setOptionsLoading(false);
        }
      }
    };

    if (!dashboardLoading) {
      loadOptions();
    }

    return () => {
      mounted = false;
    };
  }, [canManageCases, dashboardLoading]);

  return (
    <div className='space-y-6 p-4 md:p-6'>
      <SectionHeading
        title='Create Matter'
        subtitle='Register a legal matter or an already-filed court proceeding'
      />

      <CaseCreateForm
        clients={options.clients}
        clientsLoading={optionsLoading || dashboardLoading}
        lawyers={options.lawyers}
        secretaries={options.secretaries}
        createCase={createCase}
        cancelPath='/secretary/cases'
        listPath='/secretary/cases'
        detailsPath={(caseId) => `/secretary/cases/${caseId}`}
        canCreate={canManageCases}
      />
    </div>
  );
}
