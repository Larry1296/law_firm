import { useRef } from 'react';

import PageSectionNav from '@/components/ui/PageSectionNav';
import { sectionLinkClass } from '@/components/ui/sectionLinkClass';

// Tailwind needs whole class names: up to six tabs share one row on a wide screen, more wrap in fours.
const WIDE_COLUMNS = { 1: 'lg:w-full', 2: 'lg:w-1/2', 3: 'lg:w-1/3', 4: 'lg:w-1/4', 5: 'lg:w-1/5', 6: 'lg:w-1/6' };

/**
 * A record page split into tabs, each a page of its own. The tabs and the open tab's section links
 * stay pinned together in one bar while the page scrolls.
 *
 * tabs: [[key, label], ...]; sections: the open tab's [{ id, label, hidden }] (links show when there are two or more).
 */
export default function PageTabs({ tabs, active, onChange, ariaLabel, sections = [], sectionsLabel }) {
  const columns = WIDE_COLUMNS[tabs.length] || 'lg:w-1/4';
  // Marks where the bar sits before it pins, so a new tab can open from its top.
  const start = useRef(null);
  return (
    <>
    <div ref={start} aria-hidden='true' />
    <div className='sticky top-2 z-20 space-y-1.5 rounded-xl border border-border-light bg-surface-light/95 p-1.5 shadow-sm backdrop-blur dark:border-border-dark dark:bg-surface-dark/95'>
      <div role='tablist' aria-label={ariaLabel} className='flex flex-wrap justify-center'>
        {tabs.map(([key, label]) => (
          <div key={key} className={`w-1/2 p-0.5 sm:w-1/3 ${columns}`}>
            <button
              type='button'
              role='tab'
              aria-selected={active === key}
              onClick={() => {
                onChange(key);
                // Scrolled down into a tab, the next one opens from its top rather than part-way down.
                if (start.current && start.current.getBoundingClientRect().top < 0) start.current.scrollIntoView?.({ block: 'start' });
              }}
              className={sectionLinkClass(active === key)}
            >
              {label}
            </button>
          </div>
        ))}
      </div>
      <PageSectionNav
        key={active}
        pinned={false}
        className='border-t border-border-light pt-1.5 dark:border-border-dark'
        ariaLabel={sectionsLabel || `${tabs.find(([key]) => key === active)?.[1] || ''} sections`}
        sections={sections}
      />
    </div>
    </>
  );
}
