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
  disclaimer: 'General legal information only—not legal advice.',
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
    expect(screen.getByRole('dialog', { name: 'Chat with this Firm legal assistant' })).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveClass('h-[min(600px,calc(100dvh-13rem))]');
    expect(screen.getByRole('button', { name: 'Close assistant' }).parentElement).toHaveClass('shrink-0');
    expect(screen.getByText(/do not submit confidential/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Close assistant' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('maximizes, minimizes, and closes when clicking outside', async () => {
    const user = await openChat();
    const dialog = screen.getByRole('dialog');
    await user.click(screen.getByRole('button', { name: 'Maximize assistant' }));
    expect(dialog).toHaveClass('lg:w-[min(50vw,800px)]');
    await user.click(screen.getByRole('button', { name: 'Minimize assistant' }));
    expect(dialog).toHaveClass('sm:w-[430px]');
    fireEvent.pointerDown(document.body);
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
    expect(screen.getByText(/Ask about the firm or a general legal topic/)).toBeInTheDocument();
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
    const launcher = screen.getByRole('button', { name: /hi! how can i help you/i });
    expect(launcher.querySelector('.motion-reduce\\:transition-none')).toBeInTheDocument();
  });

  it('accepts reusable title, subtitle, launcher, and suggestion copy', async () => {
    const user = userEvent.setup();
    render(<FloatingAIChat title='Matter assistant' subtitle='Answers for this matter' launcherLabel='Ask Sheria' suggestions={['Summarize this matter']} />);
    await user.click(screen.getByRole('button', { name: /open assistant: ask sheria/i }));
    expect(screen.getByRole('dialog', { name: 'Matter assistant' })).toBeInTheDocument();
    expect(screen.getByText('Answers for this matter')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Summarize this matter' })).toBeInTheDocument();
    expect(getKnowledgeBaseCategories).not.toHaveBeenCalled();
  });

  it('renders supported Markdown safely with sources below the answer', async () => {
    askKnowledgeBase.mockResolvedValueOnce({
      answer: 'You can contact the firm through:\n\n- **Telephone:** +254 700 000 000\n- **Website:** [primelaw.com](https://primelaw.com)\n\n<script>alert(1)</script> [unsafe](javascript:alert(1))',
      sources: [{ title: 'Kulecho & Co Advocates contact information', source_name: 'Kulecho & Co Advocates', source_url: '' }],
      needs_lawyer: false,
      disclaimer: '',
    });
    const user = await openChat();
    await user.type(screen.getByLabelText('Ask a question'), 'How can I contact the firm?{enter}');
    expect(await screen.findByRole('list')).toBeInTheDocument();
    expect(screen.getByText('Telephone:').tagName).toBe('STRONG');
    expect(screen.getByRole('link', { name: 'primelaw.com' })).toHaveAttribute('href', 'https://primelaw.com');
    expect(screen.queryByRole('link', { name: 'unsafe' })).not.toBeInTheDocument();
    expect(document.querySelector('script')).not.toBeInTheDocument();
    expect(screen.getByText('Kulecho & Co Advocates contact information')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /speak to an advocate/i })).not.toBeInTheDocument();
  });

  it('shows a legal disclaimer and escalation only when returned by the backend', async () => {
    askKnowledgeBase.mockResolvedValueOnce({ ...groundedResponse, needs_lawyer: true });
    const user = await openChat();
    await user.type(screen.getByLabelText('Ask a question'), 'What applies to my dispute?{enter}');
    expect(await screen.findByText(/General legal information only/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /speak to an advocate/i })).toBeInTheDocument();
  });
});
