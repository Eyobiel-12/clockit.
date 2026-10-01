import { fromLocal } from './time.js';

/** Een dienst langer dan 16 uur is vrijwel altijd een vergeten uitklok, niet een echte dienst. */
export const MAX_SHIFT_MIN = 16 * 60;

/** Marge op "in de toekomst", zodat een klok die iets voorloopt geen foutmelding geeft. */
const FUTURE_SLACK_MS = 5 * 60_000;

/**
 * Lokale datum + tijden → UTC. Uit vóór in betekent: over middernacht heen, dus de volgende dag.
 * Gooit een fout bij een dienst langer dan 16 uur of een uitkloktijd in de toekomst.
 */
export function toSpan(date: string, clockIn: string, clockOut: string, now = new Date()) {
  const inAt = fromLocal(date, clockIn);
  let outAt = fromLocal(date, clockOut);
  if (outAt <= inAt) outAt = new Date(outAt.getTime() + 86_400_000);
  const mins = (outAt.getTime() - inAt.getTime()) / 60000;
  if (mins > MAX_SHIFT_MIN) throw new Error('Een dienst kan niet langer dan 16 uur zijn.');
  if (outAt.getTime() > now.getTime() + FUTURE_SLACK_MS) throw new Error('De uitkloktijd ligt in de toekomst.');
  return { inAt, outAt };
}
