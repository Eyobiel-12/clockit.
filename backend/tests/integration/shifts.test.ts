import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { pool } from '../../src/db.js';
import { KADE, app, asUser, login } from './helpers.js';

/** Lars heeft in de demodata geen open dienst, dus hij kan steeds opnieuw inklokken. */
const WORKER = 'lars@mail.nl';
/** Noor staat op "pending": haar aanmelding is nog niet bevestigd. */
const PENDING = 'noor@mail.nl';

// De werkzone en klokregels worden in setup.ts voor elke test teruggezet.
async function clearShiftsOf(email: string) {
  await pool.query('DELETE FROM shifts WHERE user_id = (SELECT id FROM users WHERE email = ?)', [email]);
}

describe('POST /api/shifts/clock-in', () => {
  beforeEach(async () => {
    await clearShiftsOf(WORKER);
  });

  it('klokt in bij de zaak en bewaart afstand en nauwkeurigheid', async () => {
    const token = await login(WORKER);
    const res = await asUser(token)
      .post('/api/shifts/clock-in')
      .send({ ...KADE, accuracy: 8 })
      .expect(201);

    expect(res.body).toMatchObject({ clockOut: null, distance: '0 m', accuracy: '±8 m' });
    expect(res.body.id).toBeTypeOf('number');
  });

  it('klokt in net binnen de werkzone', async () => {
    const token = await login(WORKER);
    // ~55 m noordelijker: binnen de straal van 120 m.
    await asUser(token)
      .post('/api/shifts/clock-in')
      .send({ lat: KADE.lat + 0.0005, lng: KADE.lng, accuracy: 10 })
      .expect(201);
  });

  it('weigert inklokken buiten de werkzone', async () => {
    const token = await login(WORKER);
    const res = await asUser(token)
      .post('/api/shifts/clock-in')
      .send({ lat: KADE.lat + 0.01, lng: KADE.lng, accuracy: 10 })
      .expect(422);

    expect(res.body.code).toBe('outside');
    expect(res.body.radius).toBe(120);
    expect(res.body.distance).toBeGreaterThan(120);
    expect(res.body.error).toMatch(/Inklokken kan binnen 120 m/);
  });

  it('weigert een te onnauwkeurige locatie', async () => {
    const token = await login(WORKER);
    const res = await asUser(token)
      .post('/api/shifts/clock-in')
      .send({ ...KADE, accuracy: 200 })
      .expect(422);

    expect(res.body.code).toBe('inaccurate');
    expect(res.body.accuracy).toBe(200);
  });

  it('staat een nauwkeurigheid van precies 150 m toe', async () => {
    const token = await login(WORKER);
    await asUser(token)
      .post('/api/shifts/clock-in')
      .send({ ...KADE, accuracy: 150 })
      .expect(201);
  });

  it('weigert een nep-locatie als die regel aanstaat', async () => {
    const token = await login(WORKER);
    const res = await asUser(token)
      .post('/api/shifts/clock-in')
      .send({ ...KADE, accuracy: 8, mocked: true })
      .expect(422);

    expect(res.body.code).toBe('mocked');
  });

  it('staat een nep-locatie toe als de eigenaar die regel uitzet', async () => {
    await pool.query('UPDATE restaurants SET block_mocked = 0 WHERE id = 1');
    const token = await login(WORKER);

    await asUser(token)
      .post('/api/shifts/clock-in')
      .send({ ...KADE, accuracy: 8, mocked: true })
      .expect(201);
  });

  it('weigert twee keer inklokken', async () => {
    const token = await login(WORKER);
    await asUser(token).post('/api/shifts/clock-in').send({ ...KADE, accuracy: 8 }).expect(201);

    const res = await asUser(token)
      .post('/api/shifts/clock-in')
      .send({ ...KADE, accuracy: 8 })
      .expect(409);

    expect(res.body.error).toMatch(/al ingeklokt/);
  });

  it('weigert inklokken als de aanmelding nog niet is bevestigd', async () => {
    const token = await login(PENDING);
    const res = await asUser(token)
      .post('/api/shifts/clock-in')
      .send({ ...KADE, accuracy: 8 })
      .expect(403);

    expect(res.body.error).toMatch(/wacht nog op bevestiging/);
  });

  it('weigert inklokken als het restaurant geen locatie heeft', async () => {
    await pool.query('UPDATE restaurants SET lat = NULL, lng = NULL WHERE id = 1');
    const token = await login(WORKER);

    const res = await asUser(token)
      .post('/api/shifts/clock-in')
      .send({ ...KADE, accuracy: 8 })
      .expect(409);

    expect(res.body.error).toMatch(/locatie van het restaurant/);
  });

  it('weigert een onvolledige locatie', async () => {
    const token = await login(WORKER);
    await asUser(token).post('/api/shifts/clock-in').send({ lat: KADE.lat }).expect(400);
  });

  it('weigert coördinaten buiten het bereik', async () => {
    const token = await login(WORKER);
    await asUser(token)
      .post('/api/shifts/clock-in')
      .send({ lat: 200, lng: 500, accuracy: 8 })
      .expect(400);
  });

  it('weigert inklokken zonder token', async () => {
    await request(app).post('/api/shifts/clock-in').send({ ...KADE, accuracy: 8 }).expect(401);
  });
});

