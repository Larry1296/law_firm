import axiosInstance from '@/core/api/axios';

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
    { signal, timeout: 25000 },
  );
  return data;
}
