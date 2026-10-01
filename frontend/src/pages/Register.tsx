import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { homeFor, useAuth } from '../auth';
import '../styles/app.css';
import '../styles/register.css';
import { useTitle } from '../useTitle';

type Mode = 'owner' | 'code';

const ownerSteps = [
  { title: 'Account maken', text: 'Je naam, e-mail en wachtwoord.' },
  { title: 'Restaurant op de kaart', text: 'Pin je zaak en kies een straal.' },
  { title: 'Team uitnodigen', text: 'Deel een code van 6 cijfers.' },
];

const codeSteps = [
  { title: 'Account maken', text: 'Met de code van je leidinggevende.' },
  { title: 'Bevestiging afwachten', text: 'Je leidinggevende keurt je aanmelding goed.' },
  { title: 'Inklokken', text: 'Klok in met je telefoon als je op de zaak bent.' },
];

export default function Register() {
  useTitle('Account maken');
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [params] = useSearchParams();
  const initialCode = params.get('code') ?? '';
  const [mode, setMode] = useState<Mode>(params.get('mode') === 'code' || initialCode ? 'code' : 'owner');
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '', restaurantName: '', code: initialCode,
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (form.password.length < 8) {
      setError('Je wachtwoord moet minimaal 8 tekens hebben.');
      return;
    }
    setBusy(true);
    setError('');
    const { restaurantName, code, ...person } = form;
    try {
      await api('/auth/register', {
        method: 'POST',
        body: mode === 'owner' ? { mode, ...person, restaurantName } : { mode, ...person, code: code.replace(/\s/g, '') },
      });
      const me = await refresh();
      // Nieuwe eigenaar: eerst het restaurant op de kaart zetten (stap 2 van 3).
      navigate(mode === 'owner' ? '/onboarding' : homeFor(me), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Account maken mislukt');
      setBusy(false);
    }
  }

  const steps = mode === 'owner' ? ownerSteps : codeSteps;

  return (
    <div className="app reg">
      <div className="reg-top">
        <Link className="logo" to="/"><i />Klokit</Link>
        <span>Al een account? <Link to="/login">Inloggen</Link></span>
      </div>

      <div className="reg-box">
        <form className="reg-form" onSubmit={handleSubmit} noValidate>
          <h1>Account maken</h1>
          <p className="intro">Gratis voor teams tot 5 medewerkers.</p>

          <div className="seg2" role="group" aria-label="Soort account">
            <button type="button" className={mode === 'owner' ? 'on' : ''} aria-pressed={mode === 'owner'} onClick={() => setMode('owner')}>
              Ik ben eigenaar
            </button>
            <button type="button" className={mode === 'code' ? 'on' : ''} aria-pressed={mode === 'code'} onClick={() => setMode('code')}>
              Ik heb een code
            </button>
          </div>

          {mode === 'code' && (
            <div className="field">
              <label htmlFor="reg-code">Uitnodigingscode</label>
              <input
                className="in code-in" id="reg-code" inputMode="numeric" autoComplete="one-time-code"
                maxLength={7} placeholder="123456" value={form.code} onChange={set('code')} required
              />
              <div className="help">6 cijfers, die krijg je van je leidinggevende.</div>
            </div>
          )}

          <div className="two">
            <div className="field">
              <label htmlFor="reg-first">Voornaam</label>
              <input className="in" id="reg-first" type="text" autoComplete="given-name" value={form.firstName} onChange={set('firstName')} required />
            </div>
            <div className="field">
              <label htmlFor="reg-last">Achternaam</label>
              <input className="in" id="reg-last" type="text" autoComplete="family-name" value={form.lastName} onChange={set('lastName')} required />
            </div>
          </div>

          {mode === 'owner' && (
            <div className="field">
              <label htmlFor="reg-rest">Naam van je restaurant</label>
              <input className="in" id="reg-rest" type="text" autoComplete="organization" value={form.restaurantName} onChange={set('restaurantName')} required />
            </div>
          )}

          <div className="field">
            <label htmlFor="reg-mail">E-mailadres</label>
            <input className="in" id="reg-mail" type="email" autoComplete="email" value={form.email} onChange={set('email')} required />
          </div>
          <div className="field">
            <label htmlFor="reg-pw">Wachtwoord</label>
            <input
              className="in" id="reg-pw" type="password" autoComplete="new-password" minLength={8}
              value={form.password} onChange={set('password')} required aria-describedby="reg-pw-help"
            />
            <div className="help" id="reg-pw-help">Minimaal 8 tekens</div>
          </div>

          {error && <p className="error" role="alert">{error}</p>}

          <p className="terms">Door een account te maken ga je akkoord met de voorwaarden en het privacybeleid.</p>
          <button className="btn full" type="submit" disabled={busy}>{busy ? 'Account maken…' : 'Account maken'}</button>
        </form>

        <div className="reg-steps">
          <h2>Zo ben je klaar</h2>
          <ol>
            {steps.map((s, i) => (
              <li key={s.title} className={`step${i === 0 ? ' on' : ''}`}>
                <div className="n" aria-hidden="true">{i + 1}</div>
                <div><b>{s.title}</b><p>{s.text}</p></div>
              </li>
            ))}
          </ol>
          <div className="reg-note">Klokit gebruikt de locatie van je team alleen op het moment van in- en uitklokken.</div>
        </div>
      </div>
    </div>
  );
}
