import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from './db.js';
import { localMidnight } from './time.js';

type OpenShift = RowDataPacket & { id: number; restaurant_id: number; user_id: number; clock_in_at: Date };

/**
 * Klokregel "Automatisch uitklokken": een dienst die nog openstaat na middernacht (lokale tijd)
 * wordt om middernacht gestopt, en er komt een correctie klaar voor de eigenaar om na te kijken.
 */
export async function autoClockOut(now = new Date()) {
  const [open] = await pool.query<OpenShift[]>(
    `SELECT s.id, s.restaurant_id, s.user_id, s.clock_in_at
       FROM shifts s JOIN restaurants r ON r.id = s.restaurant_id
      WHERE s.clock_out_at IS NULL AND r.auto_clock_out = 1 AND s.clock_in_at < ?`,
    [localMidnight(now)],
  );

  for (const s of open) {
    const midnight = localMidnight(s.clock_in_at, 1);
    const [r] = await pool.query<ResultSetHeader>(
      'UPDATE shifts SET clock_out_at = ?, auto_closed = 1 WHERE id = ? AND clock_out_at IS NULL',
      [midnight, s.id],
    );
    if (r.affectedRows) {
      await pool.query(
        `INSERT INTO corrections (restaurant_id, user_id, shift_id, type, reason, original_clock_in, original_clock_out)
         VALUES (?, ?, ?, 'forgot_clock_out', 'Automatisch uitgeklokt om middernacht', ?, ?)`,
        [s.restaurant_id, s.user_id, s.id, s.clock_in_at, midnight],
      );
    }
  }
  if (open.length) console.log(`Automatisch uitgeklokt: ${open.length} dienst(en)`);
}

export function startJobs() {
  const run = () => autoClockOut().catch((err) => console.error('Automatisch uitklokken mislukt:', err));
  run();
  setInterval(run, 5 * 60 * 1000);
}
