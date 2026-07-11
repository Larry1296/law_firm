import { Link, useNavigate } from 'react-router-dom';

import { motion } from 'framer-motion';

import { Lock, ArrowLeft, Home, RefreshCw } from 'lucide-react';

import Card from '@/components/ui/Card';

import Button3D from '@/components/ui/Button3D';


export default function Unauthorized() {
  const navigate = useNavigate();

  const goBack = () => navigate(-1);

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-24 bg-[color:var(--background)]">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center max-w-md w-full"
      >
        <div className="mb-8">
          <div className="relative inline-flex items-center justify-center">
            <div className="absolute inset-0 bg-red-500/10 rounded-full blur-xl" />
            <Lock className="w-20 h-20 text-red-500 dark:text-red-400 relative" />
          </div>
        </div>
        
        <h1 className="text-4xl font-black text-[color:var(--text-primary)] mb-4">
          Access Denied
        </h1>
        
        <p className="text-[color:var(--text-muted)] mb-8 leading-relaxed">
          You don't have permission to access this page. This area is restricted to authorized users only.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button3D 
            variant="primary" 
            className="w-full sm:w-auto"
            onClick={goBack}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button3D>
          
          <Link 
            to="/" 
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-[color:var(--border)] text-[color:var(--text-primary)] font-medium hover:bg-[color:var(--surface)] transition"
          >
            <Home className="w-4 h-4" />
            Home
          </Link>
        </div>

        <div className="mt-6">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)] transition"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Page
          </button>
        </div>

        <p className="mt-8 text-sm text-[color:var(--text-muted)]">
          If you believe this is an error, please contact your administrator or
          <Link to="/support" className="text-[color:var(--brand-primary)] hover:underline ml-1">
            submit a support request
          </Link>.
        </p>
      </motion.div>
    </div>
  );
}