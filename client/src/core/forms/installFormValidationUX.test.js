import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { installFormValidationUX } from '@/core/forms/installFormValidationUX';

const wait = () => new Promise((resolve) => setTimeout(resolve));

function buildForm() {
  document.body.innerHTML = `
    <form><input name="policy_version" required /><button type="submit">Save</button></form>`;
  const form = document.querySelector('form');
  form.addEventListener('submit', (event) => event.preventDefault());
  return { form, input: form.querySelector('input'), button: form.querySelector('button') };
}

describe('form validation UX', () => {
  beforeAll(() => installFormValidationUX());
  // Let the global observer see the page emptied while the test document still exists.
  afterAll(async () => { document.body.innerHTML = ''; await wait(); });

  it('flags required fields left empty when submitting', async () => {
    const { form, button } = buildForm();
    button.click();
    await wait();
    expect(form.dataset.validationAttempted).toBe('true');
  });

  it('starts afresh after a successful submit, so a form reset after saving is not shown as errors', async () => {
    const { form, input, button } = buildForm();
    input.value = 'PN-2026-01';
    button.click();
    await wait();
    expect(form.dataset.validationAttempted).toBeUndefined();

    // The page clears the form after saving.
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await wait();
    expect(form.dataset.validationAttempted).toBeUndefined();
    expect(input.getAttribute('aria-invalid')).toBeNull();
    expect(form.querySelector('.form-validation-summary')).toBeNull();
  });
});
