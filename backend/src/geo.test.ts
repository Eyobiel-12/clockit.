import { describe, expect, it } from 'vitest';
import { MAX_ACCURACY_M, distanceM, insideZone } from './geo.js';

// Eetcafé De Kade uit de demodata.
const KADE = { lat: 52.377956, lng: 4.89707 };

describe('distanceM', () => {
  it('geeft 0 voor hetzelfde punt', () => {
    expect(distanceM(KADE.lat, KADE.lng, KADE.lat, KADE.lng)).toBe(0);
  });

  it('rekent een korte afstand in meters', () => {
    // ~111 m noordelijker: 0.001° breedtegraad is ongeveer 111 m.
    expect(distanceM(KADE.lat, KADE.lng, KADE.lat + 0.001, KADE.lng)).toBeCloseTo(111, -1);
  });

  it('is symmetrisch', () => {
    const a = distanceM(52.1, 4.1, 52.2, 4.2);
    const b = distanceM(52.2, 4.2, 52.1, 4.1);
    expect(a).toBe(b);
  });

  it('rekent Amsterdam–Rotterdam op ongeveer 58 km', () => {
    const meters = distanceM(52.377956, 4.89707, 51.9225, 4.47917);
    expect(meters).toBeGreaterThan(55_000);
    expect(meters).toBeLessThan(61_000);
  });

  it('werkt over de nulmeridiaan en de equator', () => {
    expect(distanceM(0, -0.5, 0, 0.5)).toBeGreaterThan(110_000);
  });

  it('geeft een afgerond geheel getal', () => {
    expect(Number.isInteger(distanceM(52.1, 4.1, 52.10001, 4.10001))).toBe(true);
  });

  it('rekent de halve omtrek van de aarde tussen polen', () => {
    expect(distanceM(90, 0, -90, 0)).toBeCloseTo(20_015_087, -4);
  });
});

describe('insideZone', () => {
  const zone = { ...KADE, radiusM: 120 };

  it('laat de zaak zelf binnen de zone vallen', () => {
    expect(insideZone(KADE, zone)).toBe(true);
  });

  it('laat een punt net binnen de straal toe', () => {
    expect(insideZone({ lat: KADE.lat + 0.0005, lng: KADE.lng }, zone)).toBe(true);
  });

  it('wijst een punt buiten de straal af', () => {
    expect(insideZone({ lat: KADE.lat + 0.01, lng: KADE.lng }, zone)).toBe(false);
  });

  it('rekent de grens als binnen de zone', () => {
    const edge = { lat: KADE.lat, lng: KADE.lng };
    expect(insideZone(edge, { ...KADE, radiusM: 0 })).toBe(true);
  });
});

describe('MAX_ACCURACY_M', () => {
  it('staat op 150 m', () => {
    expect(MAX_ACCURACY_M).toBe(150);
  });
});
