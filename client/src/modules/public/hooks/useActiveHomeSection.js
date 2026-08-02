import { useEffect, useState } from 'react';

export const HOME_SECTION_CONTEXT = Object.freeze({
  home: 'home',
  about: 'about',
  services: 'practice_areas',
  'how-it-works': 'consultation',
  features: 'home',
  cta: 'consultation',
  testimonials: 'about',
  contact: 'contact',
});

export function mostVisibleSection(ratios, current = 'home') {
  const visible = Object.entries(ratios)
    .filter(([, ratio]) => ratio >= 0.18)
    .sort((left, right) => right[1] - left[1]);
  if (!visible.length) return 'home';
  const [candidate, candidateRatio] = visible[0];
  const currentRatio = ratios[current] ?? 0;
  // Keep the current context near a boundary unless another section is clearly stronger.
  return candidate !== current && candidateRatio < currentRatio + 0.08 ? current : candidate;
}

export default function useActiveHomeSection() {
  const [activeSection, setActiveSection] = useState('home');

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined;
    const ratios = {};
    let current = 'home';
    let timer;
    const elements = Object.keys(HOME_SECTION_CONTEXT)
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        ratios[entry.target.id] = entry.isIntersecting ? entry.intersectionRatio : 0;
      });
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const pageSection = mostVisibleSection(ratios, current);
        current = pageSection;
        setActiveSection(HOME_SECTION_CONTEXT[pageSection] ?? 'home');
      }, 140);
    }, { threshold: [0.18, 0.3, 0.5, 0.7], rootMargin: '-8% 0px -12% 0px' });

    elements.forEach((element) => observer.observe(element));
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  return activeSection;
}
