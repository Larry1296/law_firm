import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import BackButton from './BackButton';

const navigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => ({ ...(await importOriginal()), useNavigate: vi.fn() }));

function renderAt(idx) {
  useNavigate.mockReturnValue(navigate);
  window.history.replaceState({ idx }, '');
  render(
    <MemoryRouter initialEntries={['/register-firm']}>
      <Routes><Route path='/register-firm' element={<BackButton fallback='/' />} /></Routes>
    </MemoryRouter>,
  );
}

describe('BackButton', () => {
  afterEach(() => vi.clearAllMocks());

  it('returns to the previous page when the visitor came from within the app', async () => {
    renderAt(2);
    await userEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(navigate).toHaveBeenCalledWith(-1);
  });

  it('goes to the fallback when the page was opened directly', async () => {
    renderAt(0);
    await userEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(navigate).toHaveBeenCalledWith('/', { replace: true });
  });
});
