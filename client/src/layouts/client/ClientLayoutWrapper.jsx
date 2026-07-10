import React, { useContext } from 'react';

import ClientLayout from '@/layouts/client/ClientLayout';

import ThemeProvider from '@/core/store/ThemeProvider';

import AuthContext from '@/core/store/AuthContext';
import { getThemeUserIdentity } from '@/core/utils/themeIdentity';

export default function ClientLayoutWrapper() {
  const { user } = useContext(AuthContext);

  return (
    <ThemeProvider
      key={`client-${getThemeUserIdentity(user)}`}
      role='client'
      user={user}
    >
      <ClientLayout />
    </ThemeProvider>
  );
}
