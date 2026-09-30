import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, ApiError, setAuthToken, type AuthResponse, type Me } from './api';
import { loadToken, saveToken } from './storage';

type AuthState = {
  me: Me | null;
  loading: boolean;
  /** Na inloggen of registreren: token bewaren en gebruiker ophalen. */
  signIn: (res: AuthResponse, remember?: boolean) => Promise<Me | null>;
  refresh: () => Promise<Me | null>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api<Me>('/auth/me');
      setMe(data);
      return data;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setAuthToken(null);
        await saveToken(null);
      }
      setMe(null);
      return null;
    }
  }, []);

  const signIn = useCallback(async (res: AuthResponse, remember = true) => {
    setAuthToken(res.token);
    await saveToken(remember ? res.token : null);
    return refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    setAuthToken(null);
    await saveToken(null);
    setMe(null);
  }, []);

  useEffect(() => {
    (async () => {
      const token = await loadToken();
      if (token) {
        setAuthToken(token);
        await refresh();
      }
      setLoading(false);
    })();
  }, [refresh]);

  return (
    <AuthContext.Provider value={{ me, loading, signIn, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth moet binnen AuthProvider gebruikt worden');
  return ctx;
}

export function homeFor(me: Me | null) {
  if (!me) return '/login' as const;
  return me.user.role === 'employee' ? ('/klok' as const) : ('/' as const);
}
