import { useId, useState } from 'react';
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
  // Labels always sit above the control; accepted so older callers don't leak it to the DOM.
  noFloat: _noFloat,
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
  const [showPassword, setShowPassword] = useState(false);
  const generatedId = useId();
  const inputId = name || generatedId;

  const isPassword = type === 'password';
  const inputType = isPassword && showPassword ? 'text' : type;
  const isNumber = type === 'number';
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
    <div data-form-field className={`form-label w-full ${className}`}>
      {label && (
        <label htmlFor={inputId} className={error ? 'text-[color:var(--form-danger)]' : undefined}>
          {label}{props.required ? ' *' : ''}
        </label>
      )}

      <div className={isPassword ? 'password-field' : undefined}>
        <input
          id={inputId}
          name={name}
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
          onBlur={(event) => {
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
          className='form-control floating-input-field'
        />

        {isPassword && (
          <button
            type='button'
            className='password-toggle'
            aria-label={`${showPassword ? 'Hide' : 'Show'} ${String(label || 'password').toLowerCase()}`}
            aria-controls={inputId}
            onClick={() => setShowPassword((current) => !current)}
          >
            {showPassword ? <EyeOff size={20} aria-hidden='true' /> : <Eye size={20} aria-hidden='true' />}
          </button>
        )}
      </div>

      {error && <p id={`${inputId}-error`} className='form-error'>{error}</p>}
    </div>
  );
}
