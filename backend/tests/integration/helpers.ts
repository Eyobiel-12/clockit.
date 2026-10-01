import request from 'supertest';
import { createApp } from '../../src/app.js';

export const app = createApp();

/** De werkzone uit de demodata: Eetcafé De Kade, straal 120 m. */
export const KADE = { lat: 52.377956, lng: 4.89707 };

export const DEMO_PASSWORD = 'wachtwoord12';

/**
 * Logt in als demo-account en geeft het Bearer-token terug.
 * We gebruiken de mobiele route (`X-Client: mobile`) omdat die het token in de
 * body teruggeeft, wat in tests eenvoudiger is dan cookies doorgeven.
 */
export async function login(email: string, password = DEMO_PASSWORD): Promise<string> {
  const res = await request(app)
    .post('/api/auth/login')
    .set('X-Client', 'mobile')
    .send({ email, password })
    .expect(200);

  if (!res.body.token) throw new Error(`Geen token ontvangen voor ${email}`);
  return res.body.token as string;
}

/** Een request met het Bearer-token van een ingelogde gebruiker. */
export function asUser(token: string) {
  return {
    get: (path: string) => request(app).get(path).set('Authorization', `Bearer ${token}`),
    post: (path: string) => request(app).post(path).set('Authorization', `Bearer ${token}`),
    patch: (path: string) => request(app).patch(path).set('Authorization', `Bearer ${token}`),
    delete: (path: string) => request(app).delete(path).set('Authorization', `Bearer ${token}`),
  };
}
