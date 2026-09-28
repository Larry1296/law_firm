// Other parts of a page open the assistant with openLegalAssistant().
export const OPEN_ASSISTANT_EVENT = 'open-legal-assistant';

export const openLegalAssistant = () => window.dispatchEvent(new Event(OPEN_ASSISTANT_EVENT));
