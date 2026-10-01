import {
  display, elapsed, formatLongDate, fromDate, greeting, toDate, today,
} from './format';

/** Vaste lokale momenten, zodat de tests niet van de klok afhangen. */
const at = (hour: number, minute = 0) => new Date(2026, 9, 1, hour, minute, 0);

describe('elapsed', () => {
  it('geeft 0:00 op het moment van inklokken', () => {
    const start = new Date('2026-10-01T12:00:00Z');
    expect(elapsed(start.toISOString(), start.getTime())).toBe('0:00');
  });

  it('rekent minuten om naar u:mm', () => {
    const start = new Date('2026-10-01T12:00:00Z');
    expect(elapsed(start.toISOString(), start.getTime() + 190 * 60_000)).toBe('3:10');
  });

  it('vult de minuten aan met een nul', () => {
    const start = new Date('2026-10-01T12:00:00Z');
    expect(elapsed(start.toISOString(), start.getTime() + 125 * 60_000)).toBe('2:05');
  });

  it('kapt af op hele minuten', () => {
    const start = new Date('2026-10-01T12:00:00Z');
    expect(elapsed(start.toISOString(), start.getTime() + 119_000)).toBe('0:01');
  });

  it('geeft 0:00 als het inklokmoment in de toekomst ligt', () => {
    const start = new Date('2026-10-01T12:00:00Z');
    expect(elapsed(start.toISOString(), start.getTime() - 60_000)).toBe('0:00');
  });

  it('kan langer dan een dag weergeven', () => {
    const start = new Date('2026-10-01T12:00:00Z');
    expect(elapsed(start.toISOString(), start.getTime() + 1500 * 60_000)).toBe('25:00');
  });
});

describe('toDate', () => {
  it('leest een datum en zet de tijd op het midden van de dag', () => {
    const d = toDate('date', '2026-09-29');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(8);
    expect(d.getDate()).toBe(29);
    expect(d.getHours()).toBe(12);
  });

  it('leest een tijd op de dag van "now"', () => {
    const now = at(8, 30);
    const d = toDate('time', '19:45', now);
    expect(d.getDate()).toBe(now.getDate());
    expect(d.getHours()).toBe(19);
    expect(d.getMinutes()).toBe(45);
  });

  it('geeft now terug bij een ongeldige datum', () => {
    const now = at(10);
    expect(toDate('date', '29-09-2026', now)).toBe(now);
  });

  it('geeft now terug bij een ongeldige tijd', () => {
    const now = at(10);
    expect(toDate('time', '7:45', now)).toBe(now);
  });

  it('geeft now terug bij een lege waarde', () => {
    const now = at(10);
    expect(toDate('date', '', now)).toBe(now);
  });
});

describe('fromDate', () => {
  it('schrijft een datum als jjjj-mm-dd', () => {
    expect(fromDate('date', new Date(2026, 8, 29, 12))).toBe('2026-09-29');
  });

  it('vult maand en dag aan met nullen', () => {
    expect(fromDate('date', new Date(2026, 0, 5, 12))).toBe('2026-01-05');
  });

  it('schrijft een tijd als uu:mm', () => {
    expect(fromDate('time', new Date(2026, 8, 29, 19, 5))).toBe('19:05');
  });

  it('schrijft middernacht als 00:00', () => {
    expect(fromDate('time', new Date(2026, 8, 29, 0, 0))).toBe('00:00');
  });

  it('is het omgekeerde van toDate voor datums', () => {
    expect(fromDate('date', toDate('date', '2026-09-29'))).toBe('2026-09-29');
  });

  it('is het omgekeerde van toDate voor tijden', () => {
    expect(fromDate('time', toDate('time', '19:45', at(8)))).toBe('19:45');
  });
});

describe('display', () => {
  it('vraagt om een datum als er niets is gekozen', () => {
    expect(display('date', '')).toBe('Kies een datum');
  });

  it('vraagt om een tijd als er niets is gekozen', () => {
    expect(display('time', '')).toBe('Kies een tijd');
  });

  it('laat een tijd ongewijzigd zien', () => {
    expect(display('time', '19:45')).toBe('19:45');
  });

  it('schrijft een datum in het Nederlands uit', () => {
    // 29 september 2026 is een dinsdag.
    expect(display('date', '2026-09-29')).toContain('29');
    expect(display('date', '2026-09-29')).toContain('2026');
  });
});

describe('today', () => {
  it('geeft de datum van vandaag als jjjj-mm-dd', () => {
    expect(today(new Date(2026, 8, 29, 15))).toBe('2026-09-29');
  });

  it('geeft een waarde die DateTimeField weer kan inlezen', () => {
    const now = new Date(2026, 8, 29, 15);
    expect(fromDate('date', toDate('date', today(now), now))).toBe('2026-09-29');
  });
});

describe('greeting', () => {
  it('zegt "Goedenacht" voor 6 uur', () => {
    expect(greeting(at(0))).toBe('Goedenacht');
    expect(greeting(at(5))).toBe('Goedenacht');
  });

  it('zegt "Goedemorgen" tussen 6 en 12', () => {
    expect(greeting(at(6))).toBe('Goedemorgen');
    expect(greeting(at(11))).toBe('Goedemorgen');
  });

  it('zegt "Goedemiddag" tussen 12 en 18', () => {
    expect(greeting(at(12))).toBe('Goedemiddag');
    expect(greeting(at(17))).toBe('Goedemiddag');
  });

  it('zegt "Goedenavond" vanaf 18 uur', () => {
    expect(greeting(at(18))).toBe('Goedenavond');
    expect(greeting(at(23))).toBe('Goedenavond');
  });
});

describe('formatLongDate', () => {
  it('geeft de dag met een hoofdletter', () => {
    expect(formatLongDate(at(12))).toBe('Donderdag 1 oktober');
  });

  it('schrijft de maand voluit', () => {
    expect(formatLongDate(new Date(2026, 0, 5, 12))).toBe('Maandag 5 januari');
  });
});
