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

  return (
    <div className='space-y-2'>
      {label && (
        <label
          htmlFor={name}
          className='block text-sm font-medium text-gray-700 dark:text-gray-300'
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
        placeholder={placeholder}
        autoComplete={autoComplete ?? (type === 'password' ? 'current-password' : 'on')}
        autoCorrect={autoCorrect ?? (supportsWritingAssist ? 'on' : 'off')}
        autoCapitalize={autoCapitalize ?? (supportsWritingAssist ? 'sentences' : 'none')}
        spellCheck={spellCheck ?? supportsWritingAssist}
        className={`
          w-full
          px-4
          py-3
          rounded-xl
          border
          bg-surface-light
          dark:bg-surface-dark
          border-border-light
          dark:border-border-dark
          text-gray-900
          dark:text-white
          placeholder:text-gray-400
          dark:placeholder:text-slate-500
          shadow-soft
          transition-all
          duration-200

          focus:outline-none
          focus:ring-2
          focus:ring-brand-primary
          focus:border-brand-primary

          disabled:opacity-60
          disabled:cursor-not-allowed

          ${className}
        `}
        {...rest}
      />
    </div>
  );
}
