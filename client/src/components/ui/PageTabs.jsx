import { useEffect, useMemo, useRef } from 'react';

import PageSectionNav from '@/components/ui/PageSectionNav';
import { sectionLinkClass } from '@/components/ui/sectionLinkClass';
import { GOTO_SECTION_EVENT, publishPageSections } from '@/core/navigation/pageSections';

// Tailwind needs whole class names: up to six tabs share one row on a wide screen, more wrap in fours.
const WIDE_COLUMNS = { 1: 'lg:w-full', 2: 'lg:w-1/2', 3: 'lg:w-1/3', 4: 'lg:w-1/4', 5: 'lg:w-1/5', 6: 'lg:w-1/6' };

const visible = (list) => (list || []).filter((section) => section && section.id && section.label && section.hidden !== true);

/**
 * A record page split into tabs, each a page of its own. The tabs and the open tab's section links
 * stay pinned together in one bar while the page scrolls.
 *
 * tabs: [[key, label], ...]; sections: { tabKey: [{ id, label, hidden }] } for every tab (or the open tab's list).
 * Links show only for three or more sections: a tab of one or two parts already names them (e.g. "Addresses & contacts").
 * title names the record (e.g. the matter) for the search box, which can open any tab or section from anywhere;
 * the address #tab-<key> or #<section id> opens that tab, or that section in its tab.
 */
export default function PageTabs({ tabs, active, onChange, ariaLabel, title, sections = [], sectionsLabel }) {
  const columns = WIDE_COLUMNS[tabs.length] || 'lg:w-1/4';
  const byTab = useMemo(() => (Array.isArray(sections) ? { [active]: sections } : sections || {}), [sections, active]);
  // Marks where the bar sits before it pins, so a new tab can open from its top.
  const start = useRef(null);
  const bar = useRef(null);

  const entries = useMemo(() => tabs.flatMap(([key, label]) => [
    { id: `tab-${key}`, label, tab: label, isTab: true },
    ...visible(byTab[key]).map(({ id, label: sectionLabel }) => ({ id, label: sectionLabel, tab: label })),
  ]), [tabs, byTab]);
  const pageTitle = title || ariaLabel || 'Page';
  const entriesKey = JSON.stringify(entries);
  useEffect(() => {
    publishPageSections({ path: window.location.pathname, title: pageTitle, entries: JSON.parse(entriesKey) });
  }, [pageTitle, entriesKey]);

  // Opens a tab or section named in the address or chosen in the search box.
  const latest = useRef({ entries, onChange, tabs });
  useEffect(() => { latest.current = { entries, onChange, tabs }; });
  useEffect(() => {
    let frame = 0;
    const open = (id) => {
      const target = latest.current.entries.find((entry) => entry.id === id);
      if (!target) return;
      const tabKey = target.isTab ? id.slice(4) : latest.current.tabs.find(([, label]) => label === target.tab)?.[0];
      if (tabKey) latest.current.onChange(tabKey);
      cancelAnimationFrame(frame);
      const startedAt = performance.now();
      // The tab renders on the next frames; wait for the section to exist, then bring it just below the bar.
      const reveal = () => {
        const element = target.isTab ? start.current : document.getElementById(id);
        if (!element) {
          if (performance.now() - startedAt < 3000) frame = requestAnimationFrame(reveal);
          return;
        }
        if (!target.isTab && bar.current) {
          const pinnedAt = parseFloat(window.getComputedStyle(bar.current).top) || 0;
          element.style.scrollMarginTop = `${pinnedAt + bar.current.offsetHeight + 16}px`;
        }
        element.scrollIntoView?.({ block: 'start' });
      };
      frame = requestAnimationFrame(reveal);
    };
    const fromAddress = decodeURIComponent(window.location.hash.slice(1));
    if (fromAddress) open(fromAddress);
    const onGoto = (event) => open(event.detail?.id);
    window.addEventListener(GOTO_SECTION_EVENT, onGoto);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener(GOTO_SECTION_EVENT, onGoto);
    };
    // Runs once the page's tabs exist; later choices come through the event.
  }, []);

  return (
    <>
    <div ref={start} aria-hidden='true' />
    <div ref={bar} className='sticky top-2 z-20 space-y-1.5 rounded-xl border border-border-light bg-surface-light/95 p-1.5 shadow-sm backdrop-blur dark:border-border-dark dark:bg-surface-dark/95'>
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
        sections={byTab[active] || []}
        minSections={3}
      />
    </div>
    </>
  );
}
