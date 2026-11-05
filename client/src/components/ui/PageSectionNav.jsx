import { useEffect, useMemo, useRef, useState } from 'react';

import { sectionLinkClass } from '@/components/ui/sectionLinkClass';

// How long a clicked link stays active while the page scrolls to it, so a short last section is not overtaken.
const CLICK_HOLD_MS = 900;

// topClass sets where the bar pins; pages under a fixed site header pin it below that header.
// pinned={false} renders the links bare, for a page that pins them inside its own bar (e.g. under its tabs).
export default function PageSectionNav({ sections, ariaLabel = 'Page sections', className = '', topClass = 'top-2', pinned = true }) {
  const visibleSections = useMemo(
    () => sections.filter((section) => section && section.id && section.label && section.hidden !== true),
    [sections],
  );
  const [activeSection, setActiveSection] = useState(visibleSections[0]?.id || '');
  const navRef = useRef(null);
  const heldUntil = useRef(0);

  // The active link follows the scroll: the last section whose top has passed under the bar.
  useEffect(() => {
    const update = () => {
      if (performance.now() < heldUntil.current) return;
      const targets = visibleSections
        .map(({ id }) => ({ id, element: document.getElementById(id) }))
        .filter(({ element }) => element);
      if (!targets.length) return;
      const bar = navRef.current?.closest('.sticky') || navRef.current;
      const line = (bar?.getBoundingClientRect().bottom ?? 0) + 24;
      let current = targets[0].id;
      targets.forEach(({ id, element }) => {
        if (element.getBoundingClientRect().top <= line) current = id;
      });
      // At the foot of the page the last section cannot reach the bar, so it becomes active once fully shown.
      const last = targets[targets.length - 1];
      const scrolled = targets[0].element.getBoundingClientRect().top <= line;
      if (scrolled && last.element.getBoundingClientRect().bottom <= window.innerHeight + 2) current = last.id;
      setActiveSection(current);
    };
    const frame = requestAnimationFrame(update);
    document.addEventListener('scroll', update, { capture: true, passive: true });
    window.addEventListener('resize', update);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('scroll', update, { capture: true });
      window.removeEventListener('resize', update);
    };
  }, [visibleSections]);

  if (visibleSections.length < 2) return null;

  const scrollToSection = (event, sectionId) => {
    event.preventDefault();
    const target = document.getElementById(sectionId);
    if (!target) return;
    // Land the section just below the bar, however many rows of links it has.
    // The pinned bar is this nav, or the page's own bar it sits in.
    const bar = navRef.current?.closest('.sticky') || navRef.current;
    const pinnedAt = bar ? parseFloat(window.getComputedStyle(bar).top) || 0 : 0;
    target.style.scrollMarginTop = `${pinnedAt + (bar?.offsetHeight || 0) + 16}px`;
    const reduceMotion = typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    heldUntil.current = event.timeStamp + CLICK_HOLD_MS;
    target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    window.history.replaceState(null, '', `#${sectionId}`);
    setActiveSection(sectionId);
  };

  return (
    // Sections sit in even columns in page order, a part-filled last row centred, and stay in view while scrolling.
    <nav ref={navRef} aria-label={ariaLabel} className={`${pinned ? `sticky ${topClass} z-20 rounded-xl border border-border-light bg-surface-light/95 p-1.5 shadow-sm backdrop-blur dark:border-border-dark dark:bg-surface-dark/95` : ''} flex flex-wrap justify-center ${className}`}>
      {visibleSections.map(({ id, label }) => (
        <div key={id} className='w-1/2 p-0.5 sm:w-1/3 lg:w-1/4'>
          <a
            href={`#${id}`}
            onClick={(event) => scrollToSection(event, id)}
            aria-current={activeSection === id ? 'location' : undefined}
            className={sectionLinkClass(activeSection === id)}
          >
            {label}
          </a>
        </div>
      ))}
    </nav>
  );
}
