import { useParams } from 'react-router-dom';

import BackLink from '@/components/ui/BackLink';
import Card from '@/components/ui/Card';
import SectionHeading from '@/components/ui/SectionHeading';
import { formatDateTime } from '@/core/utils/dateFormatter';
import useSecretaryCaseDetails from '../hooks/useSecretaryCaseDetails';
import SecretaryDocuments from '../../documents/pages/SecretaryDocuments';
import SecretaryCaseCommunication from '../../communication/components/SecretaryCaseCommunication';
import PhysicalMatterFileCard from '@/modules/cases/shared/PhysicalMatterFileCard';

export default function SecretaryCaseDetailsPage() {
  const { id } = useParams();
  const { caseData, loading, error } = useSecretaryCaseDetails(id);
  if (loading) return <div className='p-6'>Loading matter desk…</div>;
  if (error || !caseData) return <div className='p-6 text-error'>Matter not found or not assigned to your desk.</div>;
  const client = caseData.client || {};
  const lawyer = caseData.assigned_lawyer || {};

  return <div className='space-y-6 p-4 md:p-6'>
    <BackLink label='Back to Cases' fallbackPath='/secretary/cases' />
    <SectionHeading title={caseData.title || caseData.case_number} subtitle='Secretarial coordination view — legal advice, strategy, evidence analysis and privileged notes are restricted.' />
    <Card className='p-5'>
      <h3 className='font-semibold'>Matter coordination</h3>
      <div className='mt-3 grid gap-3 md:grid-cols-2'>
        <p><strong>Internal matter:</strong> {caseData.case_number}</p>
        <p><strong>Court number:</strong> {caseData.official_court_case_number || 'Not filed / not recorded'}</p>
        <p><strong>Matter status:</strong> {caseData.matter_status_label}</p>
        <p><strong>Court stage:</strong> {caseData.court_stage_label}</p>
        <p><strong>Client:</strong> {client.full_name}</p>
        <p><strong>Client contact:</strong> {client.email || client.phone_number || 'Not recorded'}</p>
        <p><strong>Portal access:</strong> {client.access_type === 'PORTAL_ENABLED' ? 'Enabled' : 'Assisted client'}</p>
        <p><strong>Assigned advocate:</strong> {lawyer.name || 'Not assigned'}</p>
        <p><strong>Next court date:</strong> {caseData.next_court_date ? formatDateTime(caseData.next_court_date) : 'Not recorded'}</p>
      </div>
    </Card>
    <PhysicalMatterFileCard physicalFile={caseData.physical_matter_file} caseId={id} canManage />
    {client.access_type === 'PORTAL_ENABLED' && client.portal_access_exists && (
      <SecretaryCaseCommunication
        caseId={id}
        caseNumber={caseData.case_number}
        hasAssignedLawyer={Boolean(caseData.assigned_lawyer?.id)}
      />
    )}
    <SecretaryDocuments caseId={id} compact />
  </div>;
}
