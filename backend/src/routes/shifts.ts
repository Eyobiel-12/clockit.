import { Router } from 'express';
import { z } from 'zod';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../db.js';
import { MAX_ACCURACY_M, distanceM } from '../geo.js';
import type { ShiftRow } from '../summary.js';
import { formatDate, formatDay, formatDistance, formatMinutes, formatTime, localMidnight, localParts, startOfWeek } from '../time.js';
import { TYPE_LABEL } from './corrections.js';

/** In- en uitklokken voor de ingelogde gebruiker. Tijd en afstand bepaalt de server, niet de telefoon. */
export const shiftsRouter = Router();

const positionSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(100_000),
  /** Android meldt of een locatie door een nep-GPS-app komt. iOS geeft dit niet door. */
  mocked: z.boolean().optional(),
});

type RestaurantRow = RowDataPacket & {
  name: string; lat: string | null; lng: string | null; radius_m: number; block_mocked: number;
};
type StatusRow = RowDataPacket & { status: 'active' | 'pending' };

async function context(userId: number, restaurantId: number) {
  const [[restaurant]] = await pool.query<RestaurantRow[]>(
    'SELECT name, lat, lng, radius_m, block_mocked FROM restaurants WHERE id = ?', [restaurantId],
  );
  const [[user]] = await pool.query<StatusRow[]>('SELECT status FROM users WHERE id = ?', [userId]);
  const [open] = await pool.query<ShiftRow[]>(
    `SELECT id, user_id, clock_in_at, clock_out_at, distance_m, accuracy_m
       FROM shifts WHERE user_id = ? AND clock_out_at IS NULL ORDER BY clock_in_at DESC LIMIT 1`,
    [userId],
  );
  return { restaurant, user, open: open[0] ?? null };
}

function publicShift(s: ShiftRow, now = new Date()) {
  const end = s.clock_out_at ?? now;
  return {
    id: s.id,
    day: `${formatDay(s.clock_in_at)} ${formatDate(s.clock_in_at)}`,
    clockIn: formatTime(s.clock_in_at),
    clockInAt: s.clock_in_at.toISOString(),
    clockOut: s.clock_out_at ? formatTime(s.clock_out_at) : null,
    duration: formatMinutes((end.getTime() - s.clock_in_at.getTime()) / 60000),
    distance: formatDistance(s.distance_m),
    accuracy: `±${s.accuracy_m} m`,
    /** Lokale datum en tijden, om een correctie-aanvraag mee voor te vullen. */
    local: {
      date: localParts(s.clock_in_at).date,
      clockIn: localParts(s.clock_in_at).time,
      clockOut: s.clock_out_at ? localParts(s.clock_out_at).time : null,
    },
  };
}

type RecentRow = ShiftRow & {
  auto_closed: number; corrected: number; c_status: string | null; c_type: keyof typeof TYPE_LABEL | null;
};

shiftsRouter.get('/me', async (req, res) => {
  const { id: userId, restaurantId } = req.user!;
  const now = new Date();
  const { restaurant, user, open } = await context(userId, restaurantId);

  const weekStart = startOfWeek(now);
  const todayStart = localMidnight(now);
  const [rows] = await pool.query<ShiftRow[]>(
    `SELECT id, user_id, clock_in_at, clock_out_at, distance_m, accuracy_m
       FROM shifts WHERE user_id = ? AND (clock_in_at >= ? OR clock_out_at IS NULL)
      ORDER BY clock_in_at DESC`,
    [userId, weekStart],
  );

  let week = 0;
  let today = 0;
  for (const s of rows) {
    const start = s.clock_in_at < weekStart ? weekStart : s.clock_in_at;
    const mins = ((s.clock_out_at ?? now).getTime() - start.getTime()) / 60000;
    week += mins;
    if (start >= todayStart) today += mins;
  }

  // Laatste afgeronde diensten (twee weken), met de status van een eventuele correctie.
  const [recent] = await pool.query<RecentRow[]>(
    `SELECT s.id, s.user_id, s.clock_in_at, s.clock_out_at, s.distance_m, s.accuracy_m, s.auto_closed, s.corrected,
            c.status AS c_status, c.type AS c_type
       FROM shifts s
       LEFT JOIN corrections c ON c.id = (SELECT id FROM corrections WHERE shift_id = s.id ORDER BY created_at DESC LIMIT 1)
      WHERE s.user_id = ? AND s.clock_out_at IS NOT NULL AND s.clock_in_at >= ?
      ORDER BY s.clock_in_at DESC LIMIT 8`,
    [userId, localMidnight(now, -14)],
  );

  const hasLocation = restaurant.lat !== null && restaurant.lng !== null;
  let blocked: string | null = null;
  if (user.status !== 'active') blocked = 'Je aanmelding wacht nog op bevestiging van je leidinggevende.';
  else if (!hasLocation) blocked = 'De locatie van het restaurant is nog niet ingesteld. Vraag de eigenaar dit te doen.';

  res.json({
    restaurant: { name: restaurant.name, radius: restaurant.radius_m, hasLocation },
    blocked,
    open: open ? publicShift(open, now) : null,
    today: formatMinutes(today),
    week: formatMinutes(week),
    recent: recent.map((s) => ({
      ...publicShift(s, now),
      autoClosed: !!s.auto_closed,
      corrected: !!s.corrected,
      correction: s.c_status ? { status: s.c_status, label: TYPE_LABEL[s.c_type!] ?? 'Correctie' } : null,
    })),
  });
});

