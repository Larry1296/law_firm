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

export const clearAuthSession = () => {
  localStorage.removeItem(STORAGE_MODE_KEY);
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');

  sessionStorage.removeItem('accessToken');
  sessionStorage.removeItem('refreshToken');
  sessionStorage.removeItem('user');
};
