import { describe, expect, it } from 'vitest';
import { type ShiftRow, initials, summarize } from './summary.js';

// Donderdag 1 oktober 2026, 14:30 lokale tijd. Maandag van die week is 28 september.
const NOW = new Date('2026-10-01T12:30:00Z');
const WEEK_START = new Date('2026-09-27T22:00:00.000Z');

let nextId = 1;

function shift(userId: number, clockIn: string, clockOut: string | null): ShiftRow {
  return {
    id: nextId++,
    user_id: userId,
    clock_in_at: new Date(clockIn),
    clock_out_at: clockOut ? new Date(clockOut) : null,
    distance_m: 12,
    accuracy_m: 8,
  } as ShiftRow;
}

describe('summarize', () => {
  it('geeft nullen terug zonder diensten', () => {
    const r = summarize([], WEEK_START, NOW);
    expect(r.week).toBe(0);
    expect(r.today).toBe(0);
    expect(r.perUser.size).toBe(0);
    expect(r.perDay).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });

  it('telt een afgeronde dienst in minuten', () => {
    const r = summarize([shift(1, '2026-09-28T07:00:00Z', '2026-09-28T15:00:00Z')], WEEK_START, NOW);
    expect(r.perUser.get(1)).toBe(480);
    expect(r.week).toBe(480);
  });

  it('telt uren per medewerker bij elkaar op', () => {
    const r = summarize([
      shift(1, '2026-09-28T07:00:00Z', '2026-09-28T11:00:00Z'),
      shift(1, '2026-09-29T07:00:00Z', '2026-09-29T10:00:00Z'),
      shift(2, '2026-09-28T07:00:00Z', '2026-09-28T09:00:00Z'),
    ], WEEK_START, NOW);
    expect(r.perUser.get(1)).toBe(420);
    expect(r.perUser.get(2)).toBe(120);
    expect(r.week).toBe(540);
  });

  it('zet uren op de juiste weekdag', () => {
    // Maandag 28 september = index 0, woensdag 30 september = index 2.
    const r = summarize([
      shift(1, '2026-09-28T07:00:00Z', '2026-09-28T09:00:00Z'),
      shift(2, '2026-09-30T07:00:00Z', '2026-09-30T10:00:00Z'),
    ], WEEK_START, NOW);
    expect(r.perDay[0]).toBe(120);
    expect(r.perDay[2]).toBe(180);
    expect(r.perDay[1]).toBe(0);
  });

  it('rekent een open dienst door tot nu', () => {
    const r = summarize([shift(1, '2026-10-01T10:30:00Z', null)], WEEK_START, NOW);
    expect(r.perUser.get(1)).toBe(120);
    expect(r.today).toBe(120);
  });

  it('telt alleen diensten van vandaag mee in "today"', () => {
    const r = summarize([
      shift(1, '2026-09-28T07:00:00Z', '2026-09-28T09:00:00Z'),
      shift(1, '2026-10-01T08:00:00Z', '2026-10-01T10:00:00Z'),
    ], WEEK_START, NOW);
    expect(r.today).toBe(120);
    expect(r.week).toBe(240);
  });

  it('kapt een dienst die voor de week begon af op het weekbegin', () => {
    // Begonnen zondagavond, doorgelopen tot maandagochtend.
    const r = summarize([shift(1, '2026-09-27T20:00:00Z', '2026-09-28T02:00:00Z')], WEEK_START, NOW);
    // Vanaf maandag 00:00 lokaal (= 27 sep 22:00 UTC) tot 02:00 UTC is 4 uur.
    expect(r.perUser.get(1)).toBe(240);
  });

  it('geeft nooit negatieve minuten', () => {
    const r = summarize([shift(1, '2026-09-29T10:00:00Z', '2026-09-29T09:00:00Z')], WEEK_START, NOW);
    expect(r.perUser.get(1)).toBe(0);
  });

  it('laat week gelijk zijn aan de som van perDay', () => {
    const r = summarize([
      shift(1, '2026-09-28T07:00:00Z', '2026-09-28T09:00:00Z'),
      shift(2, '2026-09-30T07:00:00Z', '2026-09-30T10:00:00Z'),
      shift(3, '2026-10-01T08:00:00Z', null),
    ], WEEK_START, NOW);
    expect(r.week).toBe(r.perDay.reduce((a, b) => a + b, 0));
  });
});

describe('initials', () => {
  it('neemt de eerste letter van de voornaam en de achternaam', () => {
    expect(initials('Sanne', 'de Vries')).toBe('SV');
  });

  it('slaat tussenvoegsels met een kleine letter over', () => {
    expect(initials('Joost', 'van der Berg')).toBe('JB');
  });

  it('neemt bij meerdere hoofdletters het eerste woord', () => {
    expect(initials('Fatima', 'El Amrani')).toBe('FE');
  });

  it('werkt met een achternaam uit één woord', () => {
    expect(initials('Mehmet', 'Yilmaz')).toBe('MY');
  });

  it('maakt er hoofdletters van', () => {
    expect(initials('tim', 'kok')).toBe('TK');
  });

  it('negeert spaties rondom de namen', () => {
    expect(initials('  Noor  ', '  Bouzid  ')).toBe('NB');
  });

  it('gaat om met een lege achternaam', () => {
    expect(initials('Daan', '')).toBe('D');
  });

  it('gaat om met een lege voornaam', () => {
    expect(initials('', 'Visser')).toBe('V');
  });

  it('geeft een lege tekst als beide namen leeg zijn', () => {
    expect(initials('', '')).toBe('');
  });
});
