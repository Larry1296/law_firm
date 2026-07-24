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
    <div className={`w-full mb-8 ${className} ${wrapperClassName}`}>
      <div className='min-h-[1.75rem]'>
        {showTopLabel && (
          <label
            htmlFor={inputId}
            className='block pb-2 text-sm font-semibold text-[color:var(--text-primary)] dark:text-slate-100'
          >
            {label}{required ? ' *' : ''}
          </label>
        )}
      </div>

      <div
        className={`
          relative w-full rounded-xl border transition-all duration-200
          bg-[color:var(--surface-raised)] border-[color:var(--border)]
          shadow-sm
          ${focused ? 'shadow-md border-[color:var(--brand-primary)]' : ''}
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
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoComplete={autoComplete ?? 'on'}
          autoCorrect={autoCorrect ?? (supportsWritingAssist ? 'on' : 'off')}
          autoCapitalize={autoCapitalize ?? (supportsWritingAssist ? 'sentences' : 'none')}
          spellCheck={spellCheck ?? supportsWritingAssist}
          {...props}
          className={`
            floating-input-field block w-full resize-none overflow-y-hidden rounded-xl bg-transparent px-4 py-4 leading-6 outline-none
            text-[color:var(--text-primary)] placeholder:font-normal placeholder:text-[color:var(--text-muted)] placeholder:opacity-70
            ${textareaClassName}
            dark:text-slate-100 dark:placeholder:text-slate-400 dark:[color-scheme:dark]
            disabled:cursor-not-allowed
          `}
        />
      </div>

      {error && <p className='mt-2 text-sm text-red-500'>{error}</p>}
    </div>
  );
}
