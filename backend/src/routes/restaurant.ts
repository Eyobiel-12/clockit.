import { Router } from 'express';
import { z } from 'zod';
import type { RowDataPacket } from 'mysql2';
import { pool } from '../db.js';
import { requireRole } from '../auth.js';
import { config } from '../config.js';
import { reverseAddress, searchAddress } from '../geocode.js';

export const restaurantRouter = Router();

export const RADIUS_MIN = 25;
export const RADIUS_MAX = 300;

type SettingsRow = RowDataPacket & {
  name: string; address: string | null; lat: string | null; lng: string | null; radius_m: number;
  block_mocked: number; weak_gps_m: number | null; auto_clock_out: number;
};

export async function restaurantSettings(restaurantId: number) {
  const [[r]] = await pool.query<SettingsRow[]>(
    `SELECT name, address, lat, lng, radius_m, block_mocked, weak_gps_m, auto_clock_out
       FROM restaurants WHERE id = ?`,
    [restaurantId],
  );
  return {
    name: r.name,
    address: r.address,
    location: r.lat !== null && r.lng !== null ? { lat: Number(r.lat), lng: Number(r.lng) } : null,
    radius: r.radius_m,
    timeZone: config.timeZone,
    rules: {
      blockMocked: !!r.block_mocked,
      weakGpsM: r.weak_gps_m,
      autoClockOut: !!r.auto_clock_out,
    },
    limits: { radiusMin: RADIUS_MIN, radiusMax: RADIUS_MAX },
  };
}

/** Alle instellingen van het restaurant. Managers mogen kijken, alleen de eigenaar mag wijzigen. */
restaurantRouter.get('/', requireRole('owner', 'manager'), async (req, res) => {
  res.json(await restaurantSettings(req.user!.restaurantId));
});

const updateSchema = z.object({
  name: z.string().trim().min(2, 'Vul de naam van je restaurant in').max(120).optional(),
  address: z.string().trim().max(255).nullable().optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  radius: z.number().int()
    .min(RADIUS_MIN, `De straal is minimaal ${RADIUS_MIN} m`)
    .max(RADIUS_MAX, `De straal is maximaal ${RADIUS_MAX} m`).optional(),
  rules: z.object({
    blockMocked: z.boolean().optional(),
    weakGpsM: z.number().int().min(10).max(200).nullable().optional(),
    autoClockOut: z.boolean().optional(),
  }).optional(),
}).refine((d) => (d.lat === undefined) === (d.lng === undefined), 'Stuur lat en lng samen mee');

restaurantRouter.patch('/', requireRole('owner'), async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Ongeldige invoer' });
  const { name, address, lat, lng, radius, rules } = parsed.data;

  const sets: string[] = [];
  const params: unknown[] = [];
  const set = (column: string, value: unknown) => { sets.push(`${column} = ?`); params.push(value); };

  if (name !== undefined) set('name', name);
  if (address !== undefined) set('address', address || null);
  if (lat !== undefined && lng !== undefined) { set('lat', lat); set('lng', lng); }
  if (radius !== undefined) set('radius_m', radius);
  if (rules?.blockMocked !== undefined) set('block_mocked', rules.blockMocked ? 1 : 0);
  if (rules?.weakGpsM !== undefined) set('weak_gps_m', rules.weakGpsM);
  if (rules?.autoClockOut !== undefined) set('auto_clock_out', rules.autoClockOut ? 1 : 0);
  if (!sets.length) return res.status(400).json({ error: 'Niets om aan te passen' });

  await pool.query(`UPDATE restaurants SET ${sets.join(', ')} WHERE id = ?`, [...params, req.user!.restaurantId]);
  res.json(await restaurantSettings(req.user!.restaurantId));
});

/** Adres zoeken (voor het instellen van de werkzone). */
restaurantRouter.get('/geocode', requireRole('owner', 'manager'), async (req, res) => {
  const q = String(req.query.q ?? '').trim();
  if (q.length < 3) return res.json({ results: [] });
  try {
    res.json({ results: await searchAddress(q.slice(0, 200)) });
  } catch {
    res.status(502).json({ error: 'Adres zoeken lukt nu niet. Zet de pin met de hand op de kaart.' });
  }
});

/** Adres bij een punt op de kaart (na het verslepen van de pin). */
restaurantRouter.get('/geocode/reverse', requireRole('owner', 'manager'), async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return res.status(400).json({ error: 'Ongeldige coördinaten' });
  try {
    res.json({ result: await reverseAddress(lat, lng) });
  } catch {
    res.json({ result: null });
  }
});
