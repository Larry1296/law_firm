import { useContext } from 'react';

import AuthContext from '@/core/store/AuthContext';
import ThemeProvider from '@/core/store/ThemeProvider';
import { getThemeUserIdentity } from '@/core/utils/themeIdentity';
import PlatformLayout from '@/modules/platform/layout/PlatformLayout';

export default function PlatformLayoutWrapper() {
  const { user } = useContext(AuthContext);

  return (
    <ThemeProvider key={`platform-${getThemeUserIdentity(user)}`} role='platform' user={user}>
      <PlatformLayout />
    </ThemeProvider>
  );
}
