import { Router, type Request } from 'express';
import { z } from 'zod';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../db.js';
import { requireRole } from '../auth.js';
import { initials } from '../queries.js';
import {
  DATE_RE, TIME_RE, formatDay, formatDate, formatDayShort, formatDistance, formatMinutes, formatTime,
  fromLocal, localParts, timeAgo,
} from '../time.js';

/** Correcties (Corrections.dc.html): aanvragen om een tijd aan te passen, en het besluit daarover. */
export const correctionsRouter = Router();

type Status = 'pending' | 'approved' | 'rejected';
type CorrectionType = 'forgot_clock_out' | 'forgot_clock_in' | 'wrong_time' | 'other';

export const TYPE_LABEL: Record<CorrectionType, string> = {
  forgot_clock_out: 'Uitklokken vergeten',
  forgot_clock_in: 'Inklokken vergeten',
  wrong_time: 'Tijd klopt niet',
  other: 'Overig',
};

const MAX_SHIFT_MIN = 16 * 60;

type Row = RowDataPacket & {
  id: number; restaurant_id: number; user_id: number; shift_id: number | null; type: CorrectionType; reason: string | null;
  status: Status; created_at: Date; requested_by: number | null;
  requested_clock_in: Date | null; requested_clock_out: Date | null;
  original_clock_in: Date | null; original_clock_out: Date | null;
  applied_clock_in: Date | null; applied_clock_out: Date | null;
  decided_by: number | null; decided_at: Date | null; decision_note: string | null;
  first_name: string; last_name: string;
  requester_first: string | null; decider_first: string | null; decider_last: string | null;
  s_clock_in: Date | null; s_clock_out: Date | null; s_distance: number | null; s_accuracy: number | null;
  s_auto_closed: number | null; s_source: 'gps' | 'manual' | null;
};

const SELECT = `
  SELECT c.*, u.first_name, u.last_name,
         rq.first_name AS requester_first, d.first_name AS decider_first, d.last_name AS decider_last,
         s.clock_in_at AS s_clock_in, s.clock_out_at AS s_clock_out, s.distance_m AS s_distance,
         s.accuracy_m AS s_accuracy, s.auto_closed AS s_auto_closed, s.source AS s_source
    FROM corrections c
    JOIN users u ON u.id = c.user_id
    LEFT JOIN users rq ON rq.id = c.requested_by
    LEFT JOIN users d ON d.id = c.decided_by
    LEFT JOIN shifts s ON s.id = c.shift_id`;

function span(inAt: Date | null, outAt: Date | null) {
  if (!inAt) return null;
  const mins = outAt ? (outAt.getTime() - inAt.getTime()) / 60000 : null;
  return {
    clockIn: formatTime(inAt),
    clockOut: outAt ? formatTime(outAt) : null,
    duration: mins !== null ? formatMinutes(mins) : null,
    mins: mins !== null ? Math.round(mins) : null,
  };
}

