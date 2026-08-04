import { useEffect, useState } from 'react';

export default function ActionModal({ open, title, summary, fields = [], submitLabel = 'Confirm', busy = false, onCancel, onSubmit }) {
  const [values, setValues] = useState({});
  useEffect(() => {
    // This resets controlled form state when a new command is opened.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setValues(Object.fromEntries(fields.map((field) => [field.name, field.defaultValue ?? ''])));
  }, [open, fields]);
  if (!open) return null;
  return <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4' role='dialog' aria-modal='true' aria-label={title}>
    <form className='w-full max-w-lg space-y-4 rounded-xl bg-surface-light p-6 shadow-xl dark:bg-surface-dark' onSubmit={(event) => { event.preventDefault(); onSubmit(values); }}>
      <div><h2 className='text-lg font-semibold'>{title}</h2>{summary && <p className='mt-1 text-sm text-text-muted-light dark:text-text-muted-dark'>{summary}</p>}</div>
      {fields.map((field) => <label className='block text-sm' key={field.name}>{field.label}{field.type === 'textarea' ? <textarea className='mt-1 min-h-24 w-full rounded-lg border bg-transparent p-2' required={field.required !== false} value={values[field.name] || ''} onChange={(event) => setValues({ ...values, [field.name]: event.target.value })} /> : field.type === 'select' ? <select className='mt-1 w-full rounded-lg border bg-transparent p-2' required={field.required !== false} multiple={field.multiple} value={values[field.name] || (field.multiple ? [] : '')} onChange={(event) => setValues({ ...values, [field.name]: field.multiple ? Array.from(event.target.selectedOptions, (option) => option.value) : event.target.value })}><option value=''>Select a record</option>{(field.options || []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : <input className='mt-1 w-full rounded-lg border bg-transparent p-2' type={field.type || 'text'} required={field.required !== false} value={values[field.name] || ''} onChange={(event) => setValues({ ...values, [field.name]: event.target.value })} />}</label>)}
      <div className='flex justify-end gap-2'><button type='button' className='rounded-lg border px-4 py-2' onClick={onCancel} disabled={busy}>Cancel</button><button type='submit' className='rounded-lg bg-brand-primary px-4 py-2 font-semibold text-white disabled:opacity-50' disabled={busy}>{busy ? 'Processing...' : submitLabel}</button></div>
    </form>
  </div>;
}
