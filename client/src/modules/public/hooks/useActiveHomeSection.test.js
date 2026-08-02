import { describe, expect, it } from 'vitest';

import { HOME_SECTION_CONTEXT, mostVisibleSection } from './useActiveHomeSection';

describe('homepage section context selection', () => {
  it('uses actual homepage anchors and the greatest meaningful visibility', () => {
    expect(HOME_SECTION_CONTEXT.services).toBe('practice_areas');
    expect(mostVisibleSection({ home: 0.2, services: 0.72 }, 'home')).toBe('services');
  });

  it('keeps the current section at close boundaries to avoid flicker', () => {
    expect(mostVisibleSection({ about: 0.48, services: 0.53 }, 'about')).toBe('about');
  });

  it('uses the generic home fallback when no section is meaningfully visible', () => {
    expect(mostVisibleSection({ contact: 0.1 }, 'contact')).toBe('home');
  });
});
