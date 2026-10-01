import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { Period, ShiftDetail, TimesheetData } from '../api';
import { useApi } from '../useApi';
import { useTitle } from '../useTitle';
import '../styles/timesheet.css';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'day', label: 'Dag' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Maand' },
];

function StatusPill({ s }: { s: ShiftDetail }) {
  if (s.correctionId) return <Link className="pill r" to={`/correcties?id=${s.correctionId}`}>Correctie open</Link>;
  if (s.open) return <span className="pill y">Loopt nog</span>;
  if (s.manual) return <span className="pill">Handmatig</span>;
  if (s.corrected) return <span className="pill">Gecorrigeerd</span>;
  if (s.autoClosed) return <span className="pill gr">Automatisch gestopt</span>;
  return <span className="pill g">Oké</span>;
}

/** Details van één dienst (paneel "Joost Bakker · di 29 sep" in het design). */
function ShiftCard({ s }: { s: ShiftDetail }) {
  return (
    <div className="shift-card">
      <div className="ent"><span>Ingeklokt</span><b>{s.clockIn}{s.distance ? ` · ${s.distance}` : ''}</b></div>
      <div className="ent">
        <span>Uitgeklokt</span>
        {s.open ? <b className="warn">Nog in dienst</b> : s.autoClosed ? <b className="bad">Niet gedaan</b> : <b>{s.clockOut}</b>}
      </div>
      {s.autoClosed && <div className="ent"><span>Automatisch gestopt</span><b>{s.clockOut}</b></div>}
      <div className="ent"><span>Duur</span><b>{s.duration}</b></div>
      {s.accuracy && (
        <div className="ent"><span>GPS</span><b>{s.accuracy}{s.mocked ? ' · nep-GPS gemeld' : s.weak ? ' · zwak' : ''}</b></div>
      )}
      <div className="ent"><span>Status</span><StatusPill s={s} /></div>
    </div>
  );
}

