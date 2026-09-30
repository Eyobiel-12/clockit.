import { Router } from 'express';
import type { RowDataPacket } from 'mysql2';
import { pool } from '../db.js';
import { requireRole } from '../auth.js';
import { initials, summarize, weekShifts } from '../queries.js';
import { formatDay, formatDistance, formatMinutes, formatTime, localMidnight, weekdayIndex } from '../time.js';

export const dashboardRouter = Router();
dashboardRouter.use(requireRole('owner', 'manager'));

type UserRow = RowDataPacket & {
  id: number; first_name: string; last_name: string; department: string | null; status: 'active' | 'pending';
};

type CorrectionRow = RowDataPacket & {
  id: number; first_name: string; type: 'forgot_clock_out' | 'forgot_clock_in' | 'wrong_time' | 'other'; reason: string | null;
  clock_in_at: Date | null; clock_out_at: Date | null;
};

type Alert = { kind: 'error' | 'warning' | 'info'; title: string; detail: string; to?: string };

dashboardRouter.get('/', async (req, res) => {
  const restaurantId = req.user!.restaurantId;
  const now = new Date();
  const todayStart = localMidnight(now);

  const [[{ weak_gps_m: weakGpsM }]] = await pool.query<RowDataPacket[]>(
    'SELECT weak_gps_m FROM restaurants WHERE id = ?', [restaurantId],
  );
  /** Klokregel "Zwakke GPS markeren": null = uit. */
  const isWeak = (acc: number) => weakGpsM !== null && acc > weakGpsM;

  const [users] = await pool.query<UserRow[]>(
    'SELECT id, first_name, last_name, department, status FROM users WHERE restaurant_id = ?', [restaurantId],
  );
  const byId = new Map(users.map((u) => [u.id, u]));
  const activeCount = users.filter((u) => u.status === 'active').length;

  const { rows, weekStart } = await weekShifts(restaurantId, now);
  const totals = summarize(rows, weekStart, now);
  const open = rows.filter((s) => s.clock_out_at === null);

  const [corrections] = await pool.query<CorrectionRow[]>(
    `SELECT c.id, u.first_name, c.type, c.reason, s.clock_in_at, s.clock_out_at
       FROM corrections c
       JOIN users u ON u.id = c.user_id
       LEFT JOIN shifts s ON s.id = c.shift_id
      WHERE c.restaurant_id = ? AND c.status = 'pending'
      ORDER BY c.created_at DESC`,
    [restaurantId],
  );

  const alerts: Alert[] = [];
  for (const c of corrections.slice(0, 2)) {
    const title = c.type === 'forgot_clock_out' ? `${c.first_name} vergat uit te klokken`
      : c.type === 'forgot_clock_in' ? `${c.first_name} vergat in te klokken`
      : `Correctie van ${c.first_name}`;
    const detail = c.clock_in_at && c.clock_out_at
      ? `${formatDay(c.clock_in_at)} · dienst staat op ${formatMinutes((c.clock_out_at.getTime() - c.clock_in_at.getTime()) / 60000)} uur`
      : c.reason ?? 'Wacht op goedkeuring';
    alerts.push({ kind: 'error', title, detail, to: `/correcties?id=${c.id}` });
  }
  for (const s of rows.filter((s) => s.clock_in_at >= todayStart && isWeak(s.accuracy_m))) {
    const u = byId.get(s.user_id);
    if (!u) continue;
    alerts.push({
      kind: 'warning',
      title: `Zwakke GPS bij ${u.first_name}`,
      detail: `Vandaag ${formatTime(s.clock_in_at)} · nauwkeurigheid ±${s.accuracy_m} m`,
    });
  }
  for (const u of users.filter((u) => u.status === 'pending')) {
    alerts.push({
      kind: 'info',
      title: `${u.first_name} heeft zich aangemeld`,
      detail: 'Via uitnodigingscode · wacht op bevestiging',
      to: '/team',
    });
  }

  const max = Math.max(...totals.perDay, 1);

  res.json({
    stats: {
      onShift: open.length,
      activeMembers: activeCount,
      hoursToday: formatMinutes(totals.today),
      hoursWeek: formatMinutes(totals.week),
      openCorrections: corrections.length,
    },
    onShift: open.map((s) => {
      const u = byId.get(s.user_id)!;
      return {
        id: s.id,
        initials: initials(u.first_name, u.last_name),
        name: `${u.first_name} ${u.last_name}`,
        department: u.department,
        clockedIn: formatTime(s.clock_in_at),
        distance: formatDistance(s.distance_m),
        accuracy: `±${s.accuracy_m} m`,
        check: isWeak(s.accuracy_m) ? 'weak' : 'ok',
        duration: formatMinutes((now.getTime() - s.clock_in_at.getTime()) / 60000),
      };
    }),
    alerts,
    week: {
      todayIndex: weekdayIndex(now),
      bars: ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'].map((day, i) => ({
        day,
        hours: formatMinutes(totals.perDay[i]),
        pct: Math.round((totals.perDay[i] / max) * 100),
      })),
    },
  });
});
