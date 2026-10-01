/** Opmaak- en omrekenhulpjes zonder React of native modules, zodat ze los te testen zijn. */

export type DateTimeMode = 'date' | 'time';

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_RE = /^\d{2}:\d{2}$/;

const pad = (n: number) => String(n).padStart(2, '0');

/** Verstreken tijd als "u:mm", bv. een dienst die 3 uur en 10 minuten loopt → "3:10". */
export function elapsed(fromIso: string, now: number): string {
  const mins = Math.max(0, Math.floor((now - new Date(fromIso).getTime()) / 60000));
  return `${Math.floor(mins / 60)}:${pad(mins % 60)}`;
}

/** '2026-09-29' of '19:00' → Date in de tijd van de telefoon. Ongeldige invoer geeft `now`. */
export function toDate(mode: DateTimeMode, value: string, now = new Date()): Date {
  if (mode === 'date' && DATE_RE.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    // 12:00 in plaats van 00:00, zodat zomer-/wintertijd de datum niet verschuift.
    return new Date(y, m - 1, d, 12, 0);
  }
  if (mode === 'time' && TIME_RE.test(value)) {
    const [h, min] = value.split(':').map(Number);
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, min);
  }
  return now;
}

/** Date → '2026-09-29' of '19:00'. */
export function fromDate(mode: DateTimeMode, d: Date): string {
  return mode === 'date'
    ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    : `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Wat de gebruiker in het veld ziet staan. */
export function display(mode: DateTimeMode, value: string, now = new Date()): string {
  if (!value) return mode === 'date' ? 'Kies een datum' : 'Kies een tijd';
  if (mode === 'time') return value;
  return toDate('date', value, now).toLocaleDateString('nl-NL', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

/** Vandaag als '2026-09-29', om een correctieformulier mee voor te vullen. */
export function today(now = new Date()): string {
  return fromDate('date', now);
}

/** Nederlandse begroeting op basis van het uur van de dag. */
export function greeting(date: Date): string {
  const h = date.getHours();
  if (h < 6) return 'Goedenacht';
  if (h < 12) return 'Goedemorgen';
  if (h < 18) return 'Goedemiddag';
  return 'Goedenavond';
}

/** "Donderdag 1 oktober" — met hoofdletter, zoals boven het overzicht. */
export function formatLongDate(date: Date): string {
  const s = date.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
