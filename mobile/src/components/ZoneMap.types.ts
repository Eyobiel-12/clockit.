import type { LatLng } from '../lib/api';

export type ZoneMapProps = {
  location: LatLng | null;
  radius: number;
  /** Pin slepen of op de kaart tikken zet een nieuwe locatie. Zonder: alleen bekijken. */
  onMove?: (pos: LatLng) => void;
  height?: number;
  /** false = voorbeeldkaart zonder bediening (bv. in Meer). */
  interactive?: boolean;
};
