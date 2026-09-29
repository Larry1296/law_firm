import '@testing-library/jest-dom/vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useContext } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ThemeContext from '@/core/store/ThemeContext';
import ThemeProvider from '@/core/store/ThemeProvider';

let listeners;
let systemDark;

function mockSystemTheme(dark) {
  systemDark = dark;
  listeners = [];
  window.matchMedia = vi.fn().mockImplementation(() => ({
    get matches() { return systemDark; },
    addEventListener: (_event, listener) => listeners.push(listener),
    removeEventListener: (_event, listener) => { listeners = listeners.filter((item) => item !== listener); },
  }));
}

function switchSystemTheme(dark) {
  systemDark = dark;
  act(() => listeners.forEach((listener) => listener({ matches: dark })));
}

function Probe() {
  const { theme, toggleTheme } = useContext(ThemeContext);
  return <button type='button' onClick={toggleTheme}>{theme}</button>;
}

const user = { id: 'user-1' };

describe('ThemeProvider', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => document.documentElement.classList.remove('dark'));

  it('defaults to the device theme and follows it when it changes', () => {
    mockSystemTheme(true);
    render(<ThemeProvider role='admin' user={user}><Probe /></ThemeProvider>);
    expect(screen.getByRole('button')).toHaveTextContent('dark');
    expect(document.documentElement).toHaveClass('dark');

    switchSystemTheme(false);
    expect(screen.getByRole('button')).toHaveTextContent('light');
    expect(document.documentElement).not.toHaveClass('dark');
  });

  it('does not save a theme the user never chose', () => {
    mockSystemTheme(true);
    render(<ThemeProvider role='admin' user={user}><Probe /></ThemeProvider>);
    expect(Object.keys(localStorage)).toEqual([]);
  });

  it('remembers a signed-in user’s explicit choice over the device theme', async () => {
    mockSystemTheme(false);
    const { unmount } = render(<ThemeProvider role='admin' user={user}><Probe /></ThemeProvider>);
    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button')).toHaveTextContent('dark');
    unmount();

    render(<ThemeProvider role='admin' user={user}><Probe /></ThemeProvider>);
    expect(screen.getByRole('button')).toHaveTextContent('dark');
    switchSystemTheme(false);
    expect(screen.getByRole('button')).toHaveTextContent('dark');
  });

  it('goes back to following the device when toggled to the device theme', async () => {
    mockSystemTheme(false);
    render(<ThemeProvider role='admin' user={user}><Probe /></ThemeProvider>);
    await userEvent.click(screen.getByRole('button'));
    expect(Object.keys(localStorage)).toHaveLength(1);

    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button')).toHaveTextContent('light');
    expect(Object.keys(localStorage)).toEqual([]);

    switchSystemTheme(true);
    expect(screen.getByRole('button')).toHaveTextContent('dark');
  });

  it('keeps a toggle on public pages for the visit only', async () => {
    mockSystemTheme(false);
    const { unmount } = render(<ThemeProvider role='public'><Probe /></ThemeProvider>);
    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button')).toHaveTextContent('dark');
    unmount();

    render(<ThemeProvider role='public'><Probe /></ThemeProvider>);
    expect(screen.getByRole('button')).toHaveTextContent('light');
  });
});
