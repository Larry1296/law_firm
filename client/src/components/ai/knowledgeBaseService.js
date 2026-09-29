import axiosInstance from '@/core/api/axios';

// Claude answers first and OpenAI steps in if it fails, so one answer can take two
// model attempts on the server (AI_REQUEST_TIMEOUT each, 20 seconds by default).
const ANSWER_TIMEOUT_MS = 50000;

export async function getKnowledgeBaseCategories(section, signal) {
  const { data } = await axiosInstance.get('/knowledge-base/', {
    params: { section }, signal, timeout: 10000,
  });
  return data.suggestions ?? data.categories?.map((item) => item.suggested_question).filter(Boolean) ?? [];
}

export async function askKnowledgeBase(question, history, section, signal) {
  const { data } = await axiosInstance.post(
    '/knowledge-base/ask/',
    { question, history, page_context: { section } },
    { signal, timeout: ANSWER_TIMEOUT_MS },
  );
  return data;
}

// The platform homepage assistant: the law of Kenya only, never a particular firm.
export async function getLegalAssistantSuggestions(_section, signal) {
  const { data } = await axiosInstance.get('/legal-assistant/', { signal, timeout: 10000 });
  return data.suggestions ?? [];
}

export async function askLegalAssistant(question, history, _section, signal) {
  const { data } = await axiosInstance.post(
    '/legal-assistant/',
    { question, history },
    { signal, timeout: ANSWER_TIMEOUT_MS },
  );
  return data;
}

// Signed-in dashboard assistants: "client", "advocate", "firm" or "platform".
// The server decides who may use each one and what it can see.
export async function getDashboardAssistant(kind, signal) {
  const { data } = await axiosInstance.get(`/assistant/${kind}/`, { signal, timeout: 15000 });
  return data;
}

export async function askDashboardAssistant(kind, question, history, signal) {
  const { data } = await axiosInstance.post(
    `/assistant/${kind}/`,
    { question, history },
    { signal, timeout: ANSWER_TIMEOUT_MS },
  );
  return data;
}