shiftsRouter.post('/clock-in', async (req, res) => {
  const parsed = positionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Geen geldige locatie ontvangen' });
  const { lat, lng, accuracy, mocked } = parsed.data;
  const { id: userId, restaurantId } = req.user!;
  const { restaurant, user, open } = await context(userId, restaurantId);

  if (mocked && restaurant.block_mocked) {
    return res.status(422).json({ code: 'mocked', error: 'Er is een nep-locatie gedetecteerd. Zet apps die je locatie aanpassen uit.' });
  }

  if (user.status !== 'active') {
    return res.status(403).json({ error: 'Je aanmelding wacht nog op bevestiging van je leidinggevende.' });
  }
  if (open) return res.status(409).json({ error: 'Je bent al ingeklokt.' });
  if (restaurant.lat === null || restaurant.lng === null) {
    return res.status(409).json({ error: 'De locatie van het restaurant is nog niet ingesteld.' });
  }

  const acc = Math.round(accuracy);
  if (acc > MAX_ACCURACY_M) {
    return res.status(422).json({
      code: 'inaccurate',
      error: `Je locatie is te onnauwkeurig (±${acc} m). Zet "Exacte locatie" aan en probeer het buiten of bij een raam opnieuw.`,
      accuracy: acc,
    });
  }

  const distance = distanceM(lat, lng, Number(restaurant.lat), Number(restaurant.lng));
  if (distance > restaurant.radius_m) {
    return res.status(422).json({
      code: 'outside',
      error: `Je bent ${formatDistance(distance)} van ${restaurant.name}. Inklokken kan binnen ${restaurant.radius_m} m.`,
      distance,
      radius: restaurant.radius_m,
    });
  }

  const [r] = await pool.query<ResultSetHeader>(
    `INSERT INTO shifts (restaurant_id, user_id, clock_in_at, distance_m, accuracy_m, mocked)
     VALUES (?, ?, UTC_TIMESTAMP(), ?, ?, ?)`,
    [restaurantId, userId, distance, acc, mocked ? 1 : 0],
  );
  const [[shift]] = await pool.query<ShiftRow[]>(
    'SELECT id, user_id, clock_in_at, clock_out_at, distance_m, accuracy_m FROM shifts WHERE id = ?', [r.insertId],
  );
  res.status(201).json(publicShift(shift));
});

shiftsRouter.post('/clock-out', async (req, res) => {
  const { id: userId, restaurantId } = req.user!;
  const { open } = await context(userId, restaurantId);
  if (!open) return res.status(409).json({ error: 'Je bent niet ingeklokt.' });

  await pool.query('UPDATE shifts SET clock_out_at = UTC_TIMESTAMP() WHERE id = ?', [open.id]);
  const [[shift]] = await pool.query<ShiftRow[]>(
    'SELECT id, user_id, clock_in_at, clock_out_at, distance_m, accuracy_m FROM shifts WHERE id = ?', [open.id],
  );
  res.json(publicShift(shift));
});
