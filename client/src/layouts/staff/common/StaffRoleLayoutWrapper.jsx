import { useContext } from 'react';

import AuthContext from '@/core/store/AuthContext';
import ThemeProvider from '@/core/store/ThemeProvider';
import { getThemeUserIdentity } from '@/core/utils/themeIdentity';
import StaffRoleLayout from '@/layouts/staff/common/StaffRoleLayout';

export default function StaffRoleLayoutWrapper({ config, themeRole }) {
  const { user } = useContext(AuthContext);

  return (
    <ThemeProvider
      key={`${themeRole}-${getThemeUserIdentity(user)}`}
      role={themeRole}
      user={user}
    >
      <StaffRoleLayout config={config} />
    </ThemeProvider>
  );
}
