import { Link, useLocation } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { helpBase } from './api';
export function HelpNavigation({ onClick }) {
  const {
    pathname
  } = useLocation();
  return <Link onClick={onClick} className='flex items-center gap-3 p-3 mt-3 rounded-xl text-white hover:bg-white/10' to={helpBase(pathname)}>
<BookOpen size={18} aria-hidden='true' />Help & Video Tutorials</Link>;
}
