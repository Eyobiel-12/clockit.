import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import '../styles/app.css';
import { useTitle } from '../useTitle';

/** Startpagina voor medewerkers: het beheerdashboard is voor eigenaren en managers. */
export default function Welcome() {
  useTitle('Welkom');
  const { me, logout } = useAuth();
  const navigate = useNavigate();
  if (!me) return null;
  const pending = me.user.status === 'pending';

  return (
    <div className="app" style={{ display: 'grid', placeItems: 'center', padding: 16 }}>
      <div className="panel" style={{ maxWidth: 520 }}>
        <h1 style={{ fontSize: 30, marginBottom: 8 }}>Welkom, {me.user.firstName}</h1>
        <p className="muted" style={{ marginBottom: 20 }}>
          {pending
            ? `Je aanmelding bij ${me.restaurant.name} wacht op bevestiging van je leidinggevende. Daarna kun je inklokken.`
            : `Je hoort bij het team van ${me.restaurant.name}. Inklokken doe je straks met je telefoon via de Klokit-app.`}
        </p>
        <button className="btn o" type="button" onClick={async () => { await logout(); navigate('/'); }}>
          Uitloggen
        </button>
      </div>
    </div>
  );
}
