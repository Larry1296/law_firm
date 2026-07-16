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
      await logout({ redirect: false });
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Logout failed:', error);
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
