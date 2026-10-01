import type { RowDataPacket } from 'mysql2';
import { randomInt } from 'node:crypto';
import { pool } from './db.js';
import { startOfWeek } from './time.js';
import type { ShiftRow } from './summary.js';

/** Diensten die deze week zijn begonnen, plus diensten die nog open staan. */
export async function weekShifts(restaurantId: number, now = new Date()) {
  const weekStart = startOfWeek(now);
  const [rows] = await pool.query<ShiftRow[]>(
    `SELECT id, user_id, clock_in_at, clock_out_at, distance_m, accuracy_m
       FROM shifts
      WHERE restaurant_id = ? AND (clock_in_at >= ? OR clock_out_at IS NULL)
      ORDER BY clock_in_at`,
    [restaurantId, weekStart],
  );
  return { rows, weekStart };
}

type CountRow = RowDataPacket & { n: number };

export async function restaurantSummary(restaurantId: number) {
  const [[r]] = await pool.query<RowDataPacket[]>(
    'SELECT id, name, address, radius_m, lat, lng FROM restaurants WHERE id = ?',
    [restaurantId],
  );
  const [[members]] = await pool.query<CountRow[]>(
    'SELECT COUNT(*) AS n FROM users WHERE restaurant_id = ?', [restaurantId],
  );
  const [[pending]] = await pool.query<CountRow[]>(
    "SELECT COUNT(*) AS n FROM users WHERE restaurant_id = ? AND status = 'pending'", [restaurantId],
  );
  const [[corrections]] = await pool.query<CountRow[]>(
    "SELECT COUNT(*) AS n FROM corrections WHERE restaurant_id = ? AND status = 'pending'", [restaurantId],
  );
  return {
    id: r.id as number,
    name: r.name as string,
    address: r.address as string | null,
    radius: r.radius_m as number,
    location: r.lat !== null && r.lng !== null ? { lat: Number(r.lat), lng: Number(r.lng) } : null,
    memberCount: members.n,
    pendingCount: pending.n,
    openCorrections: corrections.n,
  };
}

/** Genereert een unieke 6-cijferige uitnodigingscode. */
export async function uniqueInviteCode(): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const [rows] = await pool.query<RowDataPacket[]>('SELECT 1 FROM restaurants WHERE invite_code = ?', [code]);
    if (rows.length === 0) return code;
  }
  throw new Error('Kon geen unieke uitnodigingscode maken');
}
