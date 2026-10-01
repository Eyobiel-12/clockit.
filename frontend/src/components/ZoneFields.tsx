import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { api, type LatLng, type Place } from '../api';

type AddressProps = {
  value: string;
  onChange: (value: string) => void;
  onPick: (place: Place) => void;
  disabled?: boolean;
  help?: string;
  /** 'map': zoekbalk die over de kaart zweeft. */
  variant?: 'field' | 'map';
};

/** Adresveld met suggesties (combobox): typen zoekt via de API, kiezen zet de pin. */
export function AddressSearch({ value, onChange, onPick, disabled, help, variant = 'field' }: AddressProps) {
  const onMap = variant === 'map';
  const id = useId();
  const [results, setResults] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [status, setStatus] = useState('');
  const typed = useRef(false);

  useEffect(() => {
    if (!typed.current || value.trim().length < 3) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setStatus('Zoeken…');
      try {
        const { results } = await api<{ results: Place[] }>(`/restaurant/geocode?q=${encodeURIComponent(value)}`);
        setResults(results);
        setOpen(true);
        setActive(-1);
        setStatus(results.length ? `${results.length} adressen gevonden` : 'Geen adres gevonden. Zet de pin met de hand op de kaart.');
      } catch (err) {
        setStatus(err instanceof Error ? err.message : 'Zoeken mislukt');
      }
    }, 450);
    return () => clearTimeout(t);
  }, [value]);

  function pick(p: Place) {
    typed.current = false;
    onChange(p.label);
    onPick(p);
    setOpen(false);
    setResults([]);
    setStatus(`Pin gezet op ${p.label}`);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open || !results.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => (a + 1) % results.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => (a <= 0 ? results.length - 1 : a - 1)); }
    else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); pick(results[active]); }
    else if (e.key === 'Escape') setOpen(false);
  }

  return (
    <div className={onMap ? 'addr map-search' : 'field addr'}>
      <label htmlFor={`${id}-in`} className={onMap ? 'sr-only' : undefined}>
        {onMap ? 'Zoek een adres op de kaart' : 'Adres'}
      </label>
      {onMap && (
        <svg className="map-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
        </svg>
      )}
      <input
        className="in" id={`${id}-in`} type="text" autoComplete="off" disabled={disabled}
        role="combobox" aria-expanded={open && results.length > 0} aria-controls={`${id}-list`} aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${id}-opt-${active}` : undefined}
        placeholder={onMap ? 'Zoek een adres, bv. Kadestraat 12 Amsterdam' : 'Straat en huisnummer, plaats'}
        value={value}
        onChange={(e) => { typed.current = true; onChange(e.target.value); }}
        onKeyDown={onKeyDown}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onFocus={() => results.length && setOpen(true)}
      />
      {open && results.length > 0 && (
        <ul className="addr-list" id={`${id}-list`} role="listbox" aria-label="Gevonden adressen">
          {results.map((p, i) => (
            <li
              key={`${p.lat},${p.lng}`} id={`${id}-opt-${i}`} role="option" aria-selected={i === active}
              className={i === active ? 'on' : undefined}
              onMouseDown={(e) => { e.preventDefault(); pick(p); }}
            >
              {p.label}
            </li>
          ))}
        </ul>
      )}
      {help && <div className="help">{help}</div>}
      <span className="sr-only" role="status">{status}</span>
    </div>
  );
}

type RadiusProps = { value: number; onChange: (value: number) => void; min: number; max: number; disabled?: boolean };

/** Straal-schuifregelaar uit het design (25–300 m, stappen van 5). */
export function RadiusSlider({ value, onChange, min, max, disabled }: RadiusProps) {
  const id = useId();
  return (
    <div className="field">
      <label className="lbl" htmlFor={id}>Straal <span className="val" aria-hidden="true">{value} m</span></label>
      <input
        className="range" id={id} type="range" min={min} max={max} step={5} value={value} disabled={disabled}
        aria-valuetext={`${value} meter`}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div className="sl" aria-hidden="true"><span>{min} m</span><span>{max} m</span></div>
    </div>
  );
}

/** Browserlocatie (voor "Naar mijn locatie"). */
export function currentPosition(): Promise<LatLng & { accuracy: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Je browser ondersteunt geen locatie.'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: Math.round(p.coords.accuracy) }),
      (err) => reject(new Error(err.code === err.PERMISSION_DENIED
        ? 'Je browser geeft geen toegang tot je locatie. Sta dit toe in de adresbalk.'
        : 'Je locatie kon niet bepaald worden.')),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  });
}

/** Adres bij een punt op de kaart. */
export async function reverseGeocode(pos: LatLng): Promise<string | null> {
  try {
    const { result } = await api<{ result: Place | null }>(`/restaurant/geocode/reverse?lat=${pos.lat}&lng=${pos.lng}`);
    return result?.label ?? null;
  } catch {
    return null;
  }
}
