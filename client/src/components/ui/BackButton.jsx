import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// React Router numbers its history entries; 0 means this page opened the app
// (a typed URL or an emailed link), so there is no page of ours to go back to.
const hasAppHistory = () => (window.history.state?.idx ?? 0) > 0;

/** Returns to the previous page, or to `fallback` when the visitor arrived here directly. */
export default function BackButton({ fallback = '/', label = 'Back', className = 'auth-back' }) {
  const navigate = useNavigate();

  return (
    <button
      type='button'
      onClick={() => (hasAppHistory() ? navigate(-1) : navigate(fallback, { replace: true }))}
      className={className}
    >
      <ArrowLeft size={16} aria-hidden='true' /> {label}
    </button>
  );
}
