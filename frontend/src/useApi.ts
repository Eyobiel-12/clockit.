import { useCallback, useEffect, useState } from 'react';
import { api } from './api';

/** Haalt data op van de API. `pollMs` ververst op de achtergrond. */
export function useApi<T>(path: string, pollMs?: number) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      setData(await api<T>(path));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Er ging iets mis');
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    reload();
    if (!pollMs) return;
    const t = setInterval(reload, pollMs);
    return () => clearInterval(t);
  }, [reload, pollMs]);

  return { data, error, loading, reload, setData };
}
