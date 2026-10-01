import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api, roleLabel } from './api';

/** Nep-antwoord van fetch, zodat we geen echte server nodig hebben. */
function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function emptyResponse(status: number) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      throw new Error('geen JSON');
    },
  } as unknown as Response;
}

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

describe('api', () => {
  it('zet /api voor het pad', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));
    await api('/auth/me');

    expect(fetchMock).toHaveBeenCalledWith('/api/auth/me', expect.anything());
  });

  it('doet standaard een GET en stuurt geen body mee', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));
    await api('/dashboard');

    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: 'GET',
      credentials: 'same-origin',
      body: undefined,
      headers: undefined,
    });
  });

  it('stuurt cookies mee, zodat de sessie werkt', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    await api('/auth/me');

    expect(fetchMock.mock.calls[0][1].credentials).toBe('same-origin');
  });

  it('verstuurt een body als JSON met de juiste header', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ role: 'owner' }));
    await api('/auth/login', { method: 'POST', body: { email: 'a@b.nl', password: 'geheim123' } });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(JSON.parse(init.body)).toEqual({ email: 'a@b.nl', password: 'geheim123' });
  });

  it('geeft het antwoord van de server terug', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ role: 'owner', status: 'active' }));
    const data = await api<{ role: string }>('/auth/login', { method: 'POST', body: {} });

    expect(data).toEqual({ role: 'owner', status: 'active' });
  });

  it('geeft undefined bij 204 zonder inhoud', async () => {
    fetchMock.mockResolvedValue(emptyResponse(204));
    await expect(api('/auth/logout', { method: 'POST' })).resolves.toBeUndefined();
  });

  it('gooit een ApiError met de melding van de server', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'E-mailadres of wachtwoord klopt niet' }, 401));

    await expect(api('/auth/login', { method: 'POST', body: {} })).rejects.toThrow(ApiError);
    await expect(api('/auth/login', { method: 'POST', body: {} })).rejects.toThrow(
      'E-mailadres of wachtwoord klopt niet',
    );
  });

  it('bewaart de statuscode op de fout', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'Geen toegang' }, 403));

    await expect(api('/team')).rejects.toMatchObject({ status: 403, message: 'Geen toegang' });
  });

  it('gebruikt een standaardmelding als de server er geen geeft', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 500));

    await expect(api('/dashboard')).rejects.toThrow('Er ging iets mis');
  });

  it('gebruikt een standaardmelding als het antwoord geen JSON is', async () => {
    fetchMock.mockResolvedValue(emptyResponse(502));

    await expect(api('/dashboard')).rejects.toMatchObject({ status: 502, message: 'Er ging iets mis' });
  });

  it('meldt een netwerkfout als "geen verbinding" met status 0', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(api('/auth/me')).rejects.toMatchObject({
      status: 0,
      message: 'Geen verbinding met de server',
    });
  });
});

describe('ApiError', () => {
  it('is een echte Error met status en melding', () => {
    const err = new ApiError(404, 'Niet gevonden');

    expect(err).toBeInstanceOf(Error);
    expect(err.status).toBe(404);
    expect(err.message).toBe('Niet gevonden');
  });
});

describe('roleLabel', () => {
  it('geeft Nederlandse namen voor alle rollen', () => {
    expect(roleLabel.owner).toBe('Eigenaar');
    expect(roleLabel.manager).toBe('Manager');
    expect(roleLabel.employee).toBe('Medewerker');
  });
});
