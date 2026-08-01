import {
  formattedInputEvent,
  shouldTitleCaseInput,
  toTitleCase,
} from '@/core/forms/formTextFormatting';

export default function Input({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = 'text',
  className = '',
  autoComplete,
  autoCorrect,
  autoCapitalize,
  spellCheck,
  error,
  format = 'auto',
  onBlur,
  ...rest
}) {
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
    <div data-form-field className='space-y-1'>
      {label && (
        <label
          htmlFor={name}
          className={`block text-base italic font-bold tracking-wide ${error ? 'text-red-600 dark:text-red-400' : 'text-[color:var(--text-muted)]'}`}
        >
          {label}
        </label>
      )}

      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        onBlur={(event) => {
          if (titleCaseOnBlur) {
            const formattedValue = toTitleCase(event.currentTarget.value);
            if (formattedValue !== event.currentTarget.value) {
              onChange?.(formattedInputEvent(event, formattedValue));
            }
          }
          onBlur?.(event);
        }}
        placeholder={placeholder}
        autoComplete={autoComplete ?? (type === 'password' ? 'current-password' : 'on')}
        autoCorrect={autoCorrect ?? (supportsWritingAssist ? 'on' : 'off')}
        autoCapitalize={autoCapitalize ?? (supportsWritingAssist ? 'sentences' : 'none')}
        spellCheck={spellCheck ?? supportsWritingAssist}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : undefined}
        className={`
          w-full
          px-0
          py-3
          rounded-none
          border-0 border-b
          bg-transparent
          dark:bg-transparent
          ${error ? 'border-red-600 placeholder:text-red-500' : 'border-border-light dark:border-border-dark'}
          text-[color:var(--text-primary)]
          placeholder:text-[color:var(--text-muted)]
          transition-all
          duration-200

          focus:outline-none
          focus:border-brand-primary

          disabled:opacity-60
          disabled:cursor-not-allowed

          ${className}
        `}
        {...rest}
      />
      {error && <p id={`${name}-error`} className='text-sm text-red-500'>{error}</p>}
    </div>
  );
}
