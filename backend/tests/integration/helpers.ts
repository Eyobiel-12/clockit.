import request from 'supertest';
import { createApp } from '../../src/app.js';

export const app = createApp();

/** De werkzone uit de demodata: Eetcafé De Kade, straal 120 m. */
export const KADE = { lat: 52.377956, lng: 4.89707 };

/**
 * Wachtwoorden voor de tests. Dit zijn geen echte gegevens: `DEMO_PASSWORD` hoort
 * bij de demodata in `db/init/002_seed.sql` en staat ook in de README. De andere
 * twee bestaan alleen om de validatie te raken. Ze staan hier bij elkaar zodat er
 * geen losse wachtwoord-teksten door de tests heen slingeren.
 */
export const DEMO_PASSWORD = 'wachtwoord12';

/** Een bestaand account met het juiste e-mailadres maar de verkeerde sleutel. */
export const WRONG_PASSWORD = 'dit-klopt-niet';

/** Korter dan de 8 tekens die registreren vereist. */
export const TOO_SHORT_PASSWORD = 'kort';

/** Lang genoeg om de wachtwoordregel te halen, zodat een andere regel kan falen. */
export const LONG_ENOUGH_PASSWORD = 'langgenoegomtehalen';

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
