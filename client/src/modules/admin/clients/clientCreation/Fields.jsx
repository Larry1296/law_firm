import React from 'react';
import ElasticTextInput from '@/components/ui/ElasticTextInput';

export function Field({ label, value = '', onChange, type = 'text', required = false, help = '' }) {
  if (type === 'checkbox') {
    return <label className='flex cursor-pointer items-start gap-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] p-3 text-sm text-[color:var(--text-primary)]'>
      <input type='checkbox' checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} className='mt-0.5 h-5 w-5 shrink-0 accent-blue-600' />
      <span>
        <span className='block font-semibold'>{label}{required ? ' *' : ''}</span>
        {help && <span className='mt-1 block text-xs leading-relaxed text-[color:var(--text-secondary)]'>{help}</span>}
      </span>
    </label>;
  }

  if (type === 'text') {
    return <ElasticTextInput
      label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      required={required}
      alwaysShowLabel
      wrapperClassName='!mb-0'
      textareaClassName='min-h-11 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2'
    />;
  }

  return <label className='block text-sm text-[color:var(--text-primary)]'>
    <span className='mb-1 block font-medium'>{label}{required ? ' *' : ''}</span>
    <input type={type} value={value ?? ''} onChange={(e) => onChange(e.target.value)} className='w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2' />
    {help && <span className='mt-1 block text-xs text-[color:var(--text-secondary)]'>{help}</span>}
  </label>;
}

export function SelectField({ label, value = '', onChange, options = [], required = false }) {
  return <label className='block text-sm'><span className='mb-1 block font-medium'>{label}{required ? ' *' : ''}</span>
    <select value={value ?? ''} onChange={(e) => onChange(e.target.value)} className='w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2'>
      <option value=''>Select…</option>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </label>;
}

export const StepPanel = ({ title, description, children }) => <section className='space-y-5 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5'><div><h2 className='text-xl font-semibold'>{title}</h2><p className='text-sm text-[color:var(--text-secondary)]'>{description}</p></div>{children}</section>;