function present(c: Row, now = new Date()) {
  // Wat stond er geregistreerd toen de aanvraag binnenkwam (of nu, bij oude aanvragen zonder momentopname).
  const current = span(c.original_clock_in ?? c.s_clock_in, c.original_clock_in ? c.original_clock_out : c.s_clock_out);
  const requested = span(c.requested_clock_in, c.requested_clock_out);
  const applied = span(c.applied_clock_in, c.applied_clock_out);
  const dayOf = c.requested_clock_in ?? c.original_clock_in ?? c.s_clock_in ?? c.created_at;
  const target = applied ?? requested;

  let delta: string | null = null;
  if (current?.duration && target?.duration) delta = `${current.duration} → ${target.duration}`;
  else if (!current && target?.duration) delta = `+${target.duration}`;
  else if (current?.duration) delta = current.duration;

  const history: { title: string; detail?: string; note?: string }[] = [];
  const shiftIn = c.original_clock_in ?? c.s_clock_in;
  if (shiftIn) {
    history.push({
      title: 'Ingeklokt',
      detail: c.s_source === 'manual' ? `${formatTime(shiftIn)} (handmatig)`
        : `${formatTime(shiftIn)} · ${formatDistance(c.s_distance ?? 0)} van de zaak · ±${c.s_accuracy ?? 0} m`,
    });
    const shiftOut = c.original_clock_in ? c.original_clock_out : c.s_clock_out;
    if (c.s_auto_closed || c.reason === 'Automatisch uitgeklokt om middernacht') {
      history.push({ title: 'Automatisch gestopt', detail: shiftOut ? formatTime(shiftOut) : '00:00', note: 'geen uitklok' });
    } else if (shiftOut) {
      history.push({ title: 'Uitgeklokt', detail: formatTime(shiftOut) });
    } else {
      history.push({ title: 'Nog niet uitgeklokt' });
    }
  }
  history.push(c.requested_by
    ? { title: 'Correctie aangevraagd', detail: `door ${c.requester_first ?? c.first_name}`, note: timeAgo(c.created_at, now) }
    : { title: 'Correctie aangemaakt', detail: 'automatisch door Klokit', note: timeAgo(c.created_at, now) });
  if (c.status !== 'pending' && c.decided_at) {
    history.push({
      title: c.status === 'approved' ? 'Goedgekeurd' : 'Afgewezen',
      detail: `door ${c.decider_first ?? 'onbekend'}${applied?.duration ? ` · ${applied.clockIn}–${applied.clockOut ?? '…'}` : ''}`,
      note: timeAgo(c.decided_at, now),
    });
  }

  // Voorinvullen van "Tijd aanpassen": aangevraagde tijden, anders de huidige.
  const base = c.requested_clock_in ?? shiftIn;
  const baseOut = c.requested_clock_out ?? (c.original_clock_in ? c.original_clock_out : c.s_clock_out);
  return {
    id: c.id,
    status: c.status,
    type: c.type,
    typeLabel: TYPE_LABEL[c.type] ?? 'Correctie',
    user: { id: c.user_id, name: `${c.first_name} ${c.last_name}`, firstName: c.first_name, initials: initials(c.first_name, c.last_name) },
    shiftId: c.shift_id,
    dayShort: formatDayShort(dayOf),
    dayLong: `${formatDay(dayOf).toLowerCase()} ${formatDate(dayOf)}`,
    createdAgo: timeAgo(c.created_at, now),
    automatic: !c.requested_by,
    reason: c.reason,
    current,
    requested,
    applied,
    delta,
    decision: c.decided_at ? { by: [c.decider_first, c.decider_last].filter(Boolean).join(' '), ago: timeAgo(c.decided_at, now), note: c.decision_note } : null,
    history,
    prefill: {
      date: base ? localParts(base).date : localParts(c.created_at).date,
      clockIn: base ? localParts(base).time : '',
      clockOut: baseOut ? localParts(baseOut).time : '',
    },
  };
}

/** Lokale datum + tijden → UTC. Uit vóór in betekent: over middernacht heen, dus de volgende dag. */
function toSpan(date: string, clockIn: string, clockOut: string) {
  const inAt = fromLocal(date, clockIn);
  let outAt = fromLocal(date, clockOut);
  if (outAt <= inAt) outAt = new Date(outAt.getTime() + 86_400_000);
  const mins = (outAt.getTime() - inAt.getTime()) / 60000;
  if (mins > MAX_SHIFT_MIN) throw new Error('Een dienst kan niet langer dan 16 uur zijn.');
  if (outAt.getTime() > Date.now() + 5 * 60000) throw new Error('De uitkloktijd ligt in de toekomst.');
  return { inAt, outAt };
}

const timesSchema = z.object({
  date: z.string().regex(DATE_RE, 'Ongeldige datum'),
  clockIn: z.string().regex(TIME_RE, 'Vul de inkloktijd in als uu:mm'),
  clockOut: z.string().regex(TIME_RE, 'Vul de uitkloktijd in als uu:mm'),
});

