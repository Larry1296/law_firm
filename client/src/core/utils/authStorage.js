const STORAGE_MODE_KEY = 'authStorageMode';

export const getAuthStorageMode = () =>
  localStorage.getItem(STORAGE_MODE_KEY) === 'session'
    ? 'session'
    : 'local';

export const getAuthStorage = () =>
  getAuthStorageMode() === 'session' ? sessionStorage : localStorage;

export const getStoredAuth = () => {
  const storage = getAuthStorage();

  const rawUser = storage.getItem('user');

  return {
    accessToken: storage.getItem('accessToken'),
    refreshToken: storage.getItem('refreshToken'),
    user: rawUser ? JSON.parse(rawUser) : null,
  };
};

export const saveAuthSession = ({ user, access, refresh }, rememberMe = true) => {
  const mode = rememberMe ? 'local' : 'session';

  clearWorkspaceLock();

  localStorage.setItem(STORAGE_MODE_KEY, mode);

  if (rememberMe) {
    localStorage.setItem('accessToken', access);
    localStorage.setItem('refreshToken', refresh);
    localStorage.setItem('user', JSON.stringify(user));

    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('user');
  } else {
    sessionStorage.setItem('accessToken', access);
    sessionStorage.setItem('refreshToken', refresh);
    sessionStorage.setItem('user', JSON.stringify(user));

    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }
};

// Set when the user locks their workspace by hand, so a reload stays locked.
const WORKSPACE_LOCK_KEY = 'workspaceLocked';

export const markWorkspaceLocked = () => getAuthStorage().setItem(WORKSPACE_LOCK_KEY, '1');

export const isWorkspaceLockedByUser = () => !!getAuthStorage().getItem(WORKSPACE_LOCK_KEY);

const clearWorkspaceLock = () => {
  localStorage.removeItem(WORKSPACE_LOCK_KEY);
  sessionStorage.removeItem(WORKSPACE_LOCK_KEY);
};

export const clearAuthSession = () => {
  clearWorkspaceLock();
  localStorage.removeItem(STORAGE_MODE_KEY);
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');

  sessionStorage.removeItem('accessToken');
  sessionStorage.removeItem('refreshToken');
  sessionStorage.removeItem('user');
};
