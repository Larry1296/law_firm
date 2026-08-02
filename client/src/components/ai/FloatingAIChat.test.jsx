import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import FloatingAIChat from './FloatingAIChat';
import { askKnowledgeBase, getKnowledgeBaseCategories } from './knowledgeBaseService';

vi.mock('./knowledgeBaseService', () => ({
  askKnowledgeBase: vi.fn(),
  getKnowledgeBaseCategories: vi.fn(),
}));

const groundedResponse = {
  answer: 'Article 48 addresses access to justice [Source 1].',
  sources: [{
    title: 'Constitutional access to justice',
    source_name: 'Kenya Law',
    source_url: 'https://new.kenyalaw.org/akn/ke/act/2010/constitution',
    source_reference: 'Article 48',
  }],
  needs_lawyer: false,
};

describe('FloatingAIChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getKnowledgeBaseCategories.mockResolvedValue(['What does access to justice mean?']);
    askKnowledgeBase.mockResolvedValue(groundedResponse);
  });

  async function openChat(user = userEvent.setup()) {
    render(<FloatingAIChat />);
    await user.click(screen.getByRole('button', { name: /open assistant/i }));
    return user;
  }

  it('opens and closes an accessible assistant dialog', async () => {
    const user = await openChat();
    expect(screen.getByRole('dialog', { name: 'Kenyan Legal Information Assistant' })).toBeInTheDocument();
    expect(screen.getByText(/do not submit confidential/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Close assistant' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('sends with Enter, shows loading, prevents duplicates, and renders sources', async () => {
    let resolveRequest;
    askKnowledgeBase.mockReturnValue(new Promise((resolve) => { resolveRequest = resolve; }));
    const user = await openChat();
    const input = screen.getByLabelText('Ask a question');
    await user.type(input, 'What is access to justice?{enter}');
    expect(screen.getByRole('status')).toHaveTextContent('Checking verified sources');
    expect(input).toBeDisabled();
    expect(askKnowledgeBase).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(askKnowledgeBase).toHaveBeenCalledTimes(1);
    resolveRequest(groundedResponse);
    expect(await screen.findByText(/Article 48 addresses/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open official source/i })).toHaveAttribute('href', groundedResponse.sources[0].source_url);
  });

  it('uses Shift+Enter for a newline and the send button submits', async () => {
    const user = await openChat();
    const input = screen.getByLabelText('Ask a question');
    await user.type(input, 'First line{shift>}{enter}{/shift}Second line');
    expect(input).toHaveValue('First line\nSecond line');
    expect(askKnowledgeBase).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Send question' }));
    await waitFor(() => expect(askKnowledgeBase).toHaveBeenCalledWith('First line\nSecond line', expect.any(Array), 'home', expect.any(AbortSignal)));
  });

  it('renders throttling and network errors safely', async () => {
    askKnowledgeBase.mockRejectedValueOnce({ response: { status: 429 } });
    const user = await openChat();
    await user.type(screen.getByLabelText('Ask a question'), 'Question{enter}');
    expect(await screen.findByText(/too many questions/i)).toBeInTheDocument();
  });

  it('resets conversation and supports Escape to close', async () => {
    const user = await openChat();
    await user.type(screen.getByLabelText('Ask a question'), 'Question{enter}');
    expect(await screen.findByText(/Article 48 addresses/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Start a new conversation' }));
    expect(screen.queryByText(/Article 48 addresses/)).not.toBeInTheDocument();
    expect(screen.getByText(/Ask about Kenyan law or the firm/)).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('changes section copy and suggestions without replacing a started conversation', async () => {
    getKnowledgeBaseCategories
      .mockResolvedValueOnce(['What services are published?'])
      .mockResolvedValueOnce(['How do I book a consultation?']);
    const user = userEvent.setup();
    const view = render(<FloatingAIChat activeSection='practice_areas' />);
    expect(screen.getByRole('button', { name: /ask about our practice areas/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /open assistant/i }));
    expect(await screen.findByRole('button', { name: 'What services are published?' })).toBeInTheDocument();
    await user.type(screen.getByLabelText('Ask a question'), 'My question{enter}');
    expect(await screen.findByText(/Article 48 addresses/)).toBeInTheDocument();
    view.rerender(<FloatingAIChat activeSection='contact' />);
    expect(screen.getByText('My question')).toBeInTheDocument();
    expect(screen.getByText(/Article 48 addresses/)).toBeInTheDocument();
  });

  it('does not cancel an in-progress answer when the visible section changes', async () => {
    let resolveRequest;
    askKnowledgeBase.mockReturnValue(new Promise((resolve) => { resolveRequest = resolve; }));
    const user = userEvent.setup();
    const view = render(<FloatingAIChat activeSection='home' />);
    await user.click(screen.getByRole('button', { name: /open assistant/i }));
    await user.type(screen.getByLabelText('Ask a question'), 'Pending question{enter}');
    view.rerender(<FloatingAIChat activeSection='about' />);
    resolveRequest(groundedResponse);
    expect(await screen.findByText(/Article 48 addresses/)).toBeInTheDocument();
  });

  it('falls back safely for an unknown section and includes reduced-motion styling', () => {
    render(<FloatingAIChat activeSection='not-a-section' />);
    const launcher = screen.getByRole('button', { name: /ask a kenyan legal question/i });
    expect(launcher.querySelector('.motion-reduce\\:transition-none')).toBeInTheDocument();
  });
});
