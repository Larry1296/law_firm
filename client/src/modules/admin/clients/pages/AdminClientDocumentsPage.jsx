import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';

import BackLink from '@/components/ui/BackLink';
import Card from '@/components/ui/Card';
import SectionHeading from '@/components/ui/SectionHeading';
import { enumLabel } from '@/core/utils/textFormatter';
import { formatDateTime } from '@/core/utils/dateFormatter';
import adminClientsService from '../services/adminClientsService';

const tabs = ['KYC and client documents', 'Proposed matters', 'Accepted matters', 'Originals / custody', 'Document receipts', 'Audit history'];

export default function AdminClientDocumentsPage() {
  const { id } = useParams();
  const [active, setActive] = useState(tabs[0]);
  const { data, isLoading, error } = useQuery({ queryKey: ['admin-client-document-workspace', id], queryFn: () => adminClientsService.getClientDetails(id) });
  const client = data?.client || {};
  const documents = client.documents || [];

  if (isLoading) return <div className='p-6'>Loading client document register…</div>;
  if (error) return <div className='p-6 text-error'>The client document register could not be loaded.</div>;

  return <div className='space-y-6 p-4 md:p-6'>
    <BackLink label='Back to client' fallbackPath={`/admin/clients/${id}`} />
    <SectionHeading title={`${client.full_name} — physical document register`} subtitle='Master client/KYC file, physical custody, proposed-matter and accepted-matter references' />
    <Card className='p-5'>
      <div className='grid gap-3 md:grid-cols-3'>
        <p><strong>Client</strong><br />{client.full_name}</p>
        <p><strong>KYC file reference</strong><br />{client.kyc_drawer_reference || 'Not assigned'}</p>
        <p><strong>Cabinet location</strong><br />{client.kyc_cabinet_location || 'Not recorded'}</p>
      </div>
    </Card>
    <div className='flex gap-2 overflow-x-auto border-b border-border-light dark:border-border-dark'>
      {tabs.map((tab) => <button key={tab} className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-semibold ${active === tab ? 'border-brand-primary text-brand-primary' : 'border-transparent'}`} onClick={() => setActive(tab)}>{tab}</button>)}
    </div>

    {active === tabs[0] && <Card className='overflow-x-auto p-5'>
      <table className='min-w-full text-left text-sm'><thead><tr>{['Reference', 'Title', 'Category / type', 'Identifier', 'Original / copy', 'Verification', 'Physical location', 'Proposed matters', 'Accepted matters', 'Digital copy', 'Return'].map((item) => <th key={item} className='border-b p-2'>{item}</th>)}</tr></thead>
      <tbody>{documents.map((document) => <tr key={document.id} className='align-top'>
        <td className='border-b p-2 font-semibold'>{document.reference}</td><td className='border-b p-2'>{document.title}</td>
        <td className='border-b p-2'>{document.category_label} / {document.subtype_label}</td><td className='border-b p-2'>{document.document_identifier || '—'}</td>
        <td className='border-b p-2'>{enumLabel(document.source_copy_type)}</td><td className='border-b p-2'>{enumLabel(document.verification_status)}</td>
        <td className='border-b p-2'>{document.physical_storage_location || 'Not recorded'}</td><td className='border-b p-2'>See proposed matters</td>
        <td className='border-b p-2'>{(document.matters || []).map((matter) => matter.case_number).join(', ') || '—'}</td><td className='border-b p-2'>{document.digital_copy_available ? 'Available' : 'No scan recorded'}</td>
        <td className='border-b p-2'>{document.return_required ? `Required${document.expected_return_date ? ` by ${document.expected_return_date}` : ''}` : 'Not required'}</td>
      </tr>)}</tbody></table>{!documents.length && <p>No physical documents have been registered for this client.</p>}
    </Card>}

    {active === tabs[1] && <Card className='p-5 space-y-3'>{(client.proposed_matters || []).map((item) => <Link className='block border-b py-3' key={item.id} to={`/admin/clients/${id}/conflict-checks/${item.id}`}><strong>{item.reference} — {item.title}</strong><p>{enumLabel(item.status)} · Firm acceptance: {enumLabel(item.acceptance_decision)}</p></Link>)}{!client.proposed_matters?.length && <p>No proposed matters.</p>}</Card>}
    {active === tabs[2] && <Card className='p-5 space-y-3'>{(client.accepted_matters || []).map((item) => <Link className='block border-b py-3' key={item.id} to={`/admin/cases/${item.id}`}><strong>{item.reference} — {item.title}</strong><p>{enumLabel(item.matter_status)} · Origin: {item.originating_proposed_matter || 'Legacy matter'}</p></Link>)}{!client.accepted_matters?.length && <p>No accepted matters.</p>}</Card>}
    {active === tabs[3] && <Card className='p-5 space-y-3'>{documents.filter((item) => item.physical_copy_retained).map((item) => <div className='border-b py-3' key={item.id}><strong>{item.reference} — {item.title}</strong><p>{enumLabel(item.source_copy_type)} · {item.physical_storage_location}</p><p>{item.custody_notes || 'No custody note recorded.'}</p></div>)}{!documents.some((item) => item.physical_copy_retained) && <p>No retained physical records.</p>}</Card>}
    {active === tabs[4] && <Card className='p-5 space-y-4'>{(client.document_receipts || []).map((receipt) => <div className='border-b pb-4' key={receipt.id}><strong>{receipt.receipt_number}</strong><p>{formatDateTime(receipt.received_at)} · from {receipt.received_from} · received by {receipt.received_by}</p>{receipt.documents.map((line) => <p key={line.reference} className='text-sm'>{line.reference} — {line.title} — {enumLabel(line.copy_type)} — {line.page_count} page(s)</p>)}</div>)}{!client.document_receipts?.length && <p>No receipts generated.</p>}</Card>}
    {active === tabs[5] && <Card className='p-5 space-y-3'>{(client.kyc_reference_history || []).map((item, index) => <div className='border-b py-3' key={`${item.changed_at}-${index}`}><strong>{item.previous_reference || 'Unassigned'} → {item.new_reference}</strong><p>{item.reason}</p><p className='text-sm'>{formatDateTime(item.changed_at)} by {item.changed_by}</p></div>)}{!client.kyc_reference_history?.length && <p>No KYC reference changes recorded.</p>}</Card>}
  </div>;
}
