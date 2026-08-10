import React, { useEffect, useState } from 'react';
import { Building2, Check, UserRound, X } from 'lucide-react';

const CLIENT_TYPES = [
  ['Individual / Natural Person', 'individual', UserRound],
  ['Sole Proprietor / Registered Business', 'sole_proprietorship', Building2],
  ['Company / Corporate Body', 'company', Building2],
  ['Partnership', 'partnership', Building2],
  ['Limited Liability Partnership (LLP)', 'limited_liability_partnership', Building2],
  ['Co-operative Society', 'cooperative', Building2],
  ['Registered Society / Association', 'society_or_association', Building2],
  ['Public Benefit Organization (PBO)', 'non_profit_organization', Building2],
  ['Trust / Trustees', 'trust', Building2],
  ['Estate of a Deceased Person', 'estate', Building2],
  ['Public / Statutory Entity', 'public_entity', Building2],
  ['International Organization', 'international_organization', Building2],
  ['Other — classification review', 'other_requires_review', Building2],
];

export default function ClientCreationChooser({ open, onClose, onSelect }) {
  const [mode, setMode] = useState('portal');

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className='fixed inset-0 z-[100] flex bg-slate-950/70 p-3 backdrop-blur-md sm:p-5'
      role='dialog'
      aria-modal='true'
      aria-labelledby='client-creation-title'
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className='m-auto flex max-h-full w-full max-w-7xl flex-col overflow-hidden rounded-3xl border border-border-light bg-surface-light shadow-2xl dark:border-border-dark dark:bg-surface-dark'>
        <header className='flex shrink-0 items-start justify-between gap-4 border-b border-border-light px-5 py-4 dark:border-border-dark sm:px-7'>
          <div>
            <p className='mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary'>
              New client
            </p>
            <h2
              id='client-creation-title'
              className='text-xl font-bold text-text-primary-light dark:text-text-primary-dark sm:text-2xl'
            >
              Choose the client structure
            </h2>
            <p className='mt-1 text-sm text-text-muted-light dark:text-text-muted-dark'>
              Select access once, then choose the appropriate client type.
            </p>
          </div>

          <button
            type='button'
            onClick={onClose}
            className='rounded-xl border border-border-light p-2 text-text-muted-light transition hover:bg-background-light hover:text-text-primary-light dark:border-border-dark dark:text-text-muted-dark dark:hover:bg-background-dark dark:hover:text-text-primary-dark'
            aria-label='Close client creation chooser'
          >
            <X size={20} />
          </button>
        </header>

        <div className='flex min-h-0 flex-1 flex-col gap-4 p-4 sm:p-6'>
          <div className='grid shrink-0 grid-cols-2 gap-2 rounded-2xl bg-background-light p-1.5 dark:bg-background-dark sm:max-w-lg'>
            {[
              ['portal', 'Portal enabled'],
              ['assisted', 'Staff assisted'],
            ].map(([value, label]) => (
              <button
                key={value}
                type='button'
                onClick={() => setMode(value)}
                className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                  mode === value
                    ? 'bg-primary text-white shadow-lg'
                    : 'text-text-muted-light hover:text-text-primary-light dark:text-text-muted-dark dark:hover:text-text-primary-dark'
                }`}
              >
                {mode === value && <Check size={16} />}
                {label}
              </button>
            ))}
          </div>

          <div className='grid min-h-0 flex-1 auto-rows-fr grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5'>
            {CLIENT_TYPES.map(([label, type, Icon]) => (
              <button
                key={type}
                type='button'
                onClick={() => onSelect(type, mode)}
                className='group flex min-h-0 items-center gap-3 rounded-2xl border border-border-light bg-background-light/50 p-3 text-left transition duration-200 hover:-translate-y-0.5 hover:border-primary hover:bg-primary/5 hover:shadow-lg dark:border-border-dark dark:bg-background-dark/40 dark:hover:border-primary dark:hover:bg-primary/10 sm:flex-col sm:items-start sm:justify-center sm:p-4'
              >
                <span className='grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-white'>
                  {React.createElement(Icon, { size: 18 })}
                </span>
                <span className='text-sm font-semibold leading-tight text-text-primary-light dark:text-text-primary-dark'>
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
