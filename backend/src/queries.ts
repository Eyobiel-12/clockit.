import type { RowDataPacket } from 'mysql2';
import { randomInt } from 'node:crypto';
import { pool } from './db.js';
import { localMidnight, startOfWeek, weekdayIndex } from './time.js';

/** Boven deze onnauwkeurigheid weigeren we inklokken (bv. iPhone met "Exacte locatie" uit). */
export const MAX_ACCURACY_M = 150;

/** Afstand in meters tussen twee coördinaten (haversine). */
export function distanceM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}

export type ShiftRow = RowDataPacket & {
  id: number;
  user_id: number;
  clock_in_at: Date;
  clock_out_at: Date | null;
  distance_m: number;
  accuracy_m: number;
};

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

/** Telt gewerkte minuten per medewerker, per weekdag en voor vandaag (op basis van de inklokdag). */
export function summarize(rows: ShiftRow[], weekStart: Date, now = new Date()) {
  const todayStart = localMidnight(now);
  const perUser = new Map<number, number>();
  const perDay = [0, 0, 0, 0, 0, 0, 0];
  let today = 0;

  for (const s of rows) {
    const start = s.clock_in_at < weekStart ? weekStart : s.clock_in_at;
    const end = s.clock_out_at ?? now;
    const mins = Math.max(0, (end.getTime() - start.getTime()) / 60000);
    perUser.set(s.user_id, (perUser.get(s.user_id) ?? 0) + mins);
    perDay[weekdayIndex(start)] += mins;
    if (start >= todayStart) today += mins;
  }

  const week = perDay.reduce((a, b) => a + b, 0);
  return { perUser, perDay, today, week };
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

/** "Sanne" + "de Vries" → "SV", "Fatima" + "El Amrani" → "FE": tussenvoegsels (kleine letter) tellen niet mee. */
export function initials(first: string, last: string) {
  const words = last.trim().split(/\s+/);
  const main = words.find((w) => /^\p{Lu}/u.test(w)) ?? words[words.length - 1] ?? '';
  return `${first.trim()[0] ?? ''}${main[0] ?? ''}`.toUpperCase();
}
