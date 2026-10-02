import request from 'supertest';
import { describe, expect, it } from 'vitest';
import {
  DEMO_PASSWORD,
  LONG_ENOUGH_PASSWORD,
  TOO_SHORT_PASSWORD,
  WRONG_PASSWORD,
  app,
  asUser,
  login,
} from './helpers.js';

describe('GET /api/health', () => {
  it('geeft ok terug als de database bereikbaar is', async () => {
    const res = await request(app).get('/api/health').expect(200);
    expect(res.body).toEqual({ ok: true });
  });
});

describe('POST /api/auth/login', () => {
  it('logt de eigenaar in en zet een sessiecookie', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'sanne@dekade.nl', password: DEMO_PASSWORD })
      .expect(200);

    expect(res.body).toMatchObject({ role: 'owner', status: 'active' });
    expect(res.headers['set-cookie']?.[0]).toContain('clockit_session=');
    expect(res.headers['set-cookie']?.[0]).toContain('HttpOnly');
  });

  it('geeft de app een Bearer-token in plaats van alleen een cookie', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('X-Client', 'mobile')
      .send({ email: 'sanne@dekade.nl', password: DEMO_PASSWORD })
      .expect(200);

    expect(typeof res.body.token).toBe('string');
  });

  it('geeft geen token mee aan de website', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'sanne@dekade.nl', password: DEMO_PASSWORD })
      .expect(200);

    expect(res.body.token).toBeUndefined();
  });

  it('weigert een verkeerd wachtwoord', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'sanne@dekade.nl', password: WRONG_PASSWORD })
      .expect(401);

    expect(res.body.error).toMatch(/klopt niet/);
  });

  it('weigert een onbekend e-mailadres met dezelfde melding', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'bestaat-niet@mail.nl', password: DEMO_PASSWORD })
      .expect(401);

    // Zelfde melding als bij een fout wachtwoord: verraadt niet of het account bestaat.
    expect(res.body.error).toMatch(/klopt niet/);
  });

  it('is niet gevoelig voor hoofdletters in het e-mailadres', async () => {
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'Sanne@DeKade.nl', password: DEMO_PASSWORD })
      .expect(200);
  });

  it('weigert een lege aanvraag', async () => {
    await request(app).post('/api/auth/login').send({}).expect(400);
  });
});

describe('GET /api/auth/me', () => {
  it('geeft de ingelogde gebruiker en het restaurant', async () => {
    const token = await login('sanne@dekade.nl');
    const res = await asUser(token).get('/api/auth/me').expect(200);

    expect(res.body.user).toMatchObject({
      firstName: 'Sanne',
      lastName: 'de Vries',
      initials: 'SV',
      role: 'owner',
      status: 'active',
    });
    expect(res.body.restaurant).toMatchObject({
      name: 'Eetcafé De Kade',
      radius: 120,
    });
    expect(res.body.restaurant.location).toMatchObject({ lat: 52.377956, lng: 4.89707 });
  });

  it('geeft het wachtwoord nooit terug', async () => {
    const token = await login('sanne@dekade.nl');
    const res = await asUser(token).get('/api/auth/me').expect(200);

    expect(JSON.stringify(res.body)).not.toContain('password');
    expect(res.body.user.password_hash).toBeUndefined();
  });

  it('weigert een request zonder token', async () => {
    await request(app).get('/api/auth/me').expect(401);
  });
});

describe('POST /api/auth/register', () => {
  it('maakt een eigenaar met een nieuw restaurant aan', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        mode: 'owner',
        firstName: 'Test',
        lastName: 'Eigenaar',
        email: `eigenaar-${Date.now()}@test.nl`,
        password: LONG_ENOUGH_PASSWORD,
        restaurantName: 'Testrestaurant',
      })
      .expect(201);

    expect(res.body).toMatchObject({ role: 'owner', status: 'active' });
  });

  it('maakt een medewerker aan met de uitnodigingscode en zet die op "pending"', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        mode: 'code',
        firstName: 'Nieuwe',
        lastName: 'Medewerker',
        email: `medewerker-${Date.now()}@test.nl`,
        password: LONG_ENOUGH_PASSWORD,
        code: '482913',
      })
      .expect(201);

    expect(res.body).toMatchObject({ role: 'employee', status: 'pending' });
  });

  it('weigert een onbekende uitnodigingscode', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        mode: 'code',
        firstName: 'Nieuwe',
        lastName: 'Medewerker',
        email: `onbekend-${Date.now()}@test.nl`,
        password: LONG_ENOUGH_PASSWORD,
        code: '000000',
      })
      .expect(400);

    expect(res.body.error).toMatch(/onbekend of verlopen/);
  });

  it('weigert een e-mailadres dat al bestaat', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        mode: 'owner',
        firstName: 'Test',
        lastName: 'Dubbel',
        email: 'sanne@dekade.nl',
        password: LONG_ENOUGH_PASSWORD,
        restaurantName: 'Dubbel',
      })
      .expect(409);

    expect(res.body.error).toMatch(/bestaat al/);
  });

  it('weigert een te kort wachtwoord', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        mode: 'owner',
        firstName: 'Test',
        lastName: 'Kort',
        email: `kort-${Date.now()}@test.nl`,
        password: TOO_SHORT_PASSWORD,
        restaurantName: 'Testrestaurant',
      })
      .expect(400);

    expect(res.body.error).toMatch(/minimaal 8 tekens/);
  });

  it('weigert een ongeldig e-mailadres', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        mode: 'owner',
        firstName: 'Test',
        lastName: 'Ongeldig',
        email: 'geen-emailadres',
        password: LONG_ENOUGH_PASSWORD,
        restaurantName: 'Testrestaurant',
      })
      .expect(400);
  });
});

describe('POST /api/auth/logout', () => {
  it('wist de sessiecookie', async () => {
    const res = await request(app).post('/api/auth/logout').expect(204);
    expect(res.headers['set-cookie']?.[0]).toContain('clockit_session=;');
  });
});

describe('rolcontrole', () => {
  it('houdt een medewerker weg bij het dashboard', async () => {
    const token = await login('joost@mail.nl');
    await asUser(token).get('/api/dashboard/').expect(403);
  });

  it('houdt een medewerker weg bij het team', async () => {
    const token = await login('joost@mail.nl');
    await asUser(token).get('/api/team/').expect(403);
  });

  it('laat de manager bij het dashboard', async () => {
    const token = await login('mehmet@mail.nl');
    await asUser(token).get('/api/dashboard/').expect(200);
  });

  it('staat alleen de eigenaar toe het restaurant aan te passen', async () => {
    const manager = await login('mehmet@mail.nl');
    await asUser(manager).patch('/api/restaurant/').send({ radius: 150 }).expect(403);

    const owner = await login('sanne@dekade.nl');
    await asUser(owner).patch('/api/restaurant/').send({ radius: 150 }).expect(200);
  });
});

describe('onbekende routes', () => {
  it('geeft 404 met een JSON-melding', async () => {
    const res = await request(app).get('/api/bestaat-niet').expect(404);
    expect(res.body).toEqual({ error: 'Niet gevonden' });
  });
});
