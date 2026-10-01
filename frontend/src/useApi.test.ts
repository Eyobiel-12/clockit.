import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useApi } from './useApi';

const fetchMock = vi.fn();

function ok(body: unknown) {
  return { ok: true, status: 200, json: async () => body } as Response;
}

function fail(status: number, error: string) {
  return { ok: false, status, json: async () => ({ error }) } as Response;
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

describe('useApi', () => {
  it('begint in de laadtoestand', () => {
    fetchMock.mockResolvedValue(ok({ total: 1 }));
    const { result } = renderHook(() => useApi<{ total: number }>('/dashboard'));

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
  });

  it('zet de data na een gelukte aanvraag', async () => {
    fetchMock.mockResolvedValue(ok({ total: 42 }));
    const { result } = renderHook(() => useApi<{ total: number }>('/dashboard'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual({ total: 42 });
    expect(result.current.error).toBe('');
  });

  it('zet de melding van de server bij een fout', async () => {
    fetchMock.mockResolvedValue(fail(403, 'Geen toegang'));
    const { result } = renderHook(() => useApi('/team'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Geen toegang');
    expect(result.current.data).toBeNull();
  });

  it('meldt een netwerkfout', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const { result } = renderHook(() => useApi('/dashboard'));

    await waitFor(() => expect(result.current.error).toBe('Geen verbinding met de server'));
  });

  it('haalt opnieuw op met reload en wist een eerdere fout', async () => {
    fetchMock.mockResolvedValue(fail(500, 'Serverfout'));
    const { result } = renderHook(() => useApi<{ total: number }>('/dashboard'));
    await waitFor(() => expect(result.current.error).toBe('Serverfout'));

    fetchMock.mockResolvedValue(ok({ total: 7 }));
    await act(() => result.current.reload());

    expect(result.current.data).toEqual({ total: 7 });
    expect(result.current.error).toBe('');
  });

  it('kan de data direct aanpassen met setData', async () => {
    fetchMock.mockResolvedValue(ok({ total: 1 }));
    const { result } = renderHook(() => useApi<{ total: number }>('/dashboard'));
    await waitFor(() => expect(result.current.data).toEqual({ total: 1 }));

    act(() => result.current.setData({ total: 99 }));

    expect(result.current.data).toEqual({ total: 99 });
  });

  it('haalt opnieuw op als het pad verandert', async () => {
    fetchMock.mockResolvedValue(ok({}));
    const { rerender } = renderHook(({ path }) => useApi(path), {
      initialProps: { path: '/dashboard' },
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/dashboard', expect.anything()));

    rerender({ path: '/team' });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/team', expect.anything()));
  });

  it('ververst op de achtergrond als pollMs is opgegeven', async () => {
    vi.useFakeTimers();
    try {
      fetchMock.mockResolvedValue(ok({ total: 1 }));
      renderHook(() => useApi('/dashboard', 30_000));

      await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(30_000);
      });

      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('ververst niet zonder pollMs', async () => {
    vi.useFakeTimers();
    try {
      fetchMock.mockResolvedValue(ok({ total: 1 }));
      renderHook(() => useApi('/dashboard'));

      await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(120_000);
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('stopt het verversen bij het opruimen van de component', async () => {
    vi.useFakeTimers();
    try {
      fetchMock.mockResolvedValue(ok({ total: 1 }));
      const { unmount } = renderHook(() => useApi('/dashboard', 10_000));
      await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

      unmount();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(60_000);
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
