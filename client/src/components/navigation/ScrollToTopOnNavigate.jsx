import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Opens every page at its top. Dashboard pages scroll inside the shell's
 * content area (.app-main), which stays mounted between pages, so it is reset
 * along with the window. A tab change within a page (only the query changes)
 * keeps its place, and a link to a section (#contact) scrolls to that section.
 */
export default function ScrollToTopOnNavigate() {
  const { pathname, hash } = useLocation();

  useLayoutEffect(() => {
    if (hash) {
      const target = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (target) {
        target.scrollIntoView();
        return;
      }
    }
    window.scrollTo(0, 0);
    document.querySelectorAll('.app-main').forEach((area) => { area.scrollTop = 0; });
  }, [pathname, hash]);

  return null;
}
