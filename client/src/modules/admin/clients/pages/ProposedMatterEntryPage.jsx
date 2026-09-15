import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button3D from '@/components/ui/Button3D';
import Card from '@/components/ui/Card';
import SectionHeading from '@/components/ui/SectionHeading';
import { Input3D } from '@/components/ui/Input3D';
import adminClientsService from '../services/adminClientsService';

export default function ProposedMatterEntryPage() {
  const navigate = useNavigate();
  const [stage, setStage] = useState('prospect');
  const [form, setForm] = useState({ legal_name: '', email: '', phone_number: '', title: '', instructions: '', advocate: '', adverse: '', related: '', practice: '', privacy_notice_version: '', delivery_method: '', lawful_basis: 'LEGITIMATE_INTERESTS' });
  const update = (key) => (event) => setForm({ ...form, [key]: event.target.value });
  const submit = async (event) => {
    event.preventDefault();
    if (stage === 'prospect') return setStage('matter');
    const data = await adminClientsService.createProposedMatter({
      prospective_client: { legal_name: form.legal_name, email: form.email, phone_number: form.phone_number, privacy: { lawful_basis: form.lawful_basis, privacy_notice_version: form.privacy_notice_version, delivery_method: form.delivery_method } },
      proposed_matter: { proposed_matter_title: form.title, proposed_instructions: form.instructions, responsible_lawyer_id: form.advocate || null, no_adverse_party_currently_known: !form.adverse, no_adverse_party_explanation: !form.adverse ? 'No adverse party is presently known.' : '', parties: [...form.adverse.split(',').filter(Boolean).map((name) => ({ name: name.trim(), role: 'PROPOSED_ADVERSE_PARTY' })), ...form.related.split(',').filter(Boolean).map((name) => ({ name: name.trim(), role: 'RELATED_ENTITY' }))], jurisdiction_facts: { practice_area: form.practice } },
    });
    navigate(`/admin/clients/${data.client_id}/conflict-checks/${data.conflict_check.id}`);
  };
  return <div className='space-y-6 p-4 md:p-6'><SectionHeading title='New proposed matter / Start conflict check' subtitle={stage === 'prospect' ? 'Stage A — prospective client' : 'Stage B — proposed matter'} /><Card className='p-6'><p className='mb-4 text-sm text-amber-700'>Record only information needed to identify the proposed client, proposed instructions and relevant parties for conflict screening. Do not record detailed confidential facts, evidence or strategy at this stage. Creating this proposal does not mean the firm has accepted instructions or opened a matter.</p><form onSubmit={submit} className='space-y-4'>{stage === 'prospect' ? <><Input3D label='Legal name' value={form.legal_name} onChange={update('legal_name')} required /><Input3D label='Safe telephone or email' value={form.phone_number} onChange={update('phone_number')} /><Input3D label='Privacy notice version' value={form.privacy_notice_version} onChange={update('privacy_notice_version')} required /><Input3D label='Delivery method' value={form.delivery_method} onChange={update('delivery_method')} required /></> : <><Input3D label='Proposed matter working title' value={form.title} onChange={update('title')} required /><Input3D label='Broad proposed instructions' value={form.instructions} onChange={update('instructions')} required /><Input3D label='Responsible advocate (user ID)' value={form.advocate} onChange={update('advocate')} /><Input3D label='Adverse parties (comma separated)' value={form.adverse} onChange={update('adverse')} /><Input3D label='Related parties/entities (comma separated)' value={form.related} onChange={update('related')} /><Input3D label='Broad practice area' value={form.practice} onChange={update('practice')} /></>}<Button3D type='submit' variant='primary'>{stage === 'prospect' ? 'Continue to proposed matter' : 'Create and start conflict screening'}</Button3D></form></Card></div>;
}
