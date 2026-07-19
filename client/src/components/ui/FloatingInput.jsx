import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function FloatingInput({
  label,
  type = 'text',
  value,
  onChange,
  name,
  placeholder = '',
  error,
  disabled = false,
  className = '',
  noFloat = false,
  autoComplete,
  autoCorrect,
  autoCapitalize,
  spellCheck,
  ...props
}) {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === 'password';
  const isDate = type === 'date';

  const inputType = isPassword && showPassword ? 'text' : type;

  const shouldFloat = !noFloat && !isDate;
  const supportsWritingAssist = ![
    'password',
    'number',
    'date',
    'time',
    'datetime-local',
    'month',
    'week',
    'file',
    'checkbox',
    'radio',
  ].includes(type);

  return (
    <div className={`w-full mb-8 ${className}`}>
      {/* FIXED LABEL (always on top for noFloat OR date) */}
      {label && (noFloat || isDate) && (
        <label
          htmlFor={name}
          className='block mb-2 text-sm font-medium text-[color:var(--text-muted)] dark:text-slate-200'
        >
          {label}
        </label>
      )}

      {/* INPUT WRAPPER */}
      <div
        className={`
          relative w-full rounded-xl border transition-all duration-200
          bg-[color:var(--surface-raised)] border-[color:var(--border)]
          shadow-sm
          ${focused ? 'shadow-md border-[color:var(--brand-primary)]' : ''}
          ${disabled ? 'opacity-60 cursor-not-allowed' : ''}
        `}
      >
        {/* INPUT */}
        <input
          id={name}
          name={name}
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder={shouldFloat ? ' ' : placeholder}
          disabled={disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoComplete={autoComplete ?? (isPassword ? 'current-password' : 'on')}
          autoCorrect={autoCorrect ?? (supportsWritingAssist ? 'on' : 'off')}
          autoCapitalize={autoCapitalize ?? (supportsWritingAssist ? 'sentences' : 'none')}
          spellCheck={spellCheck ?? supportsWritingAssist}
          {...props}
          className={`
            floating-input-field w-full rounded-xl bg-transparent px-4 pb-3 pt-6 outline-none
            text-[color:var(--text-primary)] placeholder:text-[color:var(--text-muted)]
            dark:text-slate-100 dark:placeholder:text-slate-400 dark:[color-scheme:dark]
            disabled:cursor-not-allowed
          `}
        />

        {/* FLOATING LABEL */}
        {label && shouldFloat && (
          <label
            htmlFor={name}
            className={`
              absolute left-4 transition-all duration-200 pointer-events-none
              ${
                focused || value
                  ? 'top-2 text-xs font-semibold'
                  : 'top-1/2 -translate-y-1/2 text-base'
              }
              ${
                focused || value
                  ? 'text-[color:var(--brand-primary)] dark:text-sky-300'
                  : 'text-[color:var(--text-muted)] dark:text-slate-300'
              }
            `}
          >
            {label}
          </label>
        )}

        {/* PASSWORD TOGGLE */}
        {isPassword && (
          <button
            type='button'
            onClick={() => setShowPassword(!showPassword)}
            className='absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]'
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        )}
      </div>

      {/* ERROR */}
      {error && <p className='mt-2 text-sm text-red-500'>{error}</p>}
    </div>
  );
}
