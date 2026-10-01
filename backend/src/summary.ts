import type { RowDataPacket } from 'mysql2';
import { localMidnight, weekdayIndex } from './time.js';

export type ShiftRow = RowDataPacket & {
  id: number;
  user_id: number;
  clock_in_at: Date;
  clock_out_at: Date | null;
  distance_m: number;
  accuracy_m: number;
};

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

/** "Sanne" + "de Vries" → "SV", "Fatima" + "El Amrani" → "FE": tussenvoegsels (kleine letter) tellen niet mee. */
export function initials(first: string, last: string) {
  const words = last.trim().split(/\s+/);
  const main = words.find((w) => /^\p{Lu}/u.test(w)) ?? words[words.length - 1] ?? '';
  return `${first.trim()[0] ?? ''}${main[0] ?? ''}`.toUpperCase();
}
