import { describe, expect, it } from 'vitest';
import {
  DATE_RE, TIME_RE, formatDate, formatDay, formatDayMonth, formatDayShort, formatDistance,
  formatMinutes, formatMonth, formatShortDay, formatTime, fromLocal, isoWeek, localMidnight,
  localParts, startOfMonth, startOfWeek, timeAgo, weekdayIndex,
} from './time.js';

// Alle tests gaan uit van APP_TIMEZONE=Europe/Amsterdam (de standaard uit config.ts).
// Donderdag 1 oktober 2026, 14:30 lokale tijd = 12:30 UTC (zomertijd, UTC+2).
const THU = new Date('2026-10-01T12:30:00Z');

describe('localMidnight', () => {
  it('geeft lokale middernacht van dezelfde dag', () => {
    expect(localMidnight(THU).toISOString()).toBe('2026-09-30T22:00:00.000Z');
  });

  it('telt dagen op', () => {
    expect(localMidnight(THU, 1).toISOString()).toBe('2026-10-01T22:00:00.000Z');
  });

  it('telt dagen af', () => {
    expect(localMidnight(THU, -1).toISOString()).toBe('2026-09-29T22:00:00.000Z');
  });

  it('houdt rekening met de overgang naar wintertijd', () => {
    // Na 25 oktober 2026 is de offset UTC+1, dus middernacht ligt op 23:00 UTC.
    const november = new Date('2026-11-10T12:00:00Z');
    expect(localMidnight(november).toISOString()).toBe('2026-11-09T23:00:00.000Z');
  });
});

describe('startOfWeek', () => {
  it('geeft maandag 00:00 van de lopende week', () => {
    // 1 oktober 2026 is een donderdag; de maandag ervoor is 28 september.
    expect(startOfWeek(THU).toISOString()).toBe('2026-09-27T22:00:00.000Z');
  });

  it('geeft op maandag de dag zelf', () => {
    const monday = new Date('2026-09-28T10:00:00Z');
    expect(startOfWeek(monday).toISOString()).toBe('2026-09-27T22:00:00.000Z');
  });

  it('rekent zondag bij de week ervoor', () => {
    const sunday = new Date('2026-10-04T10:00:00Z');
    expect(startOfWeek(sunday).toISOString()).toBe('2026-09-27T22:00:00.000Z');
  });
});

describe('weekdayIndex', () => {
  it('geeft 0 voor maandag en 6 voor zondag', () => {
    expect(weekdayIndex(new Date('2026-09-28T10:00:00Z'))).toBe(0);
    expect(weekdayIndex(new Date('2026-10-04T10:00:00Z'))).toBe(6);
  });

  it('geeft 3 voor donderdag', () => {
    expect(weekdayIndex(THU)).toBe(3);
  });

  it('kijkt naar de lokale dag, niet de UTC-dag', () => {
    // 23:30 UTC is in Amsterdam al 01:30 de volgende dag (dinsdag).
    expect(weekdayIndex(new Date('2026-09-28T23:30:00Z'))).toBe(1);
  });
});

describe('fromLocal', () => {
  it('zet lokale datum en tijd om naar UTC', () => {
    expect(fromLocal('2026-10-01', '14:30').toISOString()).toBe('2026-10-01T12:30:00.000Z');
  });

  it('gebruikt middernacht als er geen tijd is opgegeven', () => {
    expect(fromLocal('2026-10-01').toISOString()).toBe('2026-09-30T22:00:00.000Z');
  });

  it('gebruikt de wintertijd-offset na de overgang', () => {
    expect(fromLocal('2026-11-10', '12:00').toISOString()).toBe('2026-11-10T11:00:00.000Z');
  });

  it('is het omgekeerde van localParts', () => {
    const { date, time } = localParts(THU);
    expect(fromLocal(date, time).toISOString()).toBe(THU.toISOString());
  });
});

describe('localParts', () => {
  it('geeft datum en tijd als tekst', () => {
    expect(localParts(THU)).toEqual({ date: '2026-10-01', time: '14:30' });
  });

  it('vult maand, dag en tijd aan met nullen', () => {
    expect(localParts(new Date('2026-01-05T08:05:00Z'))).toEqual({ date: '2026-01-05', time: '09:05' });
  });
});

