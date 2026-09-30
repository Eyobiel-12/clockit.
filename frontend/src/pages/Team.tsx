import { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { api, roleLabel, type TeamData, type TeamMember } from '../api';
import { useAuth } from '../auth';
import { useApi } from '../useApi';
import '../styles/team.css';
import { useTitle } from '../useTitle';

const statusPill = {
  on: <span className="pill g">In dienst</span>,
  off: <span className="pill gr">Niet in dienst</span>,
  pending: <span className="pill y">Wacht op bevestiging</span>,
};

type Action = { label: string; danger?: boolean; run: () => Promise<void> };

function MemberMenu({ member, actions }: { member: TeamMember; actions: Action[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!actions.length) return null;

  return (
    <div className="menu-wrap" ref={ref}>
      <button
        className="more" type="button" aria-haspopup="menu" aria-expanded={open}
        aria-label={`Opties voor ${member.name}`} onClick={() => setOpen((o) => !o)}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
        </svg>
      </button>
      {open && (
        <ul className="menu" role="menu">
          {actions.map((a) => (
            <li key={a.label} role="none">
              <button
                type="button" role="menuitem" className={a.danger ? 'danger' : undefined}
                onClick={async () => { setOpen(false); await a.run(); }}
              >
                {a.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function InvitePanel({ invite, onNewCode }: { invite: TeamData['invite']; onNewCode: () => Promise<void> }) {
  const [qr, setQr] = useState('');
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/registreren?code=${invite.code}`;
  const expires = new Date(invite.expiresAt).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' });

  useEffect(() => {
    QRCode.toDataURL(url, { margin: 0, width: 200, color: { dark: '#0E3B43', light: '#FFFFFF' } })
      .then(setQr)
      .catch(() => setQr(''));
  }, [url]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Kopieer deze link:', url);
    }
  }

  return (
    <section className="panel inv" aria-labelledby="inv-titel">
      <h3 id="inv-titel">Nodig je team uit</h3>
      <p>Deel deze code. Nieuwe medewerkers voeren hem in bij het aanmelden en komen direct in je team.</p>
      <div className="code-digits" aria-label={`Uitnodigingscode ${invite.code.split('').join(' ')}`}>
        {invite.code.split('').map((d, i) => <span key={i} aria-hidden="true">{d}</span>)}
      </div>
      <p>
        Geldig tot {expires} ·{' '}
        <button type="button" className="linklike" onClick={onNewCode}>Nieuwe code maken</button>
      </p>
      <div className="invite-link">
        <span>{url.replace(/^https?:\/\//, '')}</span>
        <button className="copy" type="button" onClick={copy}>{copied ? 'Gekopieerd' : 'Kopiëren'}</button>
      </div>
      <span className="sr-only" role="status">{copied ? 'Link gekopieerd' : ''}</span>
      {qr && <img className="qr" src={qr} alt="QR-code met de uitnodigingslink" width={120} height={120} />}
    </section>
  );
}

export default function Team() {
  useTitle('Team');
  const { me, refresh } = useAuth();
  const { data, error, loading, reload, setData } = useApi<TeamData>('/team');
  const [query, setQuery] = useState('');
  const [dept, setDept] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');

  const isOwner = me?.user.role === 'owner';

  const visible = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.members.filter((m) =>
      (!dept || m.department === dept) &&
      (!q || m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)));
  }, [data, query, dept]);

  async function act(fn: () => Promise<unknown>) {
    setActionError('');
    try {
      await fn();
      await Promise.all([reload(), refresh()]);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Actie mislukt');
    }
  }

  function actionsFor(m: TeamMember): Action[] {
    if (m.role === 'owner' || m.id === me?.user.id) return [];
    if (m.status === 'pending') {
      return [
        { label: 'Aanmelding bevestigen', run: () => act(() => api(`/team/${m.id}`, { method: 'PATCH', body: { status: 'active' } })) },
        {
          label: 'Aanmelding weigeren', danger: true,
          run: () => act(async () => {
            if (window.confirm(`Aanmelding van ${m.name} weigeren?`)) await api(`/team/${m.id}`, { method: 'DELETE' });
          }),
        },
      ];
    }
    if (!isOwner) return [];
    return [
      m.role === 'manager'
        ? { label: 'Maak medewerker', run: () => act(() => api(`/team/${m.id}`, { method: 'PATCH', body: { role: 'employee' } })) }
        : { label: 'Maak manager', run: () => act(() => api(`/team/${m.id}`, { method: 'PATCH', body: { role: 'manager' } })) },
      {
        label: 'Verwijderen uit team', danger: true,
        run: () => act(async () => {
          if (window.confirm(`${m.name} verwijderen uit het team? Diens uren worden ook verwijderd.`)) {
            await api(`/team/${m.id}`, { method: 'DELETE' });
          }
        }),
      },
    ];
  }

  async function newCode() {
    await act(async () => {
      const invite = await api<TeamData['invite']>('/team/invite-code', { method: 'POST' });
      setData((d) => (d ? { ...d, invite } : d));
    });
  }

  const pending = data?.members.filter((m) => m.status === 'pending').length ?? 0;

  return (
    <>
      <div className="head">
        <div>
          <h1>Team</h1>
          {data && (
            <p>
              {data.members.length} medewerkers
              {pending > 0 && ` · ${pending} ${pending === 1 ? 'wacht' : 'wachten'} op bevestiging`}
            </p>
          )}
        </div>
        <div className="acts">
          <label htmlFor="team-search" className="sr-only">Zoek op naam</label>
          <input
            className="in search" id="team-search" type="search" placeholder="Zoek op naam"
            value={query} onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {(error || actionError) && <p className="error" role="alert">{error || actionError}</p>}
      {loading && !data && <p className="muted">Team laden…</p>}

      {data && (
        <div className="team-grid">
          <section className="panel" aria-label="Medewerkers">
            <div className="tabs" role="group" aria-label="Afdeling">
              {[null, ...data.departments].map((d) => (
                <button key={d ?? 'all'} type="button" className={dept === d ? 'on' : ''} aria-pressed={dept === d} onClick={() => setDept(d)}>
                  {d ?? 'Iedereen'}
                </button>
              ))}
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Naam</th>
                    <th scope="col">Afdeling</th>
                    <th scope="col">Rol</th>
                    <th scope="col">Status</th>
                    <th scope="col" className="num">Deze week</th>
                    <th scope="col"><span className="sr-only">Opties</span></th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <div className="who">
                          <div className="av" aria-hidden="true">{m.initials}</div>
                          <div>{m.name}<small>{m.email}</small></div>
                        </div>
                      </td>
                      <td>{m.department ?? '—'}</td>
                      <td>{roleLabel[m.role]}</td>
                      <td>{statusPill[m.status]}</td>
                      <td className="num">{m.weekHours}</td>
                      <td className="num"><MemberMenu member={m} actions={actionsFor(m)} /></td>
                    </tr>
                  ))}
                  {visible.length === 0 && (
                    <tr><td colSpan={6} className="muted">Niemand gevonden.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <div className="team-side">
            <InvitePanel invite={data.invite} onNewCode={newCode} />
            <section className="panel" aria-labelledby="rollen-titel">
              <h3 id="rollen-titel">Rollen</h3>
              <p className="role-text"><b>Manager</b> keurt correcties goed en ziet wie er in dienst is.</p>
              <p className="role-text"><b>Medewerker</b> klokt in en uit en ziet alleen de eigen uren.</p>
            </section>
          </div>
        </div>
      )}
    </>
  );
}
