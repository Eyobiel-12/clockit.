import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Me, Role } from './api';
import { AuthProvider, homeFor, useAuth } from './auth';

function makeMe(role: Role, status: 'active' | 'pending' = 'active'): Me {
  return {
    user: {
      id: 1,
      firstName: 'Sanne',
      lastName: 'de Vries',
      initials: 'SV',
      email: 'sanne@dekade.nl',
      role,
      department: 'Bediening',
      status,
    },
    restaurant: {
      id: 1,
      name: 'Eetcafé De Kade',
      address: 'Kade 1, Amsterdam',
      radius: 120,
      location: { lat: 52.377956, lng: 4.89707 },
      memberCount: 9,
      pendingCount: 1,
      openCorrections: 3,
    },
  } as Me;
}

describe('homeFor', () => {
  it('stuurt iemand zonder sessie naar het inlogscherm', () => {
    expect(homeFor(null)).toBe('/login');
  });

  it('stuurt een medewerker naar het welkomscherm', () => {
    expect(homeFor(makeMe('employee'))).toBe('/welkom');
  });

  it('stuurt een eigenaar naar het dashboard', () => {
    expect(homeFor(makeMe('owner'))).toBe('/dashboard');
  });

  it('stuurt een manager naar het dashboard', () => {
    expect(homeFor(makeMe('manager'))).toBe('/dashboard');
  });
});

/** Kleine testcomponent die de inhoud van de context laat zien. */
function AuthProbe() {
  const { me, loading, logout } = useAuth();
  if (loading) return <p>Laden…</p>;
  return (
    <div>
      <p data-testid="naam">{me ? me.user.firstName : 'niet ingelogd'}</p>
      <button onClick={logout}>Uitloggen</button>
    </div>
  );
}

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

describe('AuthProvider', () => {
  it('haalt de ingelogde gebruiker op bij het laden', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => makeMe('owner') });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    expect(screen.getByText('Laden…')).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId('naam').textContent).toBe('Sanne'));
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/me', expect.anything());
  });

  it('laat "niet ingelogd" zien na een 401', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401, json: async () => ({ error: 'Niet ingelogd' }) });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('naam').textContent).toBe('niet ingelogd'));
  });

  it('logt een onverwachte fout en houdt de gebruiker uitgelogd', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock.mockResolvedValue({ ok: false, status: 500, json: async () => ({ error: 'Serverfout' }) });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('naam').textContent).toBe('niet ingelogd'));
    expect(consoleError).toHaveBeenCalled();
  });

  it('wist de gebruiker bij uitloggen', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => makeMe('owner') });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('naam').textContent).toBe('Sanne'));

    fetchMock.mockResolvedValue({ ok: true, status: 204, json: async () => ({}) });
    await userEvent.click(screen.getByRole('button', { name: 'Uitloggen' }));

    await waitFor(() => expect(screen.getByTestId('naam').textContent).toBe('niet ingelogd'));
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/logout', expect.objectContaining({ method: 'POST' }));
  });

  it('logt ook uit als de server niet reageert', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => makeMe('owner') });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('naam').textContent).toBe('Sanne'));

    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await userEvent.click(screen.getByRole('button', { name: 'Uitloggen' }));

    await waitFor(() => expect(screen.getByTestId('naam').textContent).toBe('niet ingelogd'));
  });
});

describe('useAuth', () => {
  it('geeft een duidelijke fout buiten de AuthProvider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<AuthProbe />)).toThrow(/binnen AuthProvider/);

    consoleError.mockRestore();
  });
});
