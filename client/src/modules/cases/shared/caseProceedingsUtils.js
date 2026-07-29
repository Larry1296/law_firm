const finalStatuses = new Set(['COMPLETED', 'CONCLUDED', 'CANCELLED']);

export const currentProceeding = (events = []) =>
  [...events]
    .filter((event) => !finalStatuses.has(event.status))
    .sort((left, right) => new Date(left.starts_at) - new Date(right.starts_at))[0] || null;
