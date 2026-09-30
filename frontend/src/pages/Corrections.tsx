import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, type Correction, type CorrectionStatus, type CorrectionsData, type TimeSpan } from '../api';
import { useAuth } from '../auth';
import { useApi } from '../useApi';
import { useTitle } from '../useTitle';
import '../styles/corrections.css';

const TABS: { key: CorrectionStatus; label: string }[] = [
  { key: 'pending', label: 'Open' },
  { key: 'approved', label: 'Goedgekeurd' },
  { key: 'rejected', label: 'Afgewezen' },
];

const statusPill: Record<CorrectionStatus, { cls: string; label: string }> = {
  pending: { cls: 'r', label: 'Open' },
  approved: { cls: 'g', label: 'Goedgekeurd' },
  rejected: { cls: 'gr', label: 'Afgewezen' },
};

function Times({ title, span, empty, tone }: { title: string; span: TimeSpan | null; empty: string; tone: 'old' | 'new' }) {
  return (
    <div className={tone}>
      <small>{title}</small>
      {span ? (
        <>
          <b>{span.clockIn} – {span.clockOut ?? '…'}</b>
          {span.duration ? `${span.duration} uur` : 'nog niet uitgeklokt'}
        </>
      ) : <p className="none">{empty}</p>}
    </div>
  );
}

function Detail({ c, canDecide, onDone }: { c: Correction; canDecide: boolean; onDone: (next: Correction) => void }) {
  const [note, setNote] = useState('');
  const [editing, setEditing] = useState(false);
  const [times, setTimes] = useState(c.prefill);
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setNote('');
    setEditing(false);
    setTimes(c.prefill);
    setError('');
  }, [c.id, c.prefill]);

  async function decide(decision: 'approve' | 'reject') {
    setBusy(decision);
    setError('');
    try {
      const next = await api<Correction>(`/corrections/${c.id}/decide`, {
        method: 'POST',
        body: { decision, note: note.trim() || undefined, ...(decision === 'approve' && editing ? { times } : {}) },
      });
      onDone(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Opslaan mislukt');
      // Nog geen tijden bekend: meteen het aanpassen openzetten.
      if (decision === 'approve' && !editing && !c.requested) setEditing(true);
    } finally {
      setBusy(null);
    }
  }

  const pill = statusPill[c.status];
  const target = c.status === 'approved' ? c.applied : c.requested;

  return (
    <section className="panel" aria-labelledby="cor-titel">
      <h3 id="cor-titel">{c.user.name} · {c.dayLong} <span className={`pill ${pill.cls}`}>{pill.label}</span></h3>
      <p className="muted cor-type">{c.typeLabel}{c.automatic ? ' · automatisch aangemaakt' : ''}</p>

      <div className="cmp">
        <Times title={c.status === 'pending' ? 'Nu geregistreerd' : 'Was geregistreerd'} span={c.current} empty="Geen dienst geregistreerd" tone="old" />
        <Times
          title={c.status === 'approved' ? 'Goedgekeurd' : 'Aangevraagd'} span={target}
          empty={c.automatic ? 'Nog geen tijd: vul de juiste uitkloktijd in' : 'Geen tijden opgegeven'} tone="new"
        />
      </div>

      <div className="msg">
        <small>{c.automatic ? 'Waarom deze correctie' : `Toelichting van ${c.user.firstName}`}</small>
        <p>{c.automatic ? `${c.user.firstName} klokte niet uit. Klokit stopte de dienst om middernacht. Controleer de uitkloktijd.` : c.reason || '—'}</p>
      </div>

      <h4>Geschiedenis</h4>
      <ol className="log">
        {c.history.map((h, i) => (
          <li key={i}><b>{h.title}</b> {h.detail} {h.note && <small>({h.note})</small>}</li>
        ))}
      </ol>

      {c.decision?.note && (
        <div className="msg"><small>Opmerking van {c.decision.by}</small><p>{c.decision.note}</p></div>
      )}

      {c.status === 'pending' && canDecide && (
        <>
          {editing && (
            <fieldset className="edit-times">
              <legend>Tijd aanpassen</legend>
              <div className="three">
                <div className="field">
                  <label htmlFor="cor-date">Datum</label>
                  <input className="in" id="cor-date" type="date" value={times.date} max={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setTimes({ ...times, date: e.target.value })} />
                </div>
                <div className="field">
                  <label htmlFor="cor-in">Ingeklokt</label>
                  <input className="in" id="cor-in" type="time" value={times.clockIn} onChange={(e) => setTimes({ ...times, clockIn: e.target.value })} />
                </div>
                <div className="field">
                  <label htmlFor="cor-out">Uitgeklokt</label>
                  <input className="in" id="cor-out" type="time" value={times.clockOut} onChange={(e) => setTimes({ ...times, clockOut: e.target.value })} />
                </div>
              </div>
              <p className="help">Is de uitkloktijd vroeger dan de inkloktijd, dan telt die voor de volgende dag (nachtdienst).</p>
            </fieldset>
          )}
          <div className="field" style={{ marginTop: 18 }}>
            <label htmlFor="cor-note">Opmerking (optioneel)</label>
            <textarea className="in" id="cor-note" placeholder="Bijvoorbeeld: bevestigd met Mehmet" value={note}
              onChange={(e) => setNote(e.target.value)} maxLength={500} />
          </div>
          {error && <p className="error" role="alert">{error}</p>}
          <div className="acts2">
            <button className="btn" type="button" onClick={() => decide('approve')} disabled={!!busy}>
              {busy === 'approve' ? 'Opslaan…' : editing ? 'Opslaan en goedkeuren' : 'Goedkeuren'}
            </button>
            <button className="btn o" type="button" onClick={() => setEditing((e) => !e)} disabled={!!busy} aria-expanded={editing}>
              {editing ? 'Annuleren' : 'Tijd aanpassen'}
            </button>
            <button className="btn r" type="button" onClick={() => decide('reject')} disabled={!!busy}>
              {busy === 'reject' ? 'Afwijzen…' : 'Afwijzen'}
            </button>
          </div>
        </>
      )}
    </section>
  );
}

