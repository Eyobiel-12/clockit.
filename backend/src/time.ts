import { config } from './config.js';

const tz = config.timeZone;

function parts(date: Date) {
  const p = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23', weekday: 'short',
  }).formatToParts(date);
  const get = (t: string) => p.find((x) => x.type === t)!.value;
  return {
    year: Number(get('year')), month: Number(get('month')), day: Number(get('day')),
    hour: Number(get('hour')), minute: Number(get('minute')), second: Number(get('second')),
    weekday: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(get('weekday')),
  };
}

/** Verschil in ms tussen lokale tijd in `tz` en UTC op moment `date`. */
function offset(date: Date) {
  const p = parts(date);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** UTC-moment van lokale middernacht (in `tz`) voor de dag van `date`, plus `addDays`. */
export function localMidnight(date: Date, addDays = 0): Date {
  const p = parts(date);
  const guess = Date.UTC(p.year, p.month - 1, p.day + addDays);
  return new Date(guess - offset(new Date(guess)));
}

/** Maandag 00:00 lokale tijd van de week waarin `date` valt. */
export function startOfWeek(date: Date): Date {
  return localMidnight(date, -parts(date).weekday);
}

/** 0 = maandag … 6 = zondag, in lokale tijd. */
export function weekdayIndex(date: Date): number {
  return parts(date).weekday;
}

export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('nl-NL', { timeZone: tz, hour: '2-digit', minute: '2-digit' }).format(date);
}

export function formatDay(date: Date): string {
  const s = new Intl.DateTimeFormat('nl-NL', { timeZone: tz, weekday: 'long' }).format(date);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('nl-NL', { timeZone: tz, day: 'numeric', month: 'long' }).format(date);
}

/** Minuten als "u:mm", bv. 190 → "3:10". */
export function formatMinutes(mins: number): string {
  const m = Math.max(0, Math.round(mins));
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
}

export function formatDistance(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1).replace('.', ',')} km` : `${m} m`;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Lokale datum en tijd als tekst: { date: '2026-09-29', time: '12:40' }. */
export function localParts(date: Date) {
  const p = parts(date);
  return { date: `${p.year}-${pad(p.month)}-${pad(p.day)}`, time: `${pad(p.hour)}:${pad(p.minute)}` };
}

/** Lokale datum + tijd ('2026-09-29', '19:00') in de tijdzone van de app → UTC-moment. */
export function fromLocal(date: string, time = '00:00'): Date {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  let result = guess - offset(new Date(guess));
  // Rond de overgang naar zomer-/wintertijd kan de offset op het resultaat anders zijn.
  const second = offset(new Date(result));
  if (guess - second !== result) result = guess - second;
  return new Date(result);
}

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** "Ma 28" */
export function formatShortDay(date: Date): string {
  const wd = new Intl.DateTimeFormat('nl-NL', { timeZone: tz, weekday: 'short' }).format(date).replace('.', '');
  return `${wd.charAt(0).toUpperCase()}${wd.slice(1)} ${parts(date).day}`;
}

/** "di 29 sep" */
export function formatDayShort(date: Date): string {
  return new Intl.DateTimeFormat('nl-NL', { timeZone: tz, weekday: 'short', day: 'numeric', month: 'short' })
    .format(date).replace(/\./g, '');
}

/** "28 sep" */
export function formatDayMonth(date: Date): string {
  return new Intl.DateTimeFormat('nl-NL', { timeZone: tz, day: 'numeric', month: 'short' }).format(date).replace(/\./g, '');
}

/** "september 2026" */
export function formatMonth(date: Date): string {
  return new Intl.DateTimeFormat('nl-NL', { timeZone: tz, month: 'long', year: 'numeric' }).format(date);
}

/** ISO-weeknummer van de lokale datum. */
export function isoWeek(date: Date): number {
  const p = parts(date);
  const d = new Date(Date.UTC(p.year, p.month - 1, p.day));
  d.setUTCDate(d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7));
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  return 1 + Math.round(((d.getTime() - firstThursday.getTime()) / 86_400_000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
}

/** Eerste dag van de maand (lokaal, 00:00). */
export function startOfMonth(date: Date): Date {
  return localMidnight(date, 1 - parts(date).day);
}

/** "2 uur geleden", "gisteren", ... */
export function timeAgo(date: Date, now = new Date()): string {
  const mins = Math.round((now.getTime() - date.getTime()) / 60000);
  if (mins < 1) return 'zojuist';
  if (mins < 60) return `${mins} min geleden`;
  const hours = Math.round(mins / 60);
  if (date >= localMidnight(now)) return `${hours} uur geleden`;
  if (date >= localMidnight(now, -1)) return 'gisteren';
  const days = Math.round((localMidnight(now).getTime() - localMidnight(date).getTime()) / 86_400_000);
  return `${days} dagen geleden`;
}
