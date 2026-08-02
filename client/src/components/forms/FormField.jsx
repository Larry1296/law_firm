import { AlertCircle } from 'lucide-react';
import { labelClass } from './formStyles';

export default function FormField({ id, label, required = false, optional = false, help, error, children, className = '' }) {
  const describedBy = [help ? `${id}-help` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined;
  return (
    <div data-form-field className={`min-w-0 space-y-1.5 ${error ? 'form-field-invalid' : ''} ${className}`}>
      {label && <label htmlFor={id} className={labelClass}>{label}{required && <span className='ml-1 text-error' aria-hidden='true'>*</span>}{required && <span className='sr-only'> (required)</span>}{optional && !required && <span className='ml-1 font-normal text-text-muted-light dark:text-text-muted-dark'>(optional)</span>}</label>}
      {help && <p id={`${id}-help`} className='text-xs leading-5 text-text-muted-light dark:text-text-muted-dark'>{help}</p>}
      {typeof children === 'function' ? children({ describedBy, invalid: Boolean(error) }) : children}
      {error && <p id={`${id}-error`} role='alert' className='flex items-start gap-1.5 text-xs leading-5 text-error dark:text-red-400'><AlertCircle size={15} className='mt-0.5 shrink-0' aria-hidden='true' />{error}</p>}
    </div>
  );
}

