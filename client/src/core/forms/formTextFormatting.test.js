import { describe, expect, it } from 'vitest';

import { shouldTitleCaseInput, toTitleCase } from './formTextFormatting';

describe('form text formatting', () => {
  it('title-cases ordinary names while preserving uppercase acronyms', () => {
    expect(toTitleCase('mercy wanjiku njeri')).toBe('Mercy Wanjiku Njeri');
    expect(toTitleCase('nairobi NGO justice initiative')).toBe(
      'Nairobi NGO Justice Initiative',
    );
  });

  it('keeps short connecting words lowercase inside a title', () => {
    expect(toTitleCase('ministry of justice and legal affairs')).toBe(
      'Ministry of Justice and Legal Affairs',
    );
  });

  it('formats ordinary text fields but excludes narrative and technical fields', () => {
    expect(shouldTitleCaseInput({ name: 'full_name', type: 'text' })).toBe(true);
    expect(shouldTitleCaseInput({ name: 'role_title', type: 'text' })).toBe(true);
    expect(shouldTitleCaseInput({ name: 'objectives', type: 'text' })).toBe(false);
    expect(shouldTitleCaseInput({ name: 'email', type: 'email' })).toBe(false);
    expect(shouldTitleCaseInput({ name: 'registration_number', type: 'text' })).toBe(false);
  });

  it('supports explicit per-field overrides', () => {
    expect(shouldTitleCaseInput({ name: 'custom', type: 'text', format: 'none' })).toBe(false);
    expect(shouldTitleCaseInput({ name: 'description', type: 'text', format: 'title' })).toBe(true);
  });
});
