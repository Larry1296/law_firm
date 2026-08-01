const SUMMARY_CLASS = 'form-validation-summary';
const FIELD_MESSAGE_CLASS = 'form-validation-field-message';

const fieldLabel = (field) => {
  const label = field.id ? document.querySelector(`label[for="${CSS.escape(field.id)}"]`) : null;
  return label?.textContent?.replace(/\s*\*\s*$/, '').trim()
    || field.getAttribute('aria-label')
    || field.name?.replaceAll('_', ' ')
    || 'This field';
};

const expectedExample = (field) => {
  if (field.placeholder && !/^select/i.test(field.placeholder)) return field.placeholder;
  if (field.type === 'email') return 'name@example.com';
  if (field.type === 'tel') return '+254 712 345 678';
  if (field.type === 'url') return 'https://example.com';
  if (field.type === 'date') return '2026-08-15';
  if (field.type === 'time') return '09:30';
  if (field.type === 'number') return field.min ? `${field.min} or greater` : '1000';
  if (field.tagName === 'SELECT') return 'select one of the available options';
  return null;
};

const nativeMessage = (field) => {
  const label = fieldLabel(field);
  const example = expectedExample(field);
  let problem = field.validationMessage;

  if (field.validity.valueMissing) problem = 'is required and cannot be left blank.';
  else if (field.validity.typeMismatch && field.type === 'email') problem = 'must be a valid email address.';
  else if (field.validity.typeMismatch && field.type === 'url') problem = 'must be a complete web address.';
  else if (field.validity.tooShort) problem = `must contain at least ${field.minLength} characters.`;
  else if (field.validity.tooLong) problem = `must contain no more than ${field.maxLength} characters.`;
  else if (field.validity.rangeUnderflow) problem = `must be ${field.min} or greater.`;
  else if (field.validity.rangeOverflow) problem = `must be ${field.max} or less.`;
  else if (field.validity.stepMismatch) problem = `must use increments of ${field.step}.`;
  else if (field.validity.patternMismatch) problem = field.title || 'has an invalid format.';

  return `${label} ${problem}${example ? ` Expected value example: ${example}.` : ''}`;
};

const removeFieldMessage = (field) => {
  field.removeAttribute('aria-invalid');
  field.closest('[data-form-field]')?.classList.remove('form-field-invalid');
  const messageHost = field.closest('[data-form-field]') || field.parentElement;
  const message = messageHost?.querySelector(`:scope > .${FIELD_MESSAGE_CLASS}`);
  message?.remove();
};

const showFieldMessage = (field, message) => {
  field.setAttribute('aria-invalid', 'true');
  field.closest('[data-form-field]')?.classList.add('form-field-invalid');
  const messageHost = field.closest('[data-form-field]') || field.parentElement;
  let node = messageHost?.querySelector(`:scope > .${FIELD_MESSAGE_CLASS}`);
  if (!node) {
    node = document.createElement('p');
    node.className = FIELD_MESSAGE_CLASS;
    messageHost?.append(node);
  }
  node.textContent = message;
};

const customErrorFor = (field) => {
  if (field.getAttribute('aria-invalid') !== 'true') return null;
  const describedId = field.getAttribute('aria-describedby');
  const described = describedId && document.getElementById(describedId)?.textContent?.trim();
  if (described) return described;
  const wrapper = field.closest('[data-form-field]') || field.parentElement?.parentElement;
  return [...(wrapper?.querySelectorAll('p') || [])]
    .map((node) => node.textContent.trim())
    .find(Boolean) || 'contains an invalid value. Check the required format and try again.';
};

const renderSummary = (form, submitter) => {
  const messages = [];
  const controls = [...form.querySelectorAll('input, select, textarea, [aria-invalid="true"]')];

  controls.forEach((field) => {
    if (field.disabled || field.type === 'hidden') return;
    if (field.validity && !field.validity.valid) {
      const message = nativeMessage(field);
      showFieldMessage(field, message);
      messages.push(message);
      return;
    }
    const custom = customErrorFor(field);
    if (custom) messages.push(`${fieldLabel(field)}: ${custom}`);
  });

  form.querySelector(`.${SUMMARY_CLASS}`)?.remove();
  if (!messages.length || !submitter?.isConnected) return;

  const summary = document.createElement('div');
  summary.className = SUMMARY_CLASS;
  summary.setAttribute('role', 'alert');
  summary.innerHTML = `<strong>Please correct ${messages.length === 1 ? 'this error' : 'these errors'}:</strong><ul></ul>`;
  const list = summary.querySelector('ul');
  [...new Set(messages)].forEach((message) => {
    const item = document.createElement('li');
    item.textContent = message;
    list.append(item);
  });
  submitter.insertAdjacentElement('afterend', summary);
};

export const installFormValidationUX = () => {
  if (window.__formValidationUXInstalled) return;
  window.__formValidationUXInstalled = true;

  document.addEventListener('click', (event) => {
    const submitter = event.target.closest('button[type="submit"], input[type="submit"]');
    const form = submitter?.form || submitter?.closest('form');
    if (!form) return;
    form.dataset.validationAttempted = 'true';
    form.__lastSubmitter = submitter;
    setTimeout(() => renderSummary(form, submitter));
  }, true);

  document.addEventListener('invalid', (event) => {
    const field = event.target;
    const form = field.form;
    if (!form) return;
    showFieldMessage(field, nativeMessage(field));
    setTimeout(() => renderSummary(form, form.__lastSubmitter));
  }, true);

  document.addEventListener('input', (event) => {
    const field = event.target;
    if (field.validity?.valid) removeFieldMessage(field);
    if (field.form?.dataset.validationAttempted) {
      setTimeout(() => renderSummary(field.form, field.form.__lastSubmitter));
    }
  }, true);

  const observer = new MutationObserver((records) => {
    const relevantRecords = records.filter((record) => {
      if (record.type === 'attributes') return true;
      const changedNodes = [...record.addedNodes, ...record.removedNodes];
      return changedNodes.some((node) =>
        node.nodeType === Node.ELEMENT_NODE
        && !node.classList.contains(SUMMARY_CLASS)
        && !node.classList.contains(FIELD_MESSAGE_CLASS));
    });
    const forms = new Set(relevantRecords.map((record) => record.target.closest?.('form')).filter(Boolean));
    forms.forEach((form) => {
      if (form.dataset.validationAttempted && !form.__validationRenderQueued) {
        form.__validationRenderQueued = true;
        setTimeout(() => {
          form.__validationRenderQueued = false;
          renderSummary(form, form.__lastSubmitter);
        });
      }
    });
  });
  observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-invalid'] });
};
