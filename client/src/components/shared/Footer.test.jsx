import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import '@testing-library/jest-dom/vitest';

import Footer from '@/components/shared/Footer';
import AuthContext from '@/core/store/AuthContext';

const renderFooter = (user) => render(
  <AuthContext.Provider value={{ user }}>
    <Footer />
  </AuthContext.Provider>,
);

describe('Footer', () => {
  afterEach(cleanup);

  it("shows the firm's own recorded contact details and no placeholders", () => {
    renderFooter({ firm: { name: 'Kamau & Wanjiku Advocates', contact: { location: 'Ngong Road, Nairobi', phone_number: '+254722123456', email: '', website: '' } } });

    expect(screen.getByText('Ngong Road, Nairobi')).toBeInTheDocument();
    expect(screen.getByText('+254722123456')).toBeInTheDocument();
    expect(screen.queryByText(/sheriadesk|700 000 000/)).not.toBeInTheDocument();
  });

  it('shows no contact column on public pages', () => {
    renderFooter(null);

    expect(screen.queryByText('Contact')).not.toBeInTheDocument();
    expect(screen.queryByText(/sheriadesk|700 000 000/)).not.toBeInTheDocument();
  });
});
