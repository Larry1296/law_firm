import { useEffect, useMemo, useRef, useState } from 'react';

// How long a clicked link stays active while the page scrolls to it, so a short last section is not overtaken.
const CLICK_HOLD_MS = 900;

export default function PageSectionNav({ sections, ariaLabel = 'Page sections', className = '' }) {
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
      const line = (navRef.current?.getBoundingClientRect().bottom ?? 0) + 24;
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
    target.style.scrollMarginTop = `${(navRef.current?.offsetHeight || 0) + 16}px`;
    const reduceMotion = typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    heldUntil.current = event.timeStamp + CLICK_HOLD_MS;
    target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    window.history.replaceState(null, '', `#${sectionId}`);
    setActiveSection(sectionId);
  };

  return (
    // Sections sit in even columns in page order, a part-filled last row centred, and stay in view while scrolling.
    <nav ref={navRef} aria-label={ariaLabel} className={`sticky top-2 z-20 flex flex-wrap justify-center rounded-xl border border-border-light bg-surface-light/95 p-1.5 shadow-sm backdrop-blur dark:border-border-dark dark:bg-surface-dark/95 ${className}`}>
      {visibleSections.map(({ id, label }) => (
        <div key={id} className='w-1/2 p-0.5 sm:w-1/3 lg:w-1/4'>
          <a
            href={`#${id}`}
            onClick={(event) => scrollToSection(event, id)}
            aria-current={activeSection === id ? 'location' : undefined}
            className={`block rounded-lg border px-3 py-2 text-center text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${activeSection === id ? 'border-brand-primary bg-brand-primary text-white shadow-sm' : 'border-brand-primary/30 bg-brand-primary/5 text-brand-primary underline-offset-4 hover:border-brand-primary/60 hover:bg-brand-primary/10 hover:underline'}`}
          >
            {label}
          </a>
        </div>
      ))}
    </nav>
  );
}
