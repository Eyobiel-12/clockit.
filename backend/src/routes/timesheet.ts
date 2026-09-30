import { Router, type Request } from 'express';
import type { RowDataPacket } from 'mysql2';
import { pool } from '../db.js';
import { requireRole } from '../auth.js';
import { initials } from '../queries.js';
import {
  DATE_RE, formatDay, formatDayMonth, formatDayShort, formatDate, formatDistance, formatMinutes, formatMonth,
  formatShortDay, formatTime, fromLocal, isoWeek, localMidnight, localParts, startOfMonth, startOfWeek,
} from '../time.js';

/** Urenoverzicht (Timesheet.dc.html): uren per medewerker per dag, week of maand. */
export const timesheetRouter = Router();
timesheetRouter.use(requireRole('owner', 'manager'));

type Period = 'day' | 'week' | 'month';

type ShiftRow = RowDataPacket & {
  id: number; user_id: number; clock_in_at: Date; clock_out_at: Date | null;
  distance_m: number; accuracy_m: number; auto_closed: number; corrected: number; source: 'gps' | 'manual'; mocked: number;
  correction_id: number | null;
};

type UserRow = RowDataPacket & { id: number; first_name: string; last_name: string; department: string | null; status: string };

/** Periode rond een lokale datum, met label en de datums voor vorige/volgende. */
function range(period: Period, dateStr: string | undefined) {
  const anchor = dateStr && DATE_RE.test(dateStr) ? fromLocal(dateStr, '12:00') : new Date();
  let from: Date;
  let to: Date;
  let label: string;
  if (period === 'day') {
    from = localMidnight(anchor);
    to = localMidnight(anchor, 1);
    label = `${formatDay(from)} ${formatDate(from)}`;
  } else if (period === 'month') {
    from = startOfMonth(anchor);
    to = startOfMonth(localMidnight(from, 32));
    const m = formatMonth(from);
    label = m.charAt(0).toUpperCase() + m.slice(1);
  } else {
    from = startOfWeek(anchor);
    to = localMidnight(from, 7);
    label = `Week ${isoWeek(from)} · ${formatDayMonth(from)} – ${formatDayMonth(localMidnight(from, 6))}`;
  }
  const prev = period === 'day' ? localMidnight(from, -1) : period === 'week' ? localMidnight(from, -7) : startOfMonth(localMidnight(from, -1));
  return {
    from, to, label,
    date: localParts(anchor).date,
    prev: localParts(localMidnight(prev, 0)).date,
    next: localParts(to).date,
    today: localParts(new Date()).date,
  };
}

/** Kolommen: dagen van de week, of weken van de maand. */
function columns(period: Period, from: Date, to: Date) {
  const cols: { key: string; label: string; sub?: string; from: Date; to: Date; today?: boolean }[] = [];
  const todayKey = localParts(new Date()).date;
  if (period === 'week') {
    for (let i = 0; i < 7; i++) {
      const d = localMidnight(from, i);
      const key = localParts(d).date;
      cols.push({ key, label: formatShortDay(d), from: d, to: localMidnight(from, i + 1), today: key === todayKey });
    }
  } else if (period === 'month') {
    let d = from;
    while (d < to) {
      const week = isoWeek(d);
      const start = d;
      while (d < to && isoWeek(d) === week) d = localMidnight(d, 1);
      cols.push({
        key: `w${week}`, label: `Wk ${week}`,
        sub: `${formatDayMonth(start)} – ${formatDayMonth(localMidnight(d, -1))}`, from: start, to: d,
      });
    }
  }
  return cols;
}

async function load(req: Request) {
  const restaurantId = req.user!.restaurantId;
  const period: Period = ['day', 'week', 'month'].includes(String(req.query.period)) ? req.query.period as Period : 'week';
  const r = range(period, req.query.date as string | undefined);

  const [shifts] = await pool.query<ShiftRow[]>(
    `SELECT s.id, s.user_id, s.clock_in_at, s.clock_out_at, s.distance_m, s.accuracy_m, s.auto_closed, s.corrected,
            s.source, s.mocked,
            (SELECT c.id FROM corrections c WHERE c.shift_id = s.id AND c.status = 'pending' LIMIT 1) AS correction_id
       FROM shifts s
      WHERE s.restaurant_id = ? AND s.clock_in_at >= ? AND s.clock_in_at < ?
      ORDER BY s.clock_in_at`,
    [restaurantId, r.from, r.to],
  );
  const [users] = await pool.query<UserRow[]>(
    'SELECT id, first_name, last_name, department, status FROM users WHERE restaurant_id = ? ORDER BY first_name, last_name',
    [restaurantId],
  );
  const [[rules]] = await pool.query<RowDataPacket[]>('SELECT weak_gps_m FROM restaurants WHERE id = ?', [restaurantId]);
  return { period, r, shifts, users, weakGpsM: rules.weak_gps_m as number | null };
}

function minutesOf(s: ShiftRow, now: Date) {
  return Math.max(0, ((s.clock_out_at ?? now).getTime() - s.clock_in_at.getTime()) / 60000);
}

