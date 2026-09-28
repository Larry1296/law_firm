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
        className='form-control w-full resize-none'
      />
    </div>
  );
}
