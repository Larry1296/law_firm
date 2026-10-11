import '@testing-library/jest-dom/vitest';
import { act, render, screen } from '@testing-library/react';
import { ShieldCheck } from 'lucide-react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import AuthShowcase from './AuthShowcase';

describe('AuthShowcase', () => {
  afterEach(() => vi.useRealTimers());

  it('has no progress bar, dots or slideshow controls', () => {
    render(<AuthShowcase title='Sign in' />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  // Fake timers go last: they leave framer-motion's frame clock stubbed for later tests in the file.
  it('shows the heading and advances through constitutional quotations', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<AuthShowcase icon={ShieldCheck} title='Sign in' text='Welcome back.' />);

    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByText(/access to justice for all persons/)).toBeInTheDocument();

    await act(async () => { vi.advanceTimersByTime(7100); });
    expect(await screen.findByText(/equal before the law/)).toBeInTheDocument();
  });
});
