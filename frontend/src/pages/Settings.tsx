import { useEffect, useMemo, useState } from 'react';
import { api, type ClockRules, type LatLng, type RestaurantSettings } from '../api';
import { useAuth } from '../auth';
import { useApi } from '../useApi';
import { ZoneMap } from '../components/ZoneMap';
import { AddressSearch, RadiusSlider, currentPosition, reverseGeocode } from '../components/ZoneFields';
import '../styles/settings.css';
import { useTitle } from '../useTitle';

type Draft = {
  name: string;
  address: string;
  location: LatLng | null;
  radius: number;
  rules: ClockRules;
};

function toDraft(s: RestaurantSettings): Draft {
  return { name: s.name, address: s.address ?? '', location: s.location, radius: s.radius, rules: { ...s.rules } };
}

const sections = [
  { id: 'restaurant', label: 'Restaurant' },
  { id: 'werkzone', label: 'Werkzone' },
  { id: 'klokregels', label: 'Klokregels' },
];

const WEAK_OPTIONS = [20, 30, 50, 75];

function Switch({ id, label, help, checked, onChange, disabled }: {
  id: string; label: string; help: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <div className="tg">
      <div><b id={id}>{label}</b><small>{help}</small></div>
      <button
        type="button" role="switch" aria-checked={checked} aria-labelledby={id} disabled={disabled}
        className={`sw${checked ? ' on' : ''}`} onClick={() => onChange(!checked)}
      />
    </div>
  );
}

