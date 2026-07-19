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
  onWheel,
  onKeyDown,
  ...props
}) {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === 'password';
  const isDate = type === 'date';

  const inputType = isPassword && showPassword ? 'text' : type;
  const isNumber = type === 'number';
  const hasValue = String(value ?? '').length > 0;

  const shouldFloat = !noFloat && !isDate;
  const showTopLabel = label && (!shouldFloat || focused || hasValue);
  const inputPlaceholder = shouldFloat && !focused && !hasValue
    ? label
    : placeholder;
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
      <div className='min-h-[1.75rem]'>
        {showTopLabel && (
          <label
            htmlFor={name}
            className='block pb-2 text-sm font-semibold text-[color:var(--text-primary)] dark:text-slate-100'
          >
            {label}{props.required ? ' *' : ''}
          </label>
        )}
      </div>

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
          placeholder={inputPlaceholder}
          disabled={disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onWheel={(event) => {
            if (isNumber) {
              event.currentTarget.blur();
            }
            onWheel?.(event);
          }}
          onKeyDown={(event) => {
            if (isNumber && ['ArrowUp', 'ArrowDown'].includes(event.key)) {
              event.preventDefault();
            }
            onKeyDown?.(event);
          }}
          autoComplete={autoComplete ?? (isPassword ? 'current-password' : 'on')}
          autoCorrect={autoCorrect ?? (supportsWritingAssist ? 'on' : 'off')}
          autoCapitalize={autoCapitalize ?? (supportsWritingAssist ? 'sentences' : 'none')}
          spellCheck={spellCheck ?? supportsWritingAssist}
          step={isNumber ? props.step ?? 'any' : props.step}
          {...props}
          className={`
            floating-input-field w-full rounded-xl bg-transparent px-4 py-4 outline-none
            text-[color:var(--text-primary)] placeholder:font-normal placeholder:text-[color:var(--text-muted)] placeholder:opacity-70
            dark:text-slate-100 dark:placeholder:text-slate-400 dark:[color-scheme:dark]
            disabled:cursor-not-allowed
          `}
        />

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