describe('POST /api/shifts/clock-out', () => {
  beforeEach(async () => {
    await clearShiftsOf(WORKER);
  });

  it('klokt een open dienst uit', async () => {
    const token = await login(WORKER);
    await asUser(token).post('/api/shifts/clock-in').send({ ...KADE, accuracy: 8 }).expect(201);

    const res = await asUser(token).post('/api/shifts/clock-out').expect(200);
    expect(res.body.clockOut).toMatch(/^\d{2}:\d{2}$/);
    expect(res.body.duration).toBe('0:00');
  });

  it('weigert uitklokken zonder open dienst', async () => {
    const token = await login(WORKER);
    const res = await asUser(token).post('/api/shifts/clock-out').expect(409);
    expect(res.body.error).toMatch(/niet ingeklokt/);
  });

  it('weigert twee keer uitklokken', async () => {
    const token = await login(WORKER);
    await asUser(token).post('/api/shifts/clock-in').send({ ...KADE, accuracy: 8 }).expect(201);
    await asUser(token).post('/api/shifts/clock-out').expect(200);
    await asUser(token).post('/api/shifts/clock-out').expect(409);
  });
});

describe('GET /api/shifts/me', () => {
  beforeEach(async () => {
    await clearShiftsOf(WORKER);
  });

  it('geeft het overzicht van de medewerker', async () => {
    const token = await login(WORKER);
    const res = await asUser(token).get('/api/shifts/me').expect(200);

    expect(res.body.restaurant).toMatchObject({ name: 'Eetcafé De Kade', radius: 120, hasLocation: true });
    expect(res.body.open).toBeNull();
    expect(res.body.today).toMatch(/^\d+:\d{2}$/);
    expect(res.body.blocked).toBeNull();
  });

  it('toont de open dienst na inklokken', async () => {
    const token = await login(WORKER);
    await asUser(token).post('/api/shifts/clock-in').send({ ...KADE, accuracy: 8 }).expect(201);

    const res = await asUser(token).get('/api/shifts/me').expect(200);
    expect(res.body.open).not.toBeNull();
    expect(res.body.open.clockOut).toBeNull();
  });

  it('meldt waarom een medewerker met status "pending" niet kan inklokken', async () => {
    const token = await login(PENDING);
    const res = await asUser(token).get('/api/shifts/me').expect(200);
    expect(res.body.blocked).toMatch(/wacht nog op bevestiging/);
  });

  it('meldt een ontbrekende werkzone', async () => {
    await pool.query('UPDATE restaurants SET lat = NULL, lng = NULL WHERE id = 1');
    const token = await login(WORKER);

    const res = await asUser(token).get('/api/shifts/me').expect(200);
    expect(res.body.restaurant.hasLocation).toBe(false);
    expect(res.body.blocked).toMatch(/locatie van het restaurant/);
  });
});
