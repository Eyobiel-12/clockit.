import { describe, expect, it } from 'vitest';
import { MAX_SHIFT_MIN, toSpan } from './shift.js';

/** Vast referentiemoment: 1 oktober 2026, 23:00 lokale tijd (Europe/Amsterdam, zomertijd = UTC+2). */
const NOW = new Date('2026-10-01T21:00:00Z');

const minutesBetween = (a: Date, b: Date) => (b.getTime() - a.getTime()) / 60000;

describe('toSpan', () => {
  it('zet een gewone dienst om naar UTC', () => {
    const { inAt, outAt } = toSpan('2026-10-01', '09:00', '17:00', NOW);
    expect(inAt.toISOString()).toBe('2026-10-01T07:00:00.000Z');
    expect(outAt.toISOString()).toBe('2026-10-01T15:00:00.000Z');
    expect(minutesBetween(inAt, outAt)).toBe(480);
  });

  it('schuift de uitkloktijd een dag op als die voor de inkloktijd ligt', () => {
    const { inAt, outAt } = toSpan('2026-09-30', '22:00', '02:00', NOW);
    expect(outAt.getTime()).toBeGreaterThan(inAt.getTime());
    expect(minutesBetween(inAt, outAt)).toBe(240);
  });

  it('weigert gelijke tijden, want dat zou een dienst van 24 uur zijn', () => {
    expect(() => toSpan('2026-09-30', '12:00', '12:00', NOW)).toThrow(/niet langer dan 16 uur/);
  });

  it('weigert een dienst langer dan 16 uur', () => {
    expect(() => toSpan('2026-09-30', '06:00', '23:00', NOW)).toThrow(/niet langer dan 16 uur/);
  });

  it('staat een dienst van precies 16 uur toe', () => {
    const { inAt, outAt } = toSpan('2026-09-30', '06:00', '22:00', NOW);
    expect(minutesBetween(inAt, outAt)).toBe(MAX_SHIFT_MIN);
  });

  it('weigert een uitkloktijd in de toekomst', () => {
    expect(() => toSpan('2026-10-02', '09:00', '17:00', NOW)).toThrow(/in de toekomst/);
  });

  it('staat een kleine marge toe voor een klok die voorloopt', () => {
    // NOW is 23:00 lokaal; 23:04 valt binnen de marge van 5 minuten.
    expect(() => toSpan('2026-10-01', '22:00', '23:04', NOW)).not.toThrow();
  });

  it('weigert een uitkloktijd net buiten de marge', () => {
    expect(() => toSpan('2026-10-01', '22:00', '23:06', NOW)).toThrow(/in de toekomst/);
  });

  it('gaat correct om met de overgang naar wintertijd', () => {
    // In de nacht van 25 oktober 2026 gaat de klok van 03:00 naar 02:00 (UTC+2 → UTC+1).
    const after = new Date('2026-10-26T12:00:00Z');
    const { inAt, outAt } = toSpan('2026-10-25', '00:00', '08:00', after);
    // Door het extra uur duurt deze dienst op de klok 8 uur, maar in werkelijkheid 9 uur.
    expect(minutesBetween(inAt, outAt)).toBe(540);
  });
});

describe('MAX_SHIFT_MIN', () => {
  it('staat op 16 uur', () => {
    expect(MAX_SHIFT_MIN).toBe(960);
  });
});
