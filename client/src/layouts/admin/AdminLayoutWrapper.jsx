import React, { useContext } from 'react';

import AdminLayout from '@/layouts/admin/AdminLayout';

import ThemeProvider from '@/core/store/ThemeProvider';

import AuthContext from '@/core/store/AuthContext';
import { getThemeUserIdentity } from '@/core/utils/themeIdentity';

export default function AdminLayoutWrapper() {
  const { user } = useContext(AuthContext);

  return (
    <ThemeProvider
      key={`admin-${getThemeUserIdentity(user)}`}
      role='admin'
      user={user}
    >
      <AdminLayout />
    </ThemeProvider>
  );
}
