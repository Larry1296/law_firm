import React from 'react';
import { StepPanel } from './Fields';

export default function ClientTypeStep({ metadata, value, onChange }) {
  return <StepPanel title='Who is seeking legal services?' description='Choose the legal person, entity, arrangement, or capacity retaining the firm—not its sector.'>
    <div className='grid gap-3 md:grid-cols-2'>{(metadata.legal_client_types || []).map((type) => <button type='button' key={type.value} onClick={() => onChange(type.value)} className={`rounded-xl border p-4 text-left ${value === type.value ? 'border-blue-600 ring-2 ring-blue-200' : 'border-[color:var(--border)]'}`}><strong className='block'>{type.label}</strong><span className='text-xs text-[color:var(--text-secondary)]'>{type.description}</span></button>)}</div>
  </StepPanel>;
}
