import AutoGrowTextarea from '@/components/ui/AutoGrowTextarea';

export default function Textarea({
  label,
  value,
  onChange,
  placeholder,
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

      <AutoGrowTextarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
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
