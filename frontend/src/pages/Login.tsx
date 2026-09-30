import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { homeFor, useAuth } from '../auth';
import '../styles/app.css';
import '../styles/login.css';
import { useTitle } from '../useTitle';

export default function Login() {
  useTitle('Inloggen');
  const navigate = useNavigate();
  const location = useLocation();
  const { refresh } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [keep, setKeep] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Vul je e-mailadres en wachtwoord in.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api('/auth/login', { method: 'POST', body: { email, password, remember: keep } });
      const me = await refresh();
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from && me?.user.role !== 'employee' ? from : homeFor(me), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Inloggen mislukt');
      setBusy(false);
    }
  }

  return (
    <div className="app">
      <div className="login">
        <div className="login-l">
          <Link className="logo" to="/"><i />Klokit</Link>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <h1>Welkom terug</h1>
            <p className="intro">Log in om je team en uren te bekijken.</p>

            <div className="field">
              <label htmlFor="login-mail">E-mailadres</label>
              <input
                className="in" id="login-mail" type="email" autoComplete="email"
                placeholder="naam@restaurant.nl"
                value={email} onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!error && !email.trim()}
              />
            </div>
            <div className="field">
              <label htmlFor="login-pw">Wachtwoord</label>
              <input
                className="in" id="login-pw" type="password" autoComplete="current-password"
                value={password} onChange={(e) => setPassword(e.target.value)}
                aria-invalid={!!error && !password}
              />
            </div>

            {error && <p className="error" role="alert">{error}</p>}

            <div className="login-row">
              <label className="chk" htmlFor="login-keep">
                <input type="checkbox" id="login-keep" checked={keep} onChange={(e) => setKeep(e.target.checked)} />
                Ingelogd blijven
              </label>
              <Link to="/wachtwoord-vergeten">Wachtwoord vergeten?</Link>
            </div>

            <button className="btn full" type="submit" disabled={busy}>{busy ? 'Bezig met inloggen…' : 'Inloggen'}</button>

            <div className="or">of</div>

            <div className="code">
              <b>Heb je een uitnodigingscode?</b>
              Maak een account als medewerker en je komt meteen in het juiste team.{' '}
              <Link to="/registreren?mode=code">Code invoeren</Link>
            </div>
          </form>

          <p className="bottom">Nog geen account? <Link to="/registreren">Maak een restaurant aan</Link></p>
        </div>

        <div className="login-r">
          <svg viewBox="0 0 720 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <rect width="720" height="900" fill="#0E3B43" />
            <g fill="#155059">
              <rect x="40" y="60" width="200" height="160" rx="10" />
              <rect x="280" y="60" width="180" height="160" rx="10" />
              <rect x="500" y="60" width="200" height="160" rx="10" />
              <rect x="40" y="260" width="200" height="220" rx="10" />
              <rect x="500" y="260" width="200" height="220" rx="10" />
              <rect x="40" y="520" width="200" height="160" rx="10" />
              <rect x="280" y="520" width="180" height="160" rx="10" />
              <rect x="500" y="520" width="200" height="160" rx="10" />
            </g>
            <circle cx="370" cy="370" r="150" fill="#FFC845" fillOpacity=".12" stroke="#FFC845" strokeWidth="3" strokeDasharray="10 8" />
            <g transform="translate(370 370)">
              <path d="M0 0 C-26 -36 -40 -52 -40 -74 A40 40 0 1 1 40 -74 C40 -52 26 -36 0 0Z" fill="#FFC845" />
              <circle cy="-74" r="14" fill="#0E3B43" />
            </g>
            <g stroke="#0E3B43" strokeWidth="4" fill="#1FA56B">
              <circle cx="310" cy="420" r="10" />
              <circle cx="440" cy="400" r="10" />
              <circle cx="330" cy="300" r="10" />
            </g>
          </svg>
          <div className="quote">
            <h2>3 medewerkers in dienst bij Eetcafé De Kade</h2>
            <p>Allemaal ingeklokt binnen 120 meter van de zaak.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
