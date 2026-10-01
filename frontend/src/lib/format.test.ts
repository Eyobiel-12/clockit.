import { describe, expect, it } from 'vitest';
import { formatLongDate, greeting } from './format';

/** Lokale tijd, want greeting() leest het uur in de tijdzone van de browser. */
const at = (hour: number) => new Date(2026, 9, 1, hour, 0, 0);

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
    // 1 oktober 2026 is een donderdag.
    expect(formatLongDate(at(12))).toBe('Donderdag 1 oktober');
  });

  it('schrijft de maand voluit', () => {
    expect(formatLongDate(new Date(2026, 0, 5, 12))).toBe('Maandag 5 januari');
  });
});
