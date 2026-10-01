import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api, type LatLng, type RestaurantSettings } from '../api';
import { useAuth } from '../auth';
import { useApi } from '../useApi';
import { ZoneMap } from '../components/ZoneMap';
import { AddressSearch, RadiusSlider, currentPosition, reverseGeocode } from '../components/ZoneFields';
import '../styles/app.css';
import '../styles/settings.css';
import { useTitle } from '../useTitle';

/** Stap 2 na het registreren van een restaurant: naam, adres, pin en straal (Onboarding.dc.html). */
export default function Onboarding() {
  useTitle('Waar staat je restaurant?');
  const navigate = useNavigate();
  const { me, refresh } = useAuth();
  const { data } = useApi<RestaurantSettings>('/restaurant');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [location, setLocation] = useState<LatLng | null>(null);
  const [radius, setRadius] = useState(120);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [mapQuery, setMapQuery] = useState('');

  useEffect(() => {
    if (!data) return;
    setName(data.name);
    setAddress(data.address ?? '');
    setLocation(data.location);
    setRadius(data.radius);
  }, [data]);

  if (me && me.user.role !== 'owner') return <Navigate to="/dashboard" replace />;

  async function moveTo(pos: LatLng) {
    setLocation(pos);
    if (!address.trim()) {
      const label = await reverseGeocode(pos);
      if (label) setAddress((a) => a.trim() ? a : label);
    }
  }

  async function useMyLocation() {
    setLocating(true);
    setError('');
    try {
      const pos = await currentPosition();
      await moveTo({ lat: pos.lat, lng: pos.lng });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Locatie bepalen mislukt');
    } finally {
      setLocating(false);
    }
  }

  async function save() {
    if (!location) {
      setError('Zet eerst de pin op je restaurant: zoek je adres of klik op de kaart.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api('/restaurant', {
        method: 'PATCH',
        body: { name, address: address.trim() || null, lat: location.lat, lng: location.lng, radius },
      });
      await refresh();
      navigate('/team', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Opslaan mislukt');
      setBusy(false);
    }
  }

  return (
    <div className="app">
      <div className="onb">
        <div className="onb-l">
          <Link className="logo" to="/"><i />Klokit</Link>
          <div className="prog" aria-hidden="true"><i className="on" /><i className="on" /><i /></div>
          <div className="stp">Stap 2 van 3</div>
          <h1>Waar staat je restaurant?</h1>
          <p className="intro">Je team kan alleen inklokken binnen de cirkel op de kaart.</p>

          <div className="field">
            <label htmlFor="onb-name">Naam van je restaurant</label>
            <input className="in" id="onb-name" type="text" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <AddressSearch
            value={address} onChange={setAddress}
            onPick={(p) => { setAddress(p.label); setLocation({ lat: p.lat, lng: p.lng }); }}
            help="Sleep de pin op de kaart naar je ingang als hij niet goed staat."
          />
          <RadiusSlider value={radius} onChange={setRadius} min={data?.limits.radiusMin ?? 25} max={data?.limits.radiusMax ?? 300} />
          <div className="tip"><b>Tip:</b> binnen is GPS minder nauwkeurig. Heb je een grote zaak of terras, kies dan minimaal 100 meter.</div>

          {error && <p className="error" role="alert" style={{ marginTop: 16 }}>{error}</p>}

          <div className="onb-foot">
            <Link className="btn o" to="/dashboard">Later doen</Link>
            <button className="btn" type="button" onClick={save} disabled={busy}>{busy ? 'Opslaan…' : 'Opslaan en verder'}</button>
          </div>
        </div>

        <div className="onb-map zone-mapwrap">
          <AddressSearch
            variant="map" value={mapQuery} onChange={setMapQuery}
            onPick={(p) => { setAddress(p.label); setLocation({ lat: p.lat, lng: p.lng }); setError(''); }}
          />
          <ZoneMap location={location} radius={radius} name={name} onMove={moveTo} height="100%" />
          <button className="btn o onb-locate" type="button" onClick={useMyLocation} disabled={locating}>
            {locating ? 'Locatie bepalen…' : 'Naar mijn locatie'}
          </button>
        </div>
      </div>
    </div>
  );
}
