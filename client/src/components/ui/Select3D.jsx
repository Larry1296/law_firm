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
  error,
  children,
  disabled = false,
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

  const selectedOption = normalizedOptions.find((option) => String(option.value) === String(value ?? ''));
  const displayValue = selectedOption?.label || placeholder;

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
    onChange?.({
      target: {
        name,
        value: nextValue,
      },
    });
  };

  const handleSelect = (option) => {
    if (option.disabled) return;
    emitChange(option.value);
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className='relative w-full mb-8'>
      {label && (
        <label
          htmlFor={name}
          className='block pb-2 text-sm font-semibold text-text-primary-light dark:text-text-primary-dark'
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
        onClick={() => {
          if (!disabled) setOpen((current) => !current);
        }}
        onBlur={props.onBlur}
        className={`
          flex h-12 min-h-12 w-full items-center justify-between rounded-2xl border
          border-border-light bg-surface-light px-4 py-0 text-left
          text-text-primary-light shadow-soft transition-all
          dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark
          focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary
          disabled:cursor-not-allowed disabled:opacity-60
          ${className}
        `}
      >
        <span className={selectedOption ? '' : 'text-text-muted-light dark:text-text-muted-dark'}>
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
              aria-selected={String(option.value) === String(value ?? '')}
              disabled={option.disabled}
              onClick={() => handleSelect(option)}
              className={`
                block w-full px-4 py-2 text-left text-sm transition
                ${String(option.value) === String(value ?? '')
                  ? 'bg-brand-primary/10 font-semibold text-brand-primary'
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

      {error && <p className='mt-2 text-sm text-red-500'>{error}</p>}
    </div>
  );
}