describe('formatMinutes', () => {
  it('maakt van 190 minuten "3:10"', () => {
    expect(formatMinutes(190)).toBe('3:10');
  });

  it('vult de minuten aan met een nul', () => {
    expect(formatMinutes(125)).toBe('2:05');
  });

  it('geeft 0:00 voor nul en voor negatieve waarden', () => {
    expect(formatMinutes(0)).toBe('0:00');
    expect(formatMinutes(-30)).toBe('0:00');
  });

  it('rondt halve minuten af', () => {
    expect(formatMinutes(59.6)).toBe('1:00');
  });

  it('kan meer dan 24 uur weergeven', () => {
    expect(formatMinutes(1500)).toBe('25:00');
  });
});

describe('formatDistance', () => {
  it('geeft meters onder een kilometer', () => {
    expect(formatDistance(250)).toBe('250 m');
  });

  it('geeft kilometers met een komma vanaf 1000 m', () => {
    expect(formatDistance(1500)).toBe('1,5 km');
  });

  it('schakelt precies op 1000 m over naar kilometers', () => {
    expect(formatDistance(1000)).toBe('1,0 km');
  });

  it('geeft 0 m voor nul', () => {
    expect(formatDistance(0)).toBe('0 m');
  });
});

describe('isoWeek', () => {
  it('geeft het ISO-weeknummer', () => {
    expect(isoWeek(THU)).toBe(40);
  });

  it('rekent 1 januari 2026 bij week 1', () => {
    expect(isoWeek(new Date('2026-01-01T12:00:00Z'))).toBe(1);
  });

  it('rekent 4 januari 2026 bij week 1', () => {
    expect(isoWeek(new Date('2026-01-04T12:00:00Z'))).toBe(1);
  });

  it('geeft week 53 voor 31 december 2026', () => {
    expect(isoWeek(new Date('2026-12-31T12:00:00Z'))).toBe(53);
  });
});

describe('startOfMonth', () => {
  it('geeft de eerste dag van de maand om 00:00 lokaal', () => {
    expect(startOfMonth(new Date('2026-10-17T12:00:00Z')).toISOString()).toBe('2026-09-30T22:00:00.000Z');
  });

  it('geeft op de eerste van de maand de dag zelf', () => {
    expect(startOfMonth(THU).toISOString()).toBe('2026-09-30T22:00:00.000Z');
  });
});

describe('timeAgo', () => {
  it('geeft "zojuist" binnen een minuut', () => {
    expect(timeAgo(new Date(THU.getTime() - 20_000), THU)).toBe('zojuist');
  });

  it('geeft minuten binnen het uur', () => {
    expect(timeAgo(new Date(THU.getTime() - 25 * 60_000), THU)).toBe('25 min geleden');
  });

  it('geeft uren voor vandaag', () => {
    expect(timeAgo(new Date(THU.getTime() - 3 * 3_600_000), THU)).toBe('3 uur geleden');
  });

  it('geeft "gisteren" voor de dag ervoor', () => {
    expect(timeAgo(new Date('2026-09-30T10:00:00Z'), THU)).toBe('gisteren');
  });

  it('geeft dagen voor langer terug', () => {
    expect(timeAgo(new Date('2026-09-28T10:00:00Z'), THU)).toBe('3 dagen geleden');
  });
});

describe('Nederlandse opmaak', () => {
  it('formatTime geeft uu:mm', () => {
    expect(formatTime(THU)).toBe('14:30');
  });

  it('formatDay geeft de dag met een hoofdletter', () => {
    expect(formatDay(THU)).toBe('Donderdag');
  });

  it('formatDate geeft dag en maand', () => {
    expect(formatDate(THU)).toBe('1 oktober');
  });

  it('formatShortDay geeft "Do 1"', () => {
    expect(formatShortDay(THU)).toBe('Do 1');
  });

  it('formatDayShort geeft "do 1 okt"', () => {
    expect(formatDayShort(THU)).toBe('do 1 okt');
  });

  it('formatDayMonth geeft "1 okt"', () => {
    expect(formatDayMonth(THU)).toBe('1 okt');
  });

  it('formatMonth geeft "oktober 2026"', () => {
    expect(formatMonth(THU)).toBe('oktober 2026');
  });
});

describe('DATE_RE en TIME_RE', () => {
  it('accepteert een geldige datum', () => {
    expect(DATE_RE.test('2026-10-01')).toBe(true);
  });

  it('weigert een onvolledige datum', () => {
    expect(DATE_RE.test('2026-1-1')).toBe(false);
  });

  it('accepteert geldige tijden', () => {
    expect(TIME_RE.test('00:00')).toBe(true);
    expect(TIME_RE.test('23:59')).toBe(true);
  });

  it('weigert ongeldige tijden', () => {
    expect(TIME_RE.test('24:00')).toBe(false);
    expect(TIME_RE.test('12:60')).toBe(false);
    expect(TIME_RE.test('9:30')).toBe(false);
  });
});
