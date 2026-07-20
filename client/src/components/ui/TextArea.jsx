export default function Textarea({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
  autoComplete = 'on',
  autoCorrect = 'on',
  autoCapitalize = 'sentences',
  spellCheck = true,
  ...props
}) {
  return (
    <div className='space-y-2'>
      {label && (
        <label className='text-sm font-semibold text-[color:var(--text-primary)]'>
          {label}
        </label>
      )}

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        autoComplete={autoComplete}
        autoCorrect={autoCorrect}
        autoCapitalize={autoCapitalize}
        spellCheck={spellCheck}
        {...props}
        className='
          w-full px-3 py-2
          border border-[color:var(--border)]
          rounded-lg
          shadow-sm
          bg-[color:var(--surface-raised)]
          text-[color:var(--text-primary)]
          placeholder:text-[color:var(--text-muted)]
          focus:outline-none
          focus:ring-2 focus:ring-[color:var(--brand-primary)]
          focus:border-[color:var(--brand-primary)]
          transition
          resize-none
        '
      />
    </div>
  );
}
