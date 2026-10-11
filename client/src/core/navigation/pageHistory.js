// Remembers each page the user opened in this tab, by its position in the browser
// history, so a back control can name the page it returns to. Kept in sessionStorage
// so it survives a reload but not a new tab.
const STORAGE_KEY = 'app-page-history';

const read = () => {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
};

// React Router numbers its history entries; 0 is the page that opened the app.
export const historyIndex = () => window.history.state?.idx ?? 0;

export function pageAt(index) {
  return read()[index] || null;
}

export function recordPage(index, entry) {
  const pages = read();
  // A new page at this position replaces it; only its own title may be added later.
  pages[index] = entry.path && pages[index]?.path !== entry.path ? entry : { ...pages[index], ...entry };
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(pages));
  } catch {
    // Storage can be full or blocked; the back control then falls back to the section.
  }
}
