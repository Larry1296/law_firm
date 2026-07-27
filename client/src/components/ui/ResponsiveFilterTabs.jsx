import React from 'react';

export default function ResponsiveFilterTabs({
  tabs,
  activeKey,
  onChange,
  getCount,
  ariaLabel = 'Filters',
  className = '',
}) {
  return (
    <div
      className={`flex flex-wrap justify-center gap-2 ${className}`}
      role='tablist'
      aria-label={ariaLabel}
    >
      {tabs.map((tab) => {
        const isActive = activeKey === tab.key;
        const count = getCount?.(tab) ?? tab.count;

        return (
          <button
            key={tab.key}
            type='button'
            role='tab'
            aria-selected={isActive}
            onClick={() => onChange(tab.key)}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition ${
              isActive
                ? 'border-brand-primary bg-brand-primary text-white shadow-sm'
                : 'border-border-light bg-surface-light text-text-primary-light hover:border-brand-primary dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark'
            }`}
          >
            <span>{tab.label}</span>
            {count !== undefined && count !== null && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
