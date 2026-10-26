import { LogOut } from 'lucide-react';
import { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import AuthContext from '@/core/store/AuthContext';
import Button3D from '@/components/ui/Button3D';

const LogoutButton = () => {
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;

    try {
      setIsLoggingOut(true);
      const completed = await logout({ redirect: false });
      if (completed === false) return;
      navigate('/login', { replace: true });
    } catch (error) { if (error?.isActionCancelled) return;
      console.error('Logout failed:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <Button3D
      type='button'
      onClick={handleLogout}
      disabled={isLoggingOut}
      variant='warning'
      size='md'
      className='w-full flex items-center justify-center gap-2'
    >
      <LogOut size={18} />
      {isLoggingOut ? 'Logging out...' : 'Logout'}
    </Button3D>
  );
};

export default LogoutButton;
