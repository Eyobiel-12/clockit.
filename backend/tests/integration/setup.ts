import { afterAll, beforeAll, beforeEach } from 'vitest';
import { pool } from '../../src/db.js';
import { migrate } from '../../src/migrate.js';

/** De werkzone uit de demodata: Eetcafé De Kade, straal 120 m. */
const DEMO_ZONE = { lat: 52.377956, lng: 4.89707, radiusM: 120 };

// De runtime-migraties voegen kolommen toe die db/init nog niet kent (klokregels,
// correctievelden). Zonder deze stap testen we een ander schema dan productie.
beforeAll(async () => {
  await migrate();
});

// Tests mogen de klokregels en werkzone aanpassen om gedrag af te dwingen. Hier
// zetten we die terug, zodat de uitkomst niet afhangt van de volgorde van de tests.
beforeEach(async () => {
  await pool.query(
    `UPDATE restaurants
        SET lat = ?, lng = ?, radius_m = ?, block_mocked = 1, auto_clock_out = 1, weak_gps_m = 30
      WHERE id = 1`,
    [DEMO_ZONE.lat, DEMO_ZONE.lng, DEMO_ZONE.radiusM],
  );
});

// Zonder dit blijft de connection pool open en stopt Vitest niet.
afterAll(async () => {
  await pool.end();
});
