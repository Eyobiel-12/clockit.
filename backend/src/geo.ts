/** Boven deze onnauwkeurigheid weigeren we inklokken (bv. iPhone met "Exacte locatie" uit). */
export const MAX_ACCURACY_M = 150;

/** Afstand in meters tussen twee coördinaten (haversine). */
export function distanceM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}

/** Staat deze positie binnen de werkzone van de zaak? */
export function insideZone(
  position: { lat: number; lng: number },
  zone: { lat: number; lng: number; radiusM: number },
): boolean {
  return distanceM(position.lat, position.lng, zone.lat, zone.lng) <= zone.radiusM;
}
