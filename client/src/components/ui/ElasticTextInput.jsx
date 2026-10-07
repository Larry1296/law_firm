import { useId } from 'react';

import AutoGrowTextarea from '@/components/ui/AutoGrowTextarea';

const supportsWritingAssist = true;

export default function ElasticTextInput({
  label,
  value = '',
  onChange,
  name,
  placeholder = '',
  error,
  disabled = false,
  className = '',
  minRows: _minRows,
  maxRows,
  // Labels always sit above the control; accepted so older callers don't leak it to the DOM.
  alwaysShowLabel: _alwaysShowLabel,
  wrapperClassName = '',
  textareaClassName = '',
  autoComplete,
  autoCorrect,
  autoCapitalize,
  spellCheck,
  required = false,
  onBlur,
  onFocus,
  ...props
}) {
  const generatedId = useId();
  const inputId = name || generatedId;

  return (
    <div data-form-field className={`form-label w-full ${className} ${wrapperClassName}`}>
      {label && (
        <label htmlFor={inputId} className={error ? 'text-[color:var(--form-danger)]' : undefined}>
          {label}{required ? ' *' : ''}
        </label>
      )}

      <AutoGrowTextarea
        id={inputId}
        name={name}
        value={value ?? ''}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        maxRows={maxRows}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : undefined}
        onFocus={onFocus}
        onBlur={onBlur}
        autoComplete={autoComplete ?? 'on'}
        autoCorrect={autoCorrect ?? (supportsWritingAssist ? 'on' : 'off')}
        autoCapitalize={autoCapitalize ?? (supportsWritingAssist ? 'sentences' : 'none')}
        spellCheck={spellCheck ?? supportsWritingAssist}
        {...props}
        className={`form-control floating-input-field min-h-[44px] ${textareaClassName}`}
      />

      {error && <p id={`${inputId}-error`} className='form-error'>{error}</p>}
    </div>
  );
}
