// Capabilities are issued only by an affirmative SWAL result. They are passed
// explicitly to the intended request and consumed once; there is no global
// "recently confirmed" timeout that could approve an unrelated action.
const tickets = new WeakSet();
let context;

export const issueConfirmation = () => {
  const ticket = () => {};
  tickets.add(ticket);
  return ticket;
};

export const consumeConfirmation = (ticket) => {
  if (typeof ticket !== 'function' || !tickets.has(ticket)) return false;
  tickets.delete(ticket);
  return true;
};

export const withCriticalAction = (options, command) => {
  const previous = context;
  context = options;
  try { return command(); }
  finally { context = previous; }
};

export const captureCriticalAction = () => context;

export const withConfirmation = (result, data) => result?.confirmation
  ? { ...data, __sheriaConfirmation: result.confirmation }
  : data;

export const isActionCancelled = (error) => Boolean(error?.isActionCancelled);
