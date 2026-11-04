import { useEffect, useMemo, useState } from 'react';

export default function PageSectionNav({ sections, ariaLabel = 'Page sections', className = '' }) {
  const visibleSections = useMemo(
    () => sections.filter((section) => section && section.id && section.label && section.hidden !== true),
    [sections],
  );
  const [activeSection, setActiveSection] = useState(visibleSections[0]?.id || '');

  useEffect(() => {
    const targets = visibleSections
      .map(({ id }) => document.getElementById(id))
      .filter(Boolean);
    if (!targets.length) return undefined;
    if (typeof IntersectionObserver === 'undefined') return undefined;

    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActiveSection(visible.target.id);
    }, { rootMargin: '-18% 0px -65% 0px', threshold: [0, 0.1, 0.25, 0.5] });

    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [visibleSections]);

  if (visibleSections.length < 2) return null;

  const scrollToSection = (event, sectionId) => {
    event.preventDefault();
    const target = document.getElementById(sectionId);
    if (!target) return;
    const reduceMotion = typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    window.history.replaceState(null, '', `#${sectionId}`);
    setActiveSection(sectionId);
  };

  return (
    // Sections sit in even columns; a part-filled last row is centred.
    <nav aria-label={ariaLabel} className={`flex flex-wrap justify-center rounded-xl border border-border-light bg-surface-light p-1.5 shadow-sm dark:border-border-dark dark:bg-surface-dark ${className}`}>
      {visibleSections.map(({ id, label }) => (
        <div key={id} className='w-1/2 p-0.5 sm:w-1/3 lg:w-1/4'>
          <a
            href={`#${id}`}
            onClick={(event) => scrollToSection(event, id)}
            aria-current={activeSection === id ? 'location' : undefined}
            className={`block rounded-lg px-3 py-2 text-center text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${activeSection === id ? 'bg-brand-primary text-white shadow-sm' : 'text-text-primary-light hover:bg-slate-100 dark:text-text-primary-dark dark:hover:bg-slate-800'}`}
          >
            {label}
          </a>
        </div>
      ))}
    </nav>
  );
}
