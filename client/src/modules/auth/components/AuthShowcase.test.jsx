import '@testing-library/jest-dom/vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ShieldCheck } from 'lucide-react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import AuthShowcase from './AuthShowcase';

describe('AuthShowcase', () => {
  afterEach(() => vi.useRealTimers());

  it('can be paused and navigated by hand', async () => {
    const user = userEvent.setup();
    render(<AuthShowcase title='Sign in' />);

    await user.click(screen.getByRole('button', { name: 'Pause slideshow' }));
    expect(screen.getByRole('button', { name: 'Play slideshow' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Show slide 3 of 4' }));
    expect(screen.getByRole('button', { name: 'Show slide 3 of 4' })).toHaveAttribute('aria-current', 'true');
    expect(await screen.findByText(/irrespective of status/, undefined, { timeout: 3000 })).toBeInTheDocument();
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
