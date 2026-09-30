/**
 * Adressen zoeken via OpenStreetMap Nominatim (gratis, geen sleutel).
 * Gebruiksregels: herkenbare User-Agent, maximaal 1 verzoek per seconde, resultaten cachen.
 * https://operations.osmfoundation.org/policies/nominatim/
 */
const BASE = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'Klokit/0.1 (urenregistratie voor restaurants)';

export type Place = { label: string; lat: number; lng: number };

const cache = new Map<string, Place[] | Place | null>();
let queue: Promise<unknown> = Promise.resolve();

/** Houdt minstens 1 seconde tussen verzoeken aan Nominatim. */
function throttled<T>(fn: () => Promise<T>): Promise<T> {
  const next = queue.then(fn, fn);
  queue = next.then(() => new Promise((r) => setTimeout(r, 1000)), () => new Promise((r) => setTimeout(r, 1000)));
  return next;
}

type NominatimAddress = Record<string, string | undefined>;
type NominatimResult = { lat: string; lon: string; display_name: string; address?: NominatimAddress };

/** "Kadestraat 12, Amsterdam" in plaats van de lange display_name. */
function shortLabel(r: NominatimResult): string {
  const a = r.address ?? {};
  const street = a.road ?? a.pedestrian ?? a.footway ?? a.square;
  const place = a.city ?? a.town ?? a.village ?? a.municipality;
  const name = a.amenity ?? a.shop ?? a.building;
  const line = [street, a.house_number].filter(Boolean).join(' ');
  const parts = [name && name !== line ? name : null, line || null, place].filter(Boolean);
  return parts.length ? parts.join(', ') : r.display_name;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'nl' },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  return (await res.json()) as T;
}

export async function searchAddress(q: string): Promise<Place[]> {
  const key = `s:${q.toLowerCase()}`;
  if (cache.has(key)) return cache.get(key) as Place[];
  const results = await throttled(() =>
    get<NominatimResult[]>(`/search?format=jsonv2&addressdetails=1&limit=5&q=${encodeURIComponent(q)}`));
  const places = results.map((r) => ({ label: shortLabel(r), lat: Number(r.lat), lng: Number(r.lon) }));
  cache.set(key, places);
  return places;
}

export async function reverseAddress(lat: number, lng: number): Promise<Place | null> {
  const key = `r:${lat.toFixed(5)},${lng.toFixed(5)}`;
  if (cache.has(key)) return cache.get(key) as Place | null;
  const r = await throttled(() =>
    get<NominatimResult & { error?: string }>(`/reverse?format=jsonv2&addressdetails=1&zoom=18&lat=${lat}&lon=${lng}`));
  const place = r.error ? null : { label: shortLabel(r), lat, lng };
  cache.set(key, place);
  return place;
}
