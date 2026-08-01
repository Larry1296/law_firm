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
    <div data-form-field className={`w-full mb-8 ${className}`}>
      <div className='min-h-[1.75rem]'>
        {showTopLabel && (
          <label
            htmlFor={name}
            className={`block pb-1 text-base italic font-bold tracking-wide transition-colors ${error ? 'text-red-600 dark:text-red-400' : 'text-[color:var(--text-muted)]'}`}
          >
            {label}{props.required ? ' *' : ''}
          </label>
        )}
      </div>

      {/* INPUT WRAPPER */}
      <div
        className={`
          relative w-full border-0 border-b transition-colors duration-200
          bg-transparent ${error ? 'border-red-600' : 'border-[color:var(--border)]'}
          ${focused && !error ? 'border-[color:var(--brand-primary)]' : ''}
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
            floating-input-field w-full rounded-none bg-transparent px-0 py-3 outline-none
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
