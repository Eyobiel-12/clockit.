import type { RowDataPacket } from 'mysql2';
import { pool } from './db.js';

/**
 * Wijzigingen aan het databaseschema na de eerste installatie. db/init/*.sql draait alleen bij een
 * lege database, dus nieuwe kolommen komen hier. Elke migratie draait één keer (schema_migrations).
 */
const migrations: { id: string; sql: string[] }[] = [
  {
    id: '001_klokregels',
    sql: [
      'ALTER TABLE restaurants ADD COLUMN block_mocked TINYINT(1) NOT NULL DEFAULT 1',
      // NULL = zwakke GPS niet markeren
      'ALTER TABLE restaurants ADD COLUMN weak_gps_m SMALLINT UNSIGNED NULL DEFAULT 30',
      'ALTER TABLE restaurants ADD COLUMN auto_clock_out TINYINT(1) NOT NULL DEFAULT 1',
      'ALTER TABLE shifts ADD COLUMN auto_closed TINYINT(1) NOT NULL DEFAULT 0',
    ],
  },
  {
    id: '002_correcties',
    sql: [
      "ALTER TABLE corrections MODIFY COLUMN type ENUM('forgot_clock_out','forgot_clock_in','wrong_time','other') NOT NULL",
      // Wie vroeg het aan (NULL = automatisch door Klokit) en welke tijden
      'ALTER TABLE corrections ADD COLUMN requested_by INT UNSIGNED NULL',
      'ALTER TABLE corrections ADD COLUMN requested_clock_in DATETIME NULL',
      'ALTER TABLE corrections ADD COLUMN requested_clock_out DATETIME NULL',
      // Tijden van de dienst op het moment van aanvragen, zodat je later ziet wat er veranderde
      'ALTER TABLE corrections ADD COLUMN original_clock_in DATETIME NULL',
      'ALTER TABLE corrections ADD COLUMN original_clock_out DATETIME NULL',
      // Besluit
      'ALTER TABLE corrections ADD COLUMN applied_clock_in DATETIME NULL',
      'ALTER TABLE corrections ADD COLUMN applied_clock_out DATETIME NULL',
      'ALTER TABLE corrections ADD COLUMN decided_by INT UNSIGNED NULL',
      'ALTER TABLE corrections ADD COLUMN decided_at DATETIME NULL',
      'ALTER TABLE corrections ADD COLUMN decision_note VARCHAR(500) NULL',
      // Diensten: aangepast via correctie, handmatig toegevoegd, nep-GPS gemeld
      'ALTER TABLE shifts ADD COLUMN corrected TINYINT(1) NOT NULL DEFAULT 0',
      "ALTER TABLE shifts ADD COLUMN source ENUM('gps','manual') NOT NULL DEFAULT 'gps'",
      'ALTER TABLE shifts ADD COLUMN mocked TINYINT(1) NOT NULL DEFAULT 0',
      // Bestaande correcties: tijden van de dienst vastleggen; handmatige aanvragen aan de medewerker koppelen
      'UPDATE corrections c JOIN shifts s ON s.id = c.shift_id SET c.original_clock_in = s.clock_in_at, c.original_clock_out = s.clock_out_at WHERE c.original_clock_in IS NULL',
      "UPDATE corrections SET requested_by = user_id WHERE requested_by IS NULL AND (reason IS NULL OR reason <> 'Automatisch uitgeklokt om middernacht')",
    ],
  },
  {
    // Alleen voor de demodata (db/init/002_seed.sql): aanvragen met concrete tijden, zoals in het design.
    id: '003_demo_correcties',
    sql: [
      `UPDATE corrections c JOIN users u ON u.id = c.user_id
          SET c.reason = 'Na de lunchdienst vergeten uit te klokken. Ik ben om 19:00 naar huis gegaan, Mehmet kan dat bevestigen.',
              c.requested_clock_in = c.original_clock_in,
              c.requested_clock_out = c.original_clock_in + INTERVAL 380 MINUTE
        WHERE u.email = 'joost@mail.nl' AND c.status = 'pending' AND c.reason = 'Vergeten uit te klokken'
          AND c.original_clock_in IS NOT NULL`,
      `UPDATE corrections c JOIN users u ON u.id = c.user_id
          SET c.reason = 'Mijn telefoon was leeg. Ik heb zondag van 12:00 tot 18:00 gewerkt.',
              c.requested_clock_in = TIMESTAMP(CURDATE() - INTERVAL (WEEKDAY(CURDATE()) + 1) DAY, '10:00:00'),
              c.requested_clock_out = TIMESTAMP(CURDATE() - INTERVAL (WEEKDAY(CURDATE()) + 1) DAY, '16:00:00')
        WHERE u.email = 'priya@mail.nl' AND c.status = 'pending' AND c.reason = 'Vergeten in te klokken, begon om 14:00'`,
      `UPDATE corrections c JOIN users u ON u.id = c.user_id
          SET c.type = 'wrong_time', c.reason = 'Ik heb een half uur pauze gehad maar die staat er niet af.'
        WHERE u.email = 'tim@mail.nl' AND c.status = 'pending' AND c.reason = 'Pauze niet geregistreerd'`,
    ],
  },
];

const DUPLICATE_COLUMN = 1060;

export async function migrate() {
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    id VARCHAR(100) PRIMARY KEY,
    applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  const [rows] = await pool.query<RowDataPacket[]>('SELECT id FROM schema_migrations');
  const done = new Set(rows.map((r) => r.id as string));

  for (const m of migrations) {
    if (done.has(m.id)) continue;
    for (const statement of m.sql) {
      try {
        await pool.query(statement);
      } catch (err) {
        // Een eerdere, half gelukte poging kan de kolom al hebben toegevoegd.
        if ((err as { errno?: number }).errno !== DUPLICATE_COLUMN) throw err;
      }
    }
    await pool.query('INSERT INTO schema_migrations (id) VALUES (?)', [m.id]);
    console.log(`Migratie ${m.id} uitgevoerd`);
  }
}
