import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function PasswordInput({
  label,
  value,
  onChange,
  name,
  placeholder = 'Password',
  required = false,
  disabled = false,
}) {
  const [show, setShow] = useState(false);

  return (
    <div className='mb-8'>
      {label && (
        <label className='block mb-2 text-sm font-medium text-text-primary-light dark:text-text-primary-dark'>
          {label}
        </label>
      )}

      <div className='relative'>
        <input
          type={show ? 'text' : 'password'}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete='current-password'
          autoCorrect='off'
          autoCapitalize='none'
          spellCheck={false}
          className='
            w-full px-4 py-3 pr-12
            border rounded-xl
            bg-background-light dark:bg-background-dark
            text-text-primary-light dark:text-text-primary-dark
            border-border-light dark:border-border-dark
            focus:outline-none focus:ring-2 focus:ring-brand-primary
          '
        />

        <button
          type='button'
          onClick={() => setShow((prev) => !prev)}
          className='
            absolute right-3 top-1/2 -translate-y-1/2
            text-text-muted-light dark:text-text-muted-dark
            hover:text-brand-primary
            z-20
          '
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}
