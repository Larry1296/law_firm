import { useId, useLayoutEffect, useRef, useState } from 'react';

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
  minRows = 1,
  alwaysShowLabel = false,
  wrapperClassName = '',
  textareaClassName = '',
  autoComplete,
  autoCorrect,
  autoCapitalize,
  spellCheck,
  required = false,
  ...props
}) {
  const [focused, setFocused] = useState(false);
  const generatedId = useId();
  const inputId = name || generatedId;
  const textareaRef = useRef(null);
  const hasValue = String(value ?? '').length > 0;
  const showTopLabel = label && (alwaysShowLabel || focused || hasValue);
  const textareaPlaceholder = label && !focused && !hasValue ? label : placeholder;

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [value]);

  return (
    <div data-form-field className={`w-full mb-8 ${className} ${wrapperClassName}`}>
      <div className='min-h-[1.75rem]'>
        {showTopLabel && (
          <label
            htmlFor={inputId}
            className={`block pb-1 text-base italic font-bold tracking-wide transition-colors ${error ? 'text-red-600 dark:text-red-400' : 'text-[color:var(--text-muted)]'}`}
          >
            {label}{required ? ' *' : ''}
          </label>
        )}
      </div>

      <div
        className={`
          relative w-full border-0 border-b transition-colors duration-200
          bg-transparent ${error ? 'border-red-600' : 'border-[color:var(--border)]'}
          ${focused && !error ? 'border-[color:var(--brand-primary)]' : ''}
          ${disabled ? 'opacity-60 cursor-not-allowed' : ''}
        `}
      >
        <textarea
          ref={textareaRef}
          id={inputId}
          name={name}
          value={value ?? ''}
          onChange={onChange}
          placeholder={textareaPlaceholder}
          disabled={disabled}
          rows={minRows}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoComplete={autoComplete ?? 'on'}
          autoCorrect={autoCorrect ?? (supportsWritingAssist ? 'on' : 'off')}
          autoCapitalize={autoCapitalize ?? (supportsWritingAssist ? 'sentences' : 'none')}
          spellCheck={spellCheck ?? supportsWritingAssist}
          {...props}
          className={`
            floating-input-field block w-full resize-none overflow-y-hidden rounded-none bg-transparent px-0 py-3 leading-6 outline-none
            text-[color:var(--text-primary)] placeholder:font-normal placeholder:text-[color:var(--text-muted)] placeholder:opacity-70
            ${textareaClassName}
            dark:text-slate-100 dark:placeholder:text-slate-400 dark:[color-scheme:dark]
            disabled:cursor-not-allowed aria-[invalid=true]:placeholder:text-red-500
          `}
        />
      </div>

      {error && <p id={`${inputId}-error`} className='mt-2 text-sm text-red-500'>{error}</p>}
    </div>
  );
}
