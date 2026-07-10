export default function Select3D({
  label,
  name,
  value,
  onChange,
  options = [],
  placeholder = 'Select an option',
  required = false,
  className = '',
  ...props
}) {
  return (
    <div className='space-y-2'>
      {label && (
        <label
          htmlFor={name}
          className='block text-sm font-medium text-text-primary-light dark:text-text-primary-dark'
        >
          {label}
        </label>
      )}

      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className={`
          w-full
          h-12
          rounded-2xl
          border
          border-border-light
          dark:border-border-dark
          bg-surface-light
          dark:bg-surface-dark
          text-text-primary-light
          dark:text-text-primary-dark
          px-4
          shadow-soft
          transition-all
          focus:outline-none
          focus:ring-2
          focus:ring-brand-primary
          focus:border-brand-primary
          ${className}
        `}
        {...props}
      >
        <option value=''>{placeholder}</option>

        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
