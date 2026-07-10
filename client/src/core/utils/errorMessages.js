const humanizeField = (field) =>
  String(field || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const valueToMessage = (value) => {
  if (!value) return '';

  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(valueToMessage).filter(Boolean).join(' ');
  }

  if (typeof value === 'object') {
    return Object.entries(value)
      .map(([field, messages]) => {
        const message = valueToMessage(messages);
        return message ? `${humanizeField(field)}: ${message}` : '';
      })
      .filter(Boolean)
      .join('\n');
  }

  return String(value);
};

export const getApiErrorMessage = (
  error,
  fallback = 'Something went wrong. Please try again.',
) => {
  const data = error?.response?.data;

  if (!data) {
    return error?.message || fallback;
  }

  const message =
    valueToMessage(data.message) ||
    valueToMessage(data.detail) ||
    valueToMessage(data.errors) ||
    valueToMessage(data.non_field_errors) ||
    valueToMessage(data);

  return message || fallback;
};

export const attachApiErrorMessage = (error) => {
  if (error) {
    error.userMessage = getApiErrorMessage(error);
  }

  return error;
};
