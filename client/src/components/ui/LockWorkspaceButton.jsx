import { useContext } from 'react';
import { LockKeyhole } from 'lucide-react';

import AuthContext from '@/core/store/AuthContext';

/** Locks the workspace at once, as when stepping away from the desk. */
export default function LockWorkspaceButton({ className = 'px-3 py-2 rounded' }) {
  const { lockWorkspace } = useContext(AuthContext) || {};

  return (
    <button
      type='button'
      onClick={lockWorkspace}
      className={`inline-flex items-center gap-2 text-sm font-medium ${className}`}
      title='Lock workspace'
    >
      <LockKeyhole size={18} aria-hidden='true' />
      <span>
        Lock<span className='hidden sm:inline'> workspace</span>
      </span>
    </button>
  );
}
