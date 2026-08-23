import React from 'react';
import { StepPanel } from './Fields';

const label = (items, value) => items?.find((item) => item.value === value)?.label || value;
const ReviewItem = ({ term, children }) => <div><dt className='text-xs text-gray-500'>{term}</dt><dd className='font-medium'>{children || 'Not recorded'}</dd></div>;

export default function ReviewCreateStep({ state, metadata }) {
  const education = state.regulatory_profiles.education;
  const hasPortalContact = state.representatives.some((item) => item.is_portal_contact);

  return <StepPanel title='Review prospective client' description='Confirm what will be persisted. Matter opening remains subject to proposed instructions, conflict clearance, and acceptance.'>
    <dl className='grid gap-3 md:grid-cols-2'>
      <ReviewItem term='Legal client'>{state.client.full_name}</ReviewItem>
      <ReviewItem term='Legal form'>{label(metadata.legal_client_types, state.client.client_type)}</ReviewItem>
      <ReviewItem term='Access'>{label(metadata.access_types, state.client.access_type)}</ReviewItem>
      <ReviewItem term='Sector'>{state.client.sectors.map((sector) => label(metadata.sectors, sector)).join(', ') || 'None recorded'}</ReviewItem>
      {education && <><ReviewItem term='Institution'>{education.institution_official_name}</ReviewItem><ReviewItem term='Education regime'>{label(metadata.education_regimes, education.education_regime)}</ReviewItem></>}
    </dl>
    <section className='rounded-xl border p-4'>
      <h3 className='font-semibold'>Representatives and portal access</h3>
      <div className='mt-3 space-y-2'>
        {state.representatives.map((representative, index) => <div key={`${representative.full_legal_name}-${index}`} className='rounded-lg bg-gray-50 p-3 text-sm dark:bg-slate-900/40'>
          <strong>{representative.full_legal_name || `Representative ${index + 1}`}</strong>
          <p>{label(metadata.representative_categories, representative.representative_category)} · {representative.role_title || 'Role not recorded'}</p>
          <p>May give instructions: <strong>{representative.is_authorized_to_give_instructions ? 'Yes' : 'No'}</strong></p>
          <p>Company portal contact: <strong>{representative.is_portal_contact ? 'Yes' : 'No'}</strong></p>
        </div>)}
        {!state.representatives.length && <p className='text-sm text-red-700'>No representative recorded.</p>}
      </div>
    </section>
    {state.client.access_type === 'PORTAL_ENABLED' && !hasPortalContact && <p role='alert' className='rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-800'>Portal access is blocked: return to Representatives and select “Company portal contact” for an authorised representative.</p>}
    <p className='rounded-lg bg-amber-50 p-3 text-sm text-amber-900'>Creation status: Prospective Client. Next action: Record Proposed Matter / Instructions.</p>
  </StepPanel>;
}
