import React from 'react';
import { Navigate } from 'react-router-dom';
import useAuth from '@/core/hooks/useAuth';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  // Optional loading state
  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        Loading...
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return <Navigate to='/login' replace />;
  }

  return children;
};

export default ProtectedRoute;
