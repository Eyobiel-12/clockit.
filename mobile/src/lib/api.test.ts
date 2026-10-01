import { API_URL, ApiError, api, roleLabel, setAuthToken } from './api';

function ok(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

function noJson(status: number) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      throw new Error('geen JSON');
    },
  } as unknown as Response;
}

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
  setAuthToken(null);
});

describe('API_URL', () => {
  it('leidt het adres af uit de Expo-verbinding', () => {
    // hostUri is in jest.setup.js op 192.168.1.10:8081 gezet.
    expect(API_URL).toBe('http://192.168.1.10:4000/api');
  });
});

describe('api', () => {
  it('zet het basisadres voor het pad', async () => {
    fetchMock.mockResolvedValue(ok({}));
    await api('/auth/me');

    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/auth/me`, expect.anything());
  });

  it('stuurt altijd de X-Client-header mee, zodat de API een token teruggeeft', async () => {
    fetchMock.mockResolvedValue(ok({}));
    await api('/auth/me');

    expect(fetchMock.mock.calls[0][1].headers).toMatchObject({ 'X-Client': 'mobile' });
  });

  it('stuurt geen Authorization-header zonder token', async () => {
    fetchMock.mockResolvedValue(ok({}));
    await api('/auth/me');

    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it('stuurt het Bearer-token mee na setAuthToken', async () => {
    setAuthToken('abc123');
    fetchMock.mockResolvedValue(ok({}));
    await api('/auth/me');

    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer abc123');
  });

  it('laat het token weer vallen bij setAuthToken(null)', async () => {
    setAuthToken('abc123');
    setAuthToken(null);
    fetchMock.mockResolvedValue(ok({}));
    await api('/auth/me');

    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it('verstuurt een body als JSON', async () => {
    fetchMock.mockResolvedValue(ok({ role: 'employee' }));
    await api('/shifts/clock-in', { method: 'POST', body: { lat: 52.1, lng: 4.1, accuracy: 8 } });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body)).toEqual({ lat: 52.1, lng: 4.1, accuracy: 8 });
  });

  it('geeft het antwoord van de server terug', async () => {
    fetchMock.mockResolvedValue(ok({ role: 'owner', status: 'active' }));

    await expect(api('/auth/login', { method: 'POST', body: {} })).resolves.toEqual({
      role: 'owner',
      status: 'active',
    });
  });

  it('geeft undefined bij 204 zonder inhoud', async () => {
    fetchMock.mockResolvedValue(noJson(204));

    await expect(api('/auth/logout', { method: 'POST' })).resolves.toBeUndefined();
  });

  it('gooit een ApiError met status en melding', async () => {
    fetchMock.mockResolvedValue(ok({ error: 'Geen toegang' }, 403));

    await expect(api('/team')).rejects.toMatchObject({ status: 403, message: 'Geen toegang' });
  });

  it('bewaart de foutcode van de API, zodat het scherm erop kan reageren', async () => {
    fetchMock.mockResolvedValue(ok({ error: 'Je bent 450 m van de zaak.', code: 'outside' }, 422));

    await expect(api('/shifts/clock-in', { method: 'POST', body: {} })).rejects.toMatchObject({
      status: 422,
      code: 'outside',
    });
  });

  it('gebruikt een standaardmelding als de server er geen geeft', async () => {
    fetchMock.mockResolvedValue(ok({}, 500));

    await expect(api('/dashboard')).rejects.toThrow('Er ging iets mis');
  });

  it('meldt een netwerkfout met het adres erin, voor het dev-scherm', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));

    await expect(api('/auth/me')).rejects.toMatchObject({
      status: 0,
      message: `Geen verbinding met de server (${API_URL})`,
    });
  });
});

describe('ApiError', () => {
  it('is een echte Error met status, melding en optionele code', () => {
    const err = new ApiError(422, 'Buiten zone', 'outside');

    expect(err).toBeInstanceOf(Error);
    expect(err.status).toBe(422);
    expect(err.message).toBe('Buiten zone');
    expect(err.code).toBe('outside');
  });

  it('laat de code weg als die er niet is', () => {
    expect(new ApiError(401, 'Niet ingelogd').code).toBeUndefined();
  });
});

describe('roleLabel', () => {
  it('geeft Nederlandse namen voor alle rollen', () => {
    expect(roleLabel.owner).toBe('Eigenaar');
    expect(roleLabel.manager).toBe('Manager');
    expect(roleLabel.employee).toBe('Medewerker');
  });
});