async function overlaps(userId: number, inAt: Date, outAt: Date, exceptShiftId: number | null) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM shifts WHERE user_id = ? AND (? IS NULL OR id <> ?)
       AND clock_in_at < ? AND COALESCE(clock_out_at, UTC_TIMESTAMP()) > ? LIMIT 1`,
    [userId, exceptShiftId, exceptShiftId, outAt, inAt],
  );
  return rows.length > 0;
}

async function counts(restaurantId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT status, COUNT(*) AS n FROM corrections WHERE restaurant_id = ? GROUP BY status', [restaurantId],
  );
  const c = { pending: 0, approved: 0, rejected: 0 };
  for (const r of rows) c[r.status as Status] = Number(r.n);
  return c;
}

// ---------- Eigenaar en manager ----------

correctionsRouter.get('/', requireRole('owner', 'manager'), async (req, res) => {
  const status: Status = ['pending', 'approved', 'rejected'].includes(String(req.query.status)) ? req.query.status as Status : 'pending';
  const [rows] = await pool.query<Row[]>(
    `${SELECT} WHERE c.restaurant_id = ? AND c.status = ?
      ORDER BY ${status === 'pending' ? 'c.created_at DESC' : 'c.decided_at DESC'} LIMIT 100`,
    [req.user!.restaurantId, status],
  );
  res.json({ counts: await counts(req.user!.restaurantId), items: rows.map((r) => present(r)) });
});

async function findForRestaurant(req: Request) {
  const [rows] = await pool.query<Row[]>(`${SELECT} WHERE c.id = ? AND c.restaurant_id = ?`, [Number(req.params.id), req.user!.restaurantId]);
  return rows[0];
}

const decideSchema = z.object({
  decision: z.enum(['approve', 'reject']),
  note: z.string().trim().max(500).optional(),
  /** Alleen bij "Tijd aanpassen": de tijden die de eigenaar zelf vaststelt. */
  times: timesSchema.optional(),
});

correctionsRouter.post('/:id/decide', requireRole('owner', 'manager'), async (req, res) => {
  const parsed = decideSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Ongeldige invoer' });
  const { decision, note, times } = parsed.data;
  const c = await findForRestaurant(req);
  if (!c) return res.status(404).json({ error: 'Correctie niet gevonden' });
  if (c.status !== 'pending') return res.status(409).json({ error: 'Over deze correctie is al besloten.' });

  if (decision === 'reject') {
    await pool.query(
      "UPDATE corrections SET status = 'rejected', decided_by = ?, decided_at = UTC_TIMESTAMP(), decision_note = ? WHERE id = ?",
      [req.user!.id, note || null, c.id],
    );
    const [[updated]] = await pool.query<Row[]>(`${SELECT} WHERE c.id = ?`, [c.id]);
    return res.json(present(updated));
  }

  // Goedkeuren: welke tijden gelden er?
  let inAt: Date | null = null;
  let outAt: Date | null = null;
  try {
    if (times) ({ inAt, outAt } = toSpan(times.date, times.clockIn, times.clockOut));
    else if (c.requested_clock_in && c.requested_clock_out) { inAt = c.requested_clock_in; outAt = c.requested_clock_out; }
  } catch (err) {
    return res.status(400).json({ error: (err as Error).message });
  }

  if (!inAt || !outAt) {
    // Geen nieuwe tijden: alleen akkoord met wat er staat (bv. automatisch gestopt om middernacht).
    if (!c.shift_id || !c.s_clock_out) {
      return res.status(400).json({ error: 'Er zijn nog geen tijden. Kies "Tijd aanpassen" en vul de juiste tijden in.' });
    }
    inAt = c.s_clock_in;
    outAt = c.s_clock_out;
  } else if (await overlaps(c.user_id, inAt, outAt, c.shift_id)) {
    return res.status(409).json({ error: 'Deze tijden overlappen met een andere dienst van deze medewerker.' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    let shiftId = c.shift_id;
    if (shiftId) {
      await conn.query(
        'UPDATE shifts SET clock_in_at = ?, clock_out_at = ?, corrected = 1, auto_closed = 0 WHERE id = ?',
        [inAt, outAt, shiftId],
      );
    } else {
      const [r] = await conn.query<ResultSetHeader>(
        `INSERT INTO shifts (restaurant_id, user_id, clock_in_at, clock_out_at, distance_m, accuracy_m, source, corrected)
         VALUES (?, ?, ?, ?, 0, 0, 'manual', 1)`,
        [c.restaurant_id, c.user_id, inAt, outAt],
      );
      shiftId = r.insertId;
    }
    await conn.query(
      `UPDATE corrections SET status = 'approved', shift_id = ?, applied_clock_in = ?, applied_clock_out = ?,
              decided_by = ?, decided_at = UTC_TIMESTAMP(), decision_note = ? WHERE id = ?`,
      [shiftId, inAt, outAt, req.user!.id, note || null, c.id],
    );
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
  const [[updated]] = await pool.query<Row[]>(`${SELECT} WHERE c.id = ?`, [c.id]);
  res.json(present(updated));
});

// ---------- Medewerkers: eigen aanvragen ----------

const requestSchema = timesSchema.extend({
  shiftId: z.number().int().positive().optional(),
  type: z.enum(['forgot_clock_out', 'forgot_clock_in', 'wrong_time']),
  reason: z.string().trim().min(3, 'Leg kort uit wat er misging').max(500),
});

correctionsRouter.post('/', async (req, res) => {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Ongeldige invoer' });
  const { shiftId, type, reason, date, clockIn, clockOut } = parsed.data;
  const { id: userId, restaurantId } = req.user!;

  let span: { inAt: Date; outAt: Date };
  try {
    span = toSpan(date, clockIn, clockOut);
  } catch (err) {
    return res.status(400).json({ error: (err as Error).message });
  }

  let original: { in: Date | null; out: Date | null } = { in: null, out: null };
  if (shiftId) {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT clock_in_at, clock_out_at FROM shifts WHERE id = ? AND user_id = ? AND restaurant_id = ?',
      [shiftId, userId, restaurantId],
    );
    if (!rows.length) return res.status(404).json({ error: 'Dienst niet gevonden' });
    original = { in: rows[0].clock_in_at, out: rows[0].clock_out_at };
    const [open] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM corrections WHERE shift_id = ? AND status = 'pending'", [shiftId],
    );
    if (open.length) return res.status(409).json({ error: 'Voor deze dienst loopt al een correctie.' });
  } else if (type !== 'forgot_clock_in') {
    return res.status(400).json({ error: 'Kies de dienst die je wilt aanpassen.' });
  }
  if (await overlaps(userId, span.inAt, span.outAt, shiftId ?? null)) {
    return res.status(409).json({ error: 'Deze tijden overlappen met een andere dienst van jou.' });
  }

  const [r] = await pool.query<ResultSetHeader>(
    `INSERT INTO corrections (restaurant_id, user_id, shift_id, type, reason, requested_by,
                              requested_clock_in, requested_clock_out, original_clock_in, original_clock_out)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [restaurantId, userId, shiftId ?? null, type, reason, userId, span.inAt, span.outAt, original.in, original.out],
  );
  const [[created]] = await pool.query<Row[]>(`${SELECT} WHERE c.id = ?`, [r.insertId]);
  res.status(201).json(present(created));
});

correctionsRouter.get('/mine', async (req, res) => {
  const [rows] = await pool.query<Row[]>(
    `${SELECT} WHERE c.user_id = ? AND c.restaurant_id = ? ORDER BY c.created_at DESC LIMIT 20`,
    [req.user!.id, req.user!.restaurantId],
  );
  res.json({ items: rows.map((r) => present(r)) });
});
