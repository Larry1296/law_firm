import { useContext } from 'react';
import { LockKeyhole } from 'lucide-react';

import AuthContext from '@/core/store/AuthContext';

/** Locks the workspace at once, as when stepping away from the desk. */
export default function LockWorkspaceButton({ className = 'p-2 rounded' }) {
  const { lockWorkspace } = useContext(AuthContext) || {};

  return (
    <button
      type='button'
      onClick={lockWorkspace}
      className={className}
      title='Lock workspace'
      aria-label='Lock workspace'
    >
      <LockKeyhole size={18} />
    </button>
  );
}