export default function Settings() {
  useTitle('Instellingen');
  const { me, refresh } = useAuth();
  const { data, error, loading, setData } = useApi<RestaurantSettings>('/restaurant');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [locating, setLocating] = useState(false);
  /** Zoekbalk op de kaart: los van het adresveld, zodat zoeken het adres pas verandert na het kiezen. */
  const [mapQuery, setMapQuery] = useState('');
  const [section, setSection] = useState(() => window.location.hash.slice(1) || 'restaurant');

  const canEdit = me?.user.role === 'owner';

  useEffect(() => {
    if (data && !draft) setDraft(toDraft(data));
  }, [data, draft]);

  // Naar de sectie uit de link (#werkzone) scrollen zodra de pagina er staat.
  useEffect(() => {
    if (!draft) return;
    const hash = window.location.hash.slice(1);
    if (hash) document.getElementById(hash)?.scrollIntoView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!draft]);

  const dirty = useMemo(() => !!data && !!draft && JSON.stringify(toDraft(data)) !== JSON.stringify(draft), [data, draft]);

  // Waarschuwen bij weggaan met niet-opgeslagen wijzigingen.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const update = (patch: Partial<Draft>) => {
    setMessage(null);
    setDraft((d) => (d ? { ...d, ...patch } : d));
  };
  const updateRules = (patch: Partial<ClockRules>) => setDraft((d) => (d ? { ...d, rules: { ...d.rules, ...patch } } : d));

  async function moveTo(pos: LatLng) {
    update({ location: pos });
    if (draft && !draft.address.trim()) {
      const label = await reverseGeocode(pos);
      if (label) setDraft((d) => (d && !d.address.trim() ? { ...d, address: label } : d));
    }
  }

  async function useMyLocation() {
    setLocating(true);
    setMessage(null);
    try {
      const pos = await currentPosition();
      await moveTo({ lat: pos.lat, lng: pos.lng });
      if (pos.accuracy > 50) {
        setMessage({ ok: false, text: `Je locatie is onnauwkeurig (±${pos.accuracy} m). Controleer de pin en sleep hem zo nodig naar je ingang.` });
      }
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : 'Locatie bepalen mislukt' });
    } finally {
      setLocating(false);
    }
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    setMessage(null);
    try {
      const saved = await api<RestaurantSettings>('/restaurant', {
        method: 'PATCH',
        body: {
          name: draft.name,
          address: draft.address.trim() || null,
          radius: draft.radius,
          rules: draft.rules,
          ...(draft.location ? { lat: draft.location.lat, lng: draft.location.lng } : {}),
        },
      });
      setData(saved);
      setDraft(toDraft(saved));
      await refresh();
      setMessage({ ok: true, text: 'Wijzigingen opgeslagen.' });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : 'Opslaan mislukt' });
    } finally {
      setSaving(false);
    }
  }

  const saveButton = (
    <button className="btn" type="button" onClick={save} disabled={!canEdit || !dirty || saving}>
      {saving ? 'Opslaan…' : 'Wijzigingen opslaan'}
    </button>
  );

  return (
    <>
      <div className="head">
        <div>
          <h1>Instellingen</h1>
          <p>{data?.name ?? me?.restaurant.name}</p>
        </div>
        <div className="acts">{canEdit && saveButton}</div>
      </div>

      {error && <p className="error" role="alert">{error}</p>}
      {loading && !draft && <p className="muted">Instellingen laden…</p>}
      {!canEdit && draft && (
        <p className="notice">Je kunt de instellingen bekijken. Alleen de eigenaar kan ze aanpassen.</p>
      )}
      {message && <p className={message.ok ? 'notice ok' : 'error'} role={message.ok ? 'status' : 'alert'}>{message.text}</p>}

      {draft && data && (
        <div className="set-grid">
          <nav className="sub" aria-label="Instellingen">
            {sections.map((s) => (
              <a
                key={s.id} href={`#${s.id}`} className={section === s.id ? 'on' : undefined}
                aria-current={section === s.id ? 'location' : undefined} onClick={() => setSection(s.id)}
              >
                {s.label}
              </a>
            ))}
          </nav>

          <div>
            <section className="panel sec" id="restaurant" aria-labelledby="restaurant-titel">
              <h3 id="restaurant-titel">Restaurant</h3>
              <div className="two">
                <div className="field">
                  <label htmlFor="set-name">Naam</label>
                  <input className="in" id="set-name" type="text" value={draft.name} disabled={!canEdit}
                    onChange={(e) => update({ name: e.target.value })} />
                </div>
                <AddressSearch
                  value={draft.address} disabled={!canEdit}
                  onChange={(address) => update({ address })}
                  onPick={(p) => update({ address: p.label, location: { lat: p.lat, lng: p.lng } })}
                  help="Kies een adres uit de lijst om de pin daar te zetten."
                />
              </div>
              <div className="two">
                <div className="field">
                  <label htmlFor="set-radius-view">Straal</label>
                  <input className="in" id="set-radius-view" type="text" value={`${draft.radius} meter`} readOnly />
                  <div className="help"><a href="#werkzone" onClick={() => setSection('werkzone')}>Aanpassen bij Werkzone</a></div>
                </div>
                <div className="field">
                  <label htmlFor="set-tz">Tijdzone</label>
                  <input className="in" id="set-tz" type="text" value={data.timeZone} readOnly />
                  <div className="help">Uren en middernacht worden in deze tijdzone berekend.</div>
                </div>
              </div>
            </section>

            <section className="panel sec" id="werkzone" aria-labelledby="werkzone-titel">
              <h3 id="werkzone-titel">
                Werkzone
                {draft.location ? <span className="pill g">Ingesteld</span> : <span className="pill r">Nog niet ingesteld</span>}
              </h3>
              <p className="muted sec-intro">Je team kan alleen inklokken binnen de cirkel op de kaart.</p>
              <div className="zone">
                <div className="zone-mapwrap">
                  {canEdit && (
                    <AddressSearch
                      variant="map" value={mapQuery} onChange={setMapQuery}
                      onPick={(p) => update({ address: p.label, location: { lat: p.lat, lng: p.lng } })}
                    />
                  )}
                  <ZoneMap
                    location={draft.location} radius={draft.radius} name={draft.name}
                    onMove={canEdit ? moveTo : undefined} height={440}
                  />
                </div>
                <div className="zone-side">
                  <RadiusSlider
                    value={draft.radius} min={data.limits.radiusMin} max={data.limits.radiusMax}
                    onChange={(radius) => update({ radius })} disabled={!canEdit}
                  />
                  {canEdit && (
                    <button className="btn o full" type="button" onClick={useMyLocation} disabled={locating}>
                      {locating ? 'Locatie bepalen…' : 'Pin op mijn locatie'}
                    </button>
                  )}
                  <div className="tip"><b>Tip:</b> binnen is GPS minder nauwkeurig. Heb je een grote zaak of terras, kies dan minimaal 100 meter.</div>
                  {draft.location && (
                    <p className="coords">
                      {draft.location.lat.toFixed(5)}, {draft.location.lng.toFixed(5)} ·{' '}
                      <a href={`https://www.openstreetmap.org/?mlat=${draft.location.lat}&mlon=${draft.location.lng}#map=18/${draft.location.lat}/${draft.location.lng}`}
                        target="_blank" rel="noreferrer">Open in kaart</a>
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className="panel sec" id="klokregels" aria-labelledby="regels-titel">
              <h3 id="regels-titel">Klokregels</h3>
              <Switch
                id="r1" label="Nep-locaties blokkeren" checked={draft.rules.blockMocked} disabled={!canEdit}
                help="Inklokken met nep-GPS weigeren waar het toestel dat meldt (Android)."
                onChange={(blockMocked) => updateRules({ blockMocked })}
              />
              <div className="tg">
                <div>
                  <b id="r2">Zwakke GPS markeren</b>
                  <small>
                    Markeer punches met een nauwkeurigheid slechter dan{' '}
                    <select
                      aria-label="Grens voor zwakke GPS" className="inline-select"
                      value={draft.rules.weakGpsM ?? 30} disabled={!canEdit || draft.rules.weakGpsM === null}
                      onChange={(e) => updateRules({ weakGpsM: Number(e.target.value) })}
                    >
                      {WEAK_OPTIONS.map((m) => <option key={m} value={m}>{m} m</option>)}
                    </select>
                  </small>
                </div>
                <button
                  type="button" role="switch" aria-checked={draft.rules.weakGpsM !== null} aria-labelledby="r2" disabled={!canEdit}
                  className={`sw${draft.rules.weakGpsM !== null ? ' on' : ''}`}
                  onClick={() => updateRules({ weakGpsM: draft.rules.weakGpsM === null ? 30 : null })}
                />
              </div>
              <Switch
                id="r3" label="Automatisch uitklokken" checked={draft.rules.autoClockOut} disabled={!canEdit}
                help="Stop een dienst om middernacht als niemand uitklokt. Er komt dan een correctie klaar om na te kijken."
                onChange={(autoClockOut) => updateRules({ autoClockOut })}
              />
            </section>
          </div>
        </div>
      )}

      {canEdit && dirty && (
        <div className="savebar" role="region" aria-label="Niet-opgeslagen wijzigingen">
          <span>Je hebt wijzigingen die nog niet zijn opgeslagen.</span>
          <div className="acts">
            <button className="btn o" type="button" onClick={() => data && setDraft(toDraft(data))}>Ongedaan maken</button>
            {saveButton}
          </div>
        </div>
      )}
    </>
  );
}
