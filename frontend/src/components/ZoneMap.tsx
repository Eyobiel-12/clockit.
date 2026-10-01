import { useEffect, useMemo, useState } from 'react';
import { Circle, MapContainer, Marker, TileLayer, Tooltip, ZoomControl, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { LatLng } from '../api';

// De gele pin uit het design (Onboarding), als Leaflet-icoon. De punt onderaan is het ankerpunt.
const pinIcon = L.divIcon({
  className: 'zone-pin',
  html: `<svg width="44" height="58" viewBox="-44 -118 88 122" aria-hidden="true">
    <path d="M0 0 C-26 -36 -40 -52 -40 -74 A40 40 0 1 1 40 -74 C40 -52 26 -36 0 0Z" fill="#FFC845" stroke="#0E3B43" stroke-width="6"/>
    <circle cy="-74" r="14" fill="#0E3B43"/></svg>`,
  iconSize: [44, 58],
  iconAnchor: [22, 58],
  tooltipAnchor: [0, -60],
});

/** Midden van Nederland, als er nog geen locatie is. */
const FALLBACK: LatLng = { lat: 52.15, lng: 5.3 };

type Props = {
  location: LatLng | null;
  radius: number;
  name: string;
  /** Wordt aangeroepen bij slepen van de pin of klikken op de kaart. Zonder: alleen bekijken. */
  onMove?: (pos: LatLng) => void;
  /** Hoogte van de kaart in px of CSS-waarde. */
  height?: number | string;
};

/** Zoomt naar de cirkel als de locatie of straal van buitenaf verandert (adres gekozen, mijn locatie). */
function FitToZone({ location, radius, version }: { location: LatLng | null; radius: number; version: number }) {
  const map = useMap();
  useEffect(() => {
    if (!location) return;
    const bounds = L.latLng(location.lat, location.lng).toBounds(radius * 2 * 1.6);
    map.fitBounds(bounds, { animate: true, maxZoom: 18 });
    // Alleen bij een nieuwe "versie" (externe wijziging), niet bij elke sleepbeweging.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, map]);
  return null;
}

function ClickToMove({ onMove }: { onMove: (pos: LatLng) => void }) {
  useMapEvents({ click: (e) => onMove({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

export function ZoneMap({ location, radius, name, onMove, height = 420 }: Props) {
  const center = location ?? FALLBACK;
  const [version, setVersion] = useState(0);
  const [dragging, setDragging] = useState(false);
  const key = location ? `${location.lat.toFixed(6)},${location.lng.toFixed(6)}` : 'none';

  // Nieuwe locatie van buitenaf (niet door slepen) → opnieuw inzoomen.
  useEffect(() => {
    if (!dragging) setVersion((v) => v + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const handlers = useMemo(() => ({
    dragstart: () => setDragging(true),
    dragend: (e: L.LeafletEvent) => {
      const p = (e.target as L.Marker).getLatLng();
      onMove?.({ lat: p.lat, lng: p.lng });
      setTimeout(() => setDragging(false), 0);
    },
  }), [onMove]);

  return (
    <div className="zone-map" style={{ height }}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={location ? 17 : 7}
        scrollWheelZoom={false}
        zoomControl={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          maxZoom={19}
        />
        {/* Zoomknoppen rechtsonder, zodat de zoekbalk bovenaan ruimte heeft. */}
        <ZoomControl position="bottomright" />
        <FitToZone location={location} radius={radius} version={version} />
        {onMove && <ClickToMove onMove={onMove} />}
        {location && (
          <>
            <Circle
              center={[location.lat, location.lng]}
              radius={radius}
              pathOptions={{ color: '#0E3B43', weight: 3, dashArray: '10 8', fillColor: '#FFC845', fillOpacity: 0.18 }}
            />
            <Marker
              position={[location.lat, location.lng]}
              icon={pinIcon}
              draggable={!!onMove}
              eventHandlers={handlers}
              title={`Locatie van ${name}`}
            >
              <Tooltip permanent direction="top" className="zone-label">{name || 'Je restaurant'}</Tooltip>
            </Marker>
          </>
        )}
      </MapContainer>
      {onMove && (
        <div className="zone-hint">
          {location ? 'Sleep de pin naar je ingang of klik op de kaart' : 'Zoek je adres of klik op de kaart om de pin te zetten'}
        </div>
      )}
    </div>
  );
}
