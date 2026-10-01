import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, ApiError, type Me } from './api';

type AuthState = {
  me: Me | null;
  loading: boolean;
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
      if (!(err instanceof ApiError) || err.status !== 401) console.error(err);
      setMe(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => {});
    setMe(null);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return <AuthContext.Provider value={{ me, loading, refresh, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth moet binnen AuthProvider gebruikt worden');
  return ctx;
}

/** Waar iemand na inloggen of registreren heen moet. */
export function homeFor(me: Me | null) {
  if (!me) return '/login';
  return me.user.role === 'employee' ? '/welkom' : '/dashboard';
}
