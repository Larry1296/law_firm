import React, { useContext } from 'react';

import SecretaryLayout from '@/layouts/staff/secretary/SecretaryLayout';

import ThemeProvider from '@/core/store/ThemeProvider';

import AuthContext from '@/core/store/AuthContext';
import { getThemeUserIdentity } from '@/core/utils/themeIdentity';

export default function SecretaryLayoutWrapper() {
  const { user } = useContext(AuthContext);

  return (
    <ThemeProvider
      key={`secretary-${getThemeUserIdentity(user)}`}
      role='secretary'
      user={user}
    >
      <SecretaryLayout />
    </ThemeProvider>
  );
}
