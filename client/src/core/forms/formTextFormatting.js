const TECHNICAL_FIELD_PATTERN = /(email|password|username|phone|telephone|mobile|url|website|pin|identifier|identification|national_id|passport|registration_number|reference|case_number|postal_code|code|number|percentage|amount|date|time)/i;

const NARRATIVE_FIELD_PATTERN = /(description|instructions|summary|notes|reason|details|facts|outcome|objectives|purpose|nature|scope|history|background|address|street|locality|findings|explanation|remarks|content|message|terms|conditions)/i;

const LOWERCASE_CONNECTORS = new Set([
  'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'from', 'in', 'nor',
  'of', 'on', 'or', 'per', 'the', 'to', 'via', 'with',
]);

export const toTitleCase = (value) => String(value ?? '').replace(
  /\S+/g,
  (word, offset) => {
    if (/^[A-Z0-9&./'’-]+$/.test(word) && /[A-Z]/.test(word)) return word;

    const normalized = word.toLocaleLowerCase();
    if (offset > 0 && LOWERCASE_CONNECTORS.has(normalized)) return normalized;

    return normalized.replace(
      /(^|[-'’])(\p{L})/gu,
      (_, boundary, letter) => `${boundary}${letter.toLocaleUpperCase()}`,
    );
  },
);

export const shouldTitleCaseInput = ({
  name = '',
  type = 'text',
  format = 'auto',
}) => {
  if (format === 'none' || format === 'sentence') return false;
  if (format === 'title') return true;
  if (type !== 'text') return false;
  if (!name) return false;
  if (TECHNICAL_FIELD_PATTERN.test(name)) return false;
  if (NARRATIVE_FIELD_PATTERN.test(name)) return false;
  return true;
};

export const formattedInputEvent = (event, value) => ({
  target: {
    name: event.target.name,
    type: event.target.type,
    value,
  },
  currentTarget: {
    name: event.currentTarget.name,
    type: event.currentTarget.type,
    value,
  },
});
