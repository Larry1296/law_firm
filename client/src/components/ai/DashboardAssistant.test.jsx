import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import DashboardAssistant from './DashboardAssistant';
import { askDashboardAssistant, getDashboardAssistant } from './knowledgeBaseService';

vi.mock('./knowledgeBaseService', () => ({
  askDashboardAssistant: vi.fn(),
  getDashboardAssistant: vi.fn(),
  askKnowledgeBase: vi.fn(),
  askLegalAssistant: vi.fn(),
  getKnowledgeBaseCategories: vi.fn(),
  getLegalAssistantSuggestions: vi.fn(),
}));

describe('DashboardAssistant', () => {
  beforeEach(() => vi.clearAllMocks());

  it('stays hidden when the server says this user may not use it', async () => {
    getDashboardAssistant.mockResolvedValue({ available: false, reason: 'Your account does not include AI tools.' });
    render(<DashboardAssistant kind='advocate' />);

    await waitFor(() => expect(getDashboardAssistant).toHaveBeenCalledWith('advocate', expect.anything()));
    expect(screen.queryByRole('button', { name: /Open assistant/ })).not.toBeInTheDocument();
  });

  it('opens with the server’s copy and sends questions to that assistant only', async () => {
    getDashboardAssistant.mockResolvedValue({
      available: true,
      title: 'Your matter assistant',
      subtitle: 'Answers from your own matters with the firm',
      welcome: 'Hello! I can explain where your matters stand.',
      suggestions: ['When is my next court date?'],
    });
    askDashboardAssistant.mockResolvedValue({ answer: 'Your hearing is on **Tuesday 6 October 2026**.', sources: [], records_only: false });
    const user = userEvent.setup();
    render(<DashboardAssistant kind='client' />);

    await user.click(await screen.findByRole('button', { name: 'Open assistant: Ask about my matters' }));
    expect(screen.getByRole('dialog', { name: 'Your matter assistant' })).toBeInTheDocument();
    expect(screen.getByText('Hello! I can explain where your matters stand.')).toBeInTheDocument();
    expect(screen.getByText(/Your advocate has the final word/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'When is my next court date?' }));
    expect(askDashboardAssistant).toHaveBeenCalledWith('client', 'When is my next court date?', expect.any(Array), expect.anything());
    expect(await screen.findByText('Tuesday 6 October 2026')).toBeInTheDocument();
  });
});