timesheetRouter.get('/', async (req, res) => {
  const now = new Date();
  const { period, r, shifts, users, weakGpsM } = await load(req);
  const cols = columns(period, r.from, r.to);
  const byUser = new Map<number, ShiftRow[]>();
  for (const s of shifts) byUser.set(s.user_id, [...(byUser.get(s.user_id) ?? []), s]);

  const detail = (s: ShiftRow, u: UserRow) => ({
    id: s.id,
    name: `${u.first_name} ${u.last_name}`,
    initials: initials(u.first_name, u.last_name),
    department: u.department,
    day: formatDayShort(s.clock_in_at),
    date: localParts(s.clock_in_at).date,
    clockIn: formatTime(s.clock_in_at),
    clockOut: s.clock_out_at ? formatTime(s.clock_out_at) : null,
    duration: formatMinutes(minutesOf(s, now)),
    distance: s.source === 'manual' ? null : formatDistance(s.distance_m),
    accuracy: s.source === 'manual' ? null : `±${s.accuracy_m} m`,
    open: s.clock_out_at === null,
    autoClosed: !!s.auto_closed,
    corrected: !!s.corrected,
    manual: s.source === 'manual',
    mocked: !!s.mocked,
    weak: s.source === 'gps' && weakGpsM !== null && s.accuracy_m > weakGpsM,
    correctionId: s.correction_id,
  });

  // Iedereen die actief in het team zit, plus wie in deze periode gewerkt heeft.
  const visible = users.filter((u) => u.status === 'active' || byUser.has(u.id));
  const colTotals = cols.map(() => 0);
  let grand = 0;

  const rows = visible.map((u) => {
    const own = byUser.get(u.id) ?? [];
    const total = own.reduce((sum, s) => sum + minutesOf(s, now), 0);
    grand += total;
    const cells = cols.map((c, i) => {
      const inCol = own.filter((s) => s.clock_in_at >= c.from && s.clock_in_at < c.to);
      const mins = inCol.reduce((sum, s) => sum + minutesOf(s, now), 0);
      colTotals[i] += mins;
      return {
        mins: Math.round(mins),
        text: inCol.length ? formatMinutes(mins) : null,
        open: inCol.some((s) => s.clock_out_at === null),
        correction: inCol.some((s) => s.correction_id !== null),
        shifts: inCol.map((s) => detail(s, u)),
      };
    });
    return {
      userId: u.id,
      name: `${u.first_name} ${u.last_name}`,
      initials: initials(u.first_name, u.last_name),
      department: u.department,
      total: formatMinutes(total),
      totalMins: Math.round(total),
      cells,
      shifts: own.map((s) => detail(s, u)),
    };
  });

  const userById = new Map(users.map((u) => [u.id, u]));
  const flagged = shifts
    .filter((s) => s.mocked || (s.source === 'gps' && weakGpsM !== null && s.accuracy_m > weakGpsM))
    .slice(-8)
    .reverse()
    .map((s) => {
      const u = userById.get(s.user_id)!;
      return {
        shiftId: s.id,
        userId: s.user_id,
        label: `${u.first_name} · ${formatDayShort(s.clock_in_at).split(' ')[0]} ${formatTime(s.clock_in_at)}`,
        badge: s.mocked ? 'Nep-GPS' : `±${s.accuracy_m} m`,
        tone: s.mocked ? 'red' : 'yellow',
      };
    });

  res.json({
    period,
    range: { label: r.label, date: r.date, prev: r.prev, next: r.next, today: r.today, isCurrent: r.today >= localParts(r.from).date && r.today < localParts(r.to).date },
    columns: cols.map(({ key, label, sub, today }) => ({ key, label, sub, today: !!today })),
    rows,
    totals: { cells: colTotals.map((m) => (m ? formatMinutes(m) : null)), total: formatMinutes(grand) },
    top: [...rows].filter((x) => x.totalMins > 0).sort((a, b) => b.totalMins - a.totalMins).slice(0, 3)
      .map((x) => ({ userId: x.userId, name: x.name, total: x.total })),
    flagged,
    weakGpsM,
  });
});

/** CSV voor de salarisadministratie: één regel per dienst. Puntkomma's en een BOM, zodat Excel het goed opent. */
timesheetRouter.get('/export.csv', async (req, res) => {
  const now = new Date();
  const { period, r, shifts, users } = await load(req);
  const userById = new Map(users.map((u) => [u.id, u]));
  const esc = (v: string | number | null) => {
    const s = v === null ? '' : String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = ['Medewerker', 'Afdeling', 'Datum', 'Ingeklokt', 'Uitgeklokt', 'Duur (u:mm)', 'Duur (uren)', 'Afstand (m)', 'Nauwkeurigheid (m)', 'Opmerking'];
  const lines = [header.join(';')];
  for (const s of [...shifts].sort((a, b) => {
    const ua = userById.get(a.user_id)!; const ub = userById.get(b.user_id)!;
    return `${ua.first_name} ${ua.last_name}`.localeCompare(`${ub.first_name} ${ub.last_name}`) || a.clock_in_at.getTime() - b.clock_in_at.getTime();
  })) {
    const u = userById.get(s.user_id)!;
    const mins = minutesOf(s, now);
    const notes = [
      s.clock_out_at === null && 'Loopt nog',
      s.auto_closed && 'Automatisch gestopt',
      s.correction_id !== null && 'Correctie open',
      s.corrected && 'Gecorrigeerd',
      s.source === 'manual' && 'Handmatig toegevoegd',
      s.mocked && 'Nep-GPS gemeld',
    ].filter(Boolean).join(', ');
    lines.push([
      `${u.first_name} ${u.last_name}`, u.department ?? '', localParts(s.clock_in_at).date,
      formatTime(s.clock_in_at), s.clock_out_at ? formatTime(s.clock_out_at) : '',
      formatMinutes(mins), (mins / 60).toFixed(2).replace('.', ','),
      s.source === 'manual' ? '' : s.distance_m, s.source === 'manual' ? '' : s.accuracy_m, notes,
    ].map(esc).join(';'));
  }
  const slug = period === 'week' ? `week-${isoWeek(r.from)}-${localParts(r.from).date.slice(0, 4)}`
    : period === 'month' ? localParts(r.from).date.slice(0, 7) : localParts(r.from).date;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="klokit-uren-${slug}.csv"`);
  res.send('﻿' + lines.join('\r\n') + '\r\n');
});
