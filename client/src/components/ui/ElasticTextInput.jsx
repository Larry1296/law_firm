import { useLayoutEffect, useRef, useState } from 'react';

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
  autoComplete,
  autoCorrect,
  autoCapitalize,
  spellCheck,
  required = false,
  ...props
}) {
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef(null);
  const hasValue = String(value ?? '').length > 0;

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [value]);

  return (
    <div className={`w-full mb-8 ${className}`}>
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
          id={name}
          name={name}
          value={value ?? ''}
          onChange={onChange}
          placeholder={label ? ' ' : placeholder}
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
            floating-input-field block w-full resize-none overflow-hidden rounded-xl bg-transparent px-4 pb-3 pt-6 leading-6 outline-none
            text-[color:var(--text-primary)] placeholder:text-[color:var(--text-muted)]
            dark:text-slate-100 dark:placeholder:text-slate-400 dark:[color-scheme:dark]
            disabled:cursor-not-allowed
          `}
        />

        {label && (
          <label
            htmlFor={name}
            className={`
              absolute left-4 transition-all duration-200 pointer-events-none
              ${focused || hasValue ? 'top-2 text-xs font-semibold' : 'top-1/2 -translate-y-1/2 text-base'}
              ${focused || hasValue ? 'text-[color:var(--brand-primary)] dark:text-sky-300' : 'text-[color:var(--text-muted)] dark:text-slate-300'}
            `}
          >
            {label}{required ? ' *' : ''}
          </label>
        )}
      </div>

      {error && <p className='mt-2 text-sm text-red-500'>{error}</p>}
    </div>
  );
}
