import { Link } from 'react-router-dom';
import '../styles/app.css';
import { useTitle } from '../useTitle';

type Props = { title: string; standalone?: boolean };

export default function ComingSoon({ title, standalone }: Props) {
  useTitle(title);
  const body = (
    <div className="panel" style={{ maxWidth: 520 }}>
      <h1 style={{ fontSize: 30, marginBottom: 8 }}>{title}</h1>
      <p style={{ color: 'var(--mute)', marginBottom: 20 }}>Deze pagina wordt nog gebouwd.</p>
      <Link className="btn o" to={standalone ? '/' : '/dashboard'}>
        {standalone ? 'Naar de homepage' : 'Terug naar overzicht'}
      </Link>
    </div>
  );

  if (!standalone) return body;

  return (
    <div className="app" style={{ display: 'grid', placeItems: 'center', padding: 16 }}>
      {body}
    </div>
  );
}
