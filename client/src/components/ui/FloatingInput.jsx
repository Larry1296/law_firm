import { useState, useContext } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import ThemeContext from '@/core/store/ThemeContext';

export default function FloatingInput({
  label,
  type = 'text',
  value,
  onChange,
  name,
  placeholder = '',
  error,
  disabled = false,
  className = '',
  noFloat = false,
  ...props
}) {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { theme } = useContext(ThemeContext);

  const isPassword = type === 'password';
  const isDate = type === 'date';

  const inputType = isPassword && showPassword ? 'text' : type;

  const shouldFloat = !noFloat && !isDate;

  const bgClass = theme === 'dark' ? 'bg-gray-800' : 'bg-white';
  const borderClass = theme === 'dark' ? 'border-gray-600' : 'border-gray-300';
  const textClass = theme === 'dark' ? 'text-white' : 'text-gray-900';

  return (
    <div className={`w-full mb-6 ${className}`}>
      {/* FIXED LABEL (always on top for noFloat OR date) */}
      {label && (noFloat || isDate) && (
        <label
          htmlFor={name}
          className='block mb-2 text-sm font-medium text-gray-700 dark:text-gray-200'
        >
          {label}
        </label>
      )}

      {/* INPUT WRAPPER */}
      <div
        className={`
          relative w-full rounded-xl border transition-all duration-200
          ${bgClass} ${borderClass}
          shadow-sm
          ${focused ? 'shadow-md' : ''}
          ${disabled ? 'opacity-60 cursor-not-allowed' : ''}
        `}
      >
        {/* INPUT */}
        <input
          id={name}
          name={name}
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder={shouldFloat ? ' ' : placeholder}
          disabled={disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
          className={`
            w-full px-4 py-4 rounded-xl bg-transparent outline-none
            ${textClass}
          `}
        />

        {/* FLOATING LABEL */}
        {label && shouldFloat && (
          <label
            htmlFor={name}
            className={`
              absolute left-4 transition-all duration-200 pointer-events-none
              ${
                focused || value
                  ? '-top-3 text-sm font-semibold'
                  : 'top-1/2 text-base'
              }
              ${focused || value ? 'text-brand-primary' : 'text-gray-400'}
              transform -translate-y-1/2
            `}
          >
            {label}
          </label>
        )}

        {/* PASSWORD TOGGLE */}
        {isPassword && (
          <button
            type='button'
            onClick={() => setShowPassword(!showPassword)}
            className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600'
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        )}
      </div>

      {/* ERROR */}
      {error && <p className='mt-1 text-sm text-red-500'>{error}</p>}
    </div>
  );
}