export default function Timesheet() {
  useTitle('Urenoverzicht');
  const [params, setParams] = useSearchParams();
  const period = (['day', 'week', 'month'].includes(params.get('periode') ?? '') ? params.get('periode') : 'week') as Period;
  const date = params.get('datum') ?? '';
  const { data, error, loading } = useApi<TimesheetData>(`/timesheet?period=${period}${date ? `&date=${date}` : ''}`, 60_000);
  const [selected, setSelected] = useState<{ userId: number; col: number } | null>(null);

  const go = (next: { periode?: Period; datum?: string }) => {
    const p = new URLSearchParams(params);
    if (next.periode) p.set('periode', next.periode);
    if (next.datum !== undefined) {
      if (next.datum) p.set('datum', next.datum);
      else p.delete('datum');
    }
    setParams(p, { replace: true });
    setSelected(null);
  };

  // Standaard de eerste cel met een open correctie tonen, zoals in het design.
  useEffect(() => {
    if (!data || selected || data.period === 'day') return;
    for (const r of data.rows) {
      const col = r.cells.findIndex((c) => c.correction);
      if (col >= 0) return setSelected({ userId: r.userId, col });
    }
  }, [data, selected]);

  const selectedCell = useMemo(() => {
    if (!data || !selected) return null;
    const row = data.rows.find((r) => r.userId === selected.userId);
    const cell = row?.cells[selected.col];
    return row && cell?.shifts.length ? { row, cell, column: data.columns[selected.col] } : null;
  }, [data, selected]);

  const exportUrl = `/api/timesheet/export.csv?period=${period}${date ? `&date=${date}` : ''}`;
  const dayShifts = data?.period === 'day' ? data.rows.flatMap((r) => r.shifts) : [];

  return (
    <div className="timesheet">
      <div className="head">
        <div>
          <h1>Urenoverzicht</h1>
          <p>Alle tijden zijn servertijd</p>
        </div>
        <div className="acts no-print">
          <button className="btn o" type="button" onClick={() => window.print()}>Afdrukken</button>
          <a className="btn" href={exportUrl} download>Exporteren naar CSV</a>
        </div>
      </div>

      <div className="ts-bar">
        <div className="wk">
          <button type="button" aria-label="Vorige periode" onClick={() => data && go({ datum: data.range.prev })} className="no-print">‹</button>
          <span aria-live="polite">{data?.range.label ?? '…'}</span>
          <button type="button" aria-label="Volgende periode" onClick={() => data && go({ datum: data.range.next })} className="no-print">›</button>
          {data && !data.range.isCurrent && (
            <button type="button" className="today no-print" onClick={() => go({ datum: '' })}>Vandaag</button>
          )}
        </div>
        <div className="seg no-print" role="group" aria-label="Periode">
          {PERIODS.map((p) => (
            <button key={p.key} type="button" className={period === p.key ? 'on' : undefined} aria-pressed={period === p.key}
              onClick={() => go({ periode: p.key })}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="error" role="alert">{error}</p>}
      {loading && !data && <p className="muted">Uren laden…</p>}

      {data && data.period !== 'day' && (
        <div className="panel">
          <div className="table-scroll">
            <table className="grid-table">
              <thead>
                <tr>
                  <th scope="col">Medewerker</th>
                  {data.columns.map((c) => (
                    <th key={c.key} scope="col" className={`c${c.today ? ' today' : ''}`}>
                      {c.label}{c.sub && <small>{c.sub}</small>}
                    </th>
                  ))}
                  <th scope="col" className="num">Totaal</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.userId}>
                    <th scope="row"><div className="who"><div className="av" aria-hidden="true">{r.initials}</div>{r.name}</div></th>
                    {r.cells.map((cell, i) => {
                      if (!cell.text) return <td key={i} className="c muted">—</td>;
                      const isSel = selected?.userId === r.userId && selected.col === i;
                      const cls = ['c', cell.correction ? 'e' : cell.open ? 'x' : '', isSel ? 'sel' : ''].filter(Boolean).join(' ');
                      return (
                        <td key={i} className={cls}>
                          <button type="button" className="cellbtn" aria-pressed={isSel}
                            aria-label={`${r.name}, ${data.columns[i].label}: ${cell.text} uur${cell.open ? ', loopt nog' : ''}${cell.correction ? ', correctie open' : ''}`}
                            onClick={() => setSelected({ userId: r.userId, col: i })}>
                            {cell.text}{cell.correction && '*'}
                          </button>
                        </td>
                      );
                    })}
                    <td className="num"><b>{r.total}</b></td>
                  </tr>
                ))}
                {data.rows.length === 0 && (
                  <tr><td colSpan={data.columns.length + 2} className="muted">Nog geen medewerkers.</td></tr>
                )}
                <tr className="tot">
                  <th scope="row">Totaal team</th>
                  {data.totals.cells.map((t, i) => <td key={i} className="c">{t ?? '—'}</td>)}
                  <td className="num">{data.totals.total}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="legend">
            <span><b className="warn">Geel</b> = dienst loopt nog</span>
            <span><b className="bad">* Rood</b> = correctie open</span>
            <span>Klik op een tijd voor de details</span>
          </div>
        </div>
      )}

      {data && data.period === 'day' && (
        <div className="panel">
          {dayShifts.length === 0 ? <p className="muted">Op deze dag is niet gewerkt.</p> : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Medewerker</th><th scope="col">Ingeklokt</th><th scope="col">Uitgeklokt</th>
                    <th scope="col">Afstand</th><th scope="col">Status</th><th scope="col" className="num">Duur</th>
                  </tr>
                </thead>
                <tbody>
                  {dayShifts.map((s) => (
                    <tr key={s.id}>
                      <td><div className="who"><div className="av" aria-hidden="true">{s.initials}</div><div>{s.name}<small>{s.department ?? '—'}</small></div></div></td>
                      <td>{s.clockIn}</td>
                      <td>{s.open ? <span className="warn">—</span> : s.clockOut}</td>
                      <td>{s.distance ? <>{s.distance} <span className="acc">{s.accuracy}</span></> : '—'}</td>
                      <td><StatusPill s={s} /></td>
                      <td className="num"><b>{s.duration}</b></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="tot"><th scope="row" colSpan={5}>Totaal team</th><td className="num">{data.totals.total}</td></tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {data && (
        <div className="detail">
          {data.period !== 'day' && (
            <section className="panel" aria-labelledby="sel-titel">
              {selectedCell ? (
                <>
                  <h3 id="sel-titel">{selectedCell.row.name} · {selectedCell.cell.shifts[0].day}</h3>
                  {selectedCell.cell.shifts.map((s) => <ShiftCard key={s.id} s={s} />)}
                </>
              ) : (
                <>
                  <h3 id="sel-titel">Details</h3>
                  <p className="muted">Klik op een tijd in de tabel om te zien wanneer iemand in- en uitklokte.</p>
                </>
              )}
            </section>
          )}
          <section className="panel" aria-labelledby="top-titel">
            <h3 id="top-titel">Top {period === 'day' ? 'vandaag' : period === 'week' ? 'deze week' : 'deze maand'}</h3>
            {data.top.length === 0 && <p className="muted">Nog geen uren.</p>}
            {data.top.map((t) => <div key={t.userId} className="ent"><span>{t.name}</span><b>{t.total}</b></div>)}
          </section>
          <section className="panel" aria-labelledby="flag-titel">
            <h3 id="flag-titel">Gemarkeerde punches</h3>
            {data.flagged.length === 0 && (
              <p className="muted">{data.weakGpsM === null ? 'Zwakke GPS markeren staat uit.' : 'Geen punches met zwakke of nep-GPS.'}</p>
            )}
            {data.flagged.map((f) => (
              <div key={f.shiftId} className="ent"><span>{f.label}</span><span className={`pill ${f.tone === 'red' ? 'r' : 'y'}`}>{f.badge}</span></div>
            ))}
          </section>
        </div>
      )}
    </div>
  );
}
