import React, { useContext } from 'react';

import LawyerLayout from '@/layouts/staff/lawyer/LawyerLayout';

import ThemeProvider from '@/core/store/ThemeProvider';

import AuthContext from '@/core/store/AuthContext';
import { getThemeUserIdentity } from '@/core/utils/themeIdentity';

export default function LawyerLayoutWrapper() {
  const { user } = useContext(AuthContext);

  return (
    <ThemeProvider
      key={`lawyer-${getThemeUserIdentity(user)}`}
      role='lawyer'
      user={user}
    >
      <LawyerLayout />
    </ThemeProvider>
  );
}
