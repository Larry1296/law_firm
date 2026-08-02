import { Children, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function Select3D({
  label,
  name,
  value,
  onChange,
  options = [],
  placeholder = 'Select an option',
  required = false,
  className = '',
  wrapperClassName = '',
  error,
  children,
  disabled = false,
  multiple = false,
  ...props
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  const childOptions = useMemo(
    () =>
      Children.toArray(children)
        .filter((child) => child?.props)
        .map((child) => ({
          value: child.props.value ?? '',
          label: child.props.children,
          disabled: child.props.disabled,
        })),
    [children],
  );

  const normalizedOptions = useMemo(
    () => [...childOptions, ...options].filter((option) => option && option.value !== undefined),
    [childOptions, options],
  );

  const selectedValues = useMemo(
    () => (multiple && Array.isArray(value) ? value.map(String) : [String(value ?? '')]),
    [multiple, value],
  );
  const selectedOptions = normalizedOptions.filter((option) =>
    selectedValues.includes(String(option.value)),
  );
  const selectedOption = selectedOptions[0];
  const displayValue = multiple
    ? selectedOptions.length
      ? selectedOptions.map((option) => option.label).join(', ')
      : placeholder
    : selectedOption?.label || placeholder;

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!wrapperRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const emitChange = (nextValue) => {
    const selected = normalizedOptions
      .filter((option) =>
        Array.isArray(nextValue)
          ? nextValue.map(String).includes(String(option.value))
          : String(option.value) === String(nextValue),
      )
      .map((option) => ({ value: option.value }));

    onChange?.({
      target: {
        name,
        value: nextValue,
        selectedOptions: selected,
      },
    });
  };

  const handleSelect = (option) => {
    if (option.disabled) return;
    if (multiple) {
      const optionValue = String(option.value);
      const nextValues = selectedValues.includes(optionValue)
        ? selectedValues.filter((current) => current !== optionValue)
        : [...selectedValues.filter(Boolean), optionValue];
      emitChange(nextValues);
      return;
    }
    emitChange(option.value);
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} data-form-field className={`relative w-full space-y-1.5 ${wrapperClassName}`}>
      {label && (
        <label
          htmlFor={name}
          className={`block text-sm font-semibold leading-5 transition-colors ${error ? 'text-error dark:text-red-400' : 'text-text-primary-light dark:text-text-primary-dark'}`}
        >
          {label}{required ? ' *' : ''}
        </label>
      )}

      <button
        id={name}
        type='button'
        disabled={disabled}
        aria-haspopup='listbox'
        aria-expanded={open}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : undefined}
        onClick={() => {
          if (!disabled) setOpen((current) => !current);
        }}
        onBlur={props.onBlur}
        className={`
          flex min-h-11 w-full items-center justify-between rounded-lg border
          bg-white px-3.5 py-2.5 text-left text-sm text-text-primary-light transition
          ${error ? 'border-red-600 text-red-600 dark:border-red-500 dark:text-red-400' : 'border-border-light dark:border-border-dark'}
          dark:bg-slate-950/35 dark:text-text-primary-dark
          focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20
          disabled:cursor-not-allowed disabled:opacity-60
          ${className}
        `}
      >
        <span className={selectedOptions.length ? '' : 'text-text-muted-light dark:text-text-muted-dark'}>
          {displayValue}
        </span>
        <ChevronDown
          aria-hidden='true'
          size={18}
          className={`ml-3 shrink-0 text-text-muted-light transition dark:text-text-muted-dark ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          role='listbox'
          aria-multiselectable={multiple || undefined}
          aria-labelledby={name}
          className='relative z-50 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-border-light bg-surface-light py-2 shadow-xl dark:border-border-dark dark:bg-surface-dark'
        >
          {normalizedOptions.length === 0 && (
            <div className='px-4 py-3 text-sm text-text-muted-light dark:text-text-muted-dark'>
              No options available for the current selections.
            </div>
          )}

          {normalizedOptions.map((option) => (
            <button
              key={`${name}-${option.value}`}
              type='button'
              role='option'
              aria-selected={selectedValues.includes(String(option.value))}
              disabled={option.disabled}
              onClick={() => handleSelect(option)}
              className={`
                block w-full px-4 py-2 text-left text-sm transition
                ${selectedValues.includes(String(option.value))
                  ? 'bg-brand-primary/10 font-semibold text-text-primary-light dark:bg-brand-primary/20 dark:text-text-primary-dark'
                  : 'text-text-primary-light hover:bg-brand-primary/10 dark:text-text-primary-dark'
                }
                disabled:cursor-not-allowed disabled:opacity-50
              `}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {error && <p id={`${name}-error`} className='mt-2 text-sm text-red-500'>{error}</p>}
    </div>
  );
}