export default function Corrections() {
  useTitle('Correcties');
  const { me, refresh } = useAuth();
  const [params, setParams] = useSearchParams();
  const status = (['pending', 'approved', 'rejected'].includes(params.get('status') ?? '') ? params.get('status') : 'pending') as CorrectionStatus;
  const { data, error, loading, reload } = useApi<CorrectionsData>(`/corrections?status=${status}`);
  const [message, setMessage] = useState('');

  const wantedId = Number(params.get('id')) || null;
  const selected = data?.items.find((c) => c.id === wantedId) ?? data?.items[0] ?? null;

  const select = (id: number | null, nextStatus = status) => {
    const p = new URLSearchParams();
    if (nextStatus !== 'pending') p.set('status', nextStatus);
    if (id) p.set('id', String(id));
    setParams(p, { replace: true });
  };

  async function done(c: Correction) {
    setMessage(`${c.user.firstName}: ${c.status === 'approved' ? 'goedgekeurd' : 'afgewezen'}.`);
    // Volgende open correctie selecteren.
    const rest = data?.items.filter((x) => x.id !== c.id) ?? [];
    select(rest[0]?.id ?? null);
    await Promise.all([reload(), refresh()]);
  }

  return (
    <>
      <div className="head">
        <div>
          <h1>Correcties</h1>
          <p>Aanvragen van je team om een tijd aan te passen</p>
        </div>
      </div>

      {error && <p className="error" role="alert">{error}</p>}
      {message && <p className="notice ok" role="status">{message}</p>}
      {loading && !data && <p className="muted">Correcties laden…</p>}

      {data && (
        <div className="cor-grid">
          <section className="panel" aria-label="Aanvragen">
            <div className="tabs" role="group" aria-label="Filter">
              {TABS.map((t) => (
                <button key={t.key} type="button" className={status === t.key ? 'on' : undefined} aria-pressed={status === t.key}
                  onClick={() => { setMessage(''); select(null, t.key); }}>
                  {t.label} ({data.counts[t.key]})
                </button>
              ))}
            </div>
            {data.items.length === 0 && (
              <p className="muted empty">{status === 'pending' ? 'Geen open correcties. Alles is bijgewerkt.' : 'Nog niets hier.'}</p>
            )}
            <ul className="req-list">
              {data.items.map((c) => (
                <li key={c.id}>
                  <button type="button" className={`req${selected?.id === c.id ? ' on' : ''}`} aria-pressed={selected?.id === c.id}
                    onClick={() => select(c.id)}>
                    <div className="av" aria-hidden="true">{c.user.initials}</div>
                    <div className="req-main">
                      <b>{c.user.name}</b>
                      <small>{c.typeLabel} · {c.dayShort}</small>
                    </div>
                    <div className="rr">
                      {c.delta && <span className={`pill ${c.status === 'pending' ? (c.current ? 'r' : 'y') : statusPill[c.status].cls}`}>{c.delta}</span>}
                      <small>{c.status === 'pending' ? c.createdAgo : c.decision?.ago}</small>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {selected ? (
            <Detail c={selected} canDecide={me?.user.role !== 'employee'} onDone={done} />
          ) : (
            <section className="panel"><p className="muted">Kies links een aanvraag.</p></section>
          )}
        </div>
      )}
    </>
  );
}
