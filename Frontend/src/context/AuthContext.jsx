import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import {
  login as apiLogin,
  saveToken,
  getToken,
  clearToken,
} from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getToken());

  const login = useCallback(async ({ username, password }) => {
    const data = await apiLogin({ username, password });
    console.log(data);
    if (!data?.token) {
      throw new Error('No token returned by server.');
    }
    saveToken(data.token);
    setToken(data.token);
    return data;
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setToken(null);
  }, []);

  const value = useMemo(
    () => ({
      token,
      isAuthenticated: Boolean(token),
      login,
      logout,
    }),
    [token, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
