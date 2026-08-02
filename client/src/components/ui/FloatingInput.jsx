import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import {
  formattedInputEvent,
  shouldTitleCaseInput,
  toTitleCase,
} from '@/core/forms/formTextFormatting';

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
  onBlur,
  format = 'auto',
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
  const titleCaseOnBlur = shouldTitleCaseInput({ name, type, format });

  return (
    <div data-form-field className={`w-full space-y-1.5 ${className}`}>
      <div>
        {showTopLabel && (
          <label
            htmlFor={name}
            className={`block text-sm font-semibold leading-5 transition-colors ${error ? 'text-error dark:text-red-400' : 'text-text-primary-light dark:text-text-primary-dark'}`}
          >
            {label}{props.required ? ' *' : ''}
          </label>
        )}
      </div>

      {/* INPUT WRAPPER */}
      <div
        className={`
          relative w-full rounded-lg border transition duration-150
          bg-white dark:bg-slate-950/35 ${error ? 'border-error ring-2 ring-error/20' : 'border-border-light dark:border-border-dark'}
          ${focused && !error ? 'border-brand-primary ring-2 ring-brand-primary/20' : ''}
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
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${name}-error` : undefined}
          onFocus={() => setFocused(true)}
          onBlur={(event) => {
            setFocused(false);
            if (titleCaseOnBlur) {
              const formattedValue = toTitleCase(event.currentTarget.value);
              if (formattedValue !== event.currentTarget.value) {
                onChange?.(formattedInputEvent(event, formattedValue));
              }
            }
            onBlur?.(event);
          }}
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
            floating-input-field min-h-11 w-full rounded-lg bg-transparent px-3.5 py-2.5 text-sm outline-none
            text-[color:var(--text-primary)] placeholder:font-normal placeholder:text-[color:var(--text-muted)] placeholder:opacity-70
            dark:text-slate-100 dark:placeholder:text-slate-400 dark:[color-scheme:dark]
            disabled:cursor-not-allowed aria-[invalid=true]:placeholder:text-red-500
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
      {error && <p id={`${name}-error`} className='mt-2 text-sm text-red-500'>{error}</p>}
    </div>
  );
}
