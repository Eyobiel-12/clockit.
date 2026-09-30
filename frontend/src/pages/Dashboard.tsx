import { Link } from 'react-router-dom';
import type { DashboardData } from '../api';
import { useAuth } from '../auth';
import { useApi } from '../useApi';
import '../styles/dashboard.css';
import { useTitle } from '../useTitle';

function greeting(date: Date) {
  const h = date.getHours();
  if (h < 6) return 'Goedenacht';
  if (h < 12) return 'Goedemorgen';
  if (h < 18) return 'Goedemiddag';
  return 'Goedenavond';
}

function formatDate(date: Date) {
  const s = date.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const alertIcon = { error: '!', warning: '~', info: '+' } as const;

export default function Dashboard() {
  useTitle('Overzicht');
  const { me } = useAuth();
  const { data, error, loading } = useApi<DashboardData>('/dashboard', 30_000);
  const now = new Date();

  return (
    <>
      <div className="head">
        <div>
          <p>{formatDate(now)}</p>
          <h1>{greeting(now)}, {me?.user.firstName}</h1>
        </div>
        <div className="acts">
          <Link className="btn o" to="/uren">Exporteren</Link>
          <Link className="btn y" to="/team">+ Medewerker uitnodigen</Link>
        </div>
      </div>

      {me && !me.restaurant.location && (
        <div className="setup-banner" role="status">
          <div>
            <b>Stel de werkzone van je restaurant in</b>
            <span>Zonder locatie op de kaart kan niemand inklokken.</span>
          </div>
          {me.user.role === 'owner'
            ? <Link className="btn y" to="/instellingen#werkzone">Werkzone instellen</Link>
            : <span className="muted">Vraag de eigenaar dit te doen.</span>}
        </div>
      )}

      {error && <p className="error" role="alert">{error}</p>}
      {loading && !data && <p className="muted">Overzicht laden…</p>}

      {data && (
        <>
          <div className="stats">
            <div className="st y"><small>Nu in dienst</small><b>{data.stats.onShift} van {data.stats.activeMembers}</b></div>
            <div className="st"><small>Uren vandaag</small><b>{data.stats.hoursToday}</b></div>
            <div className="st"><small>Uren deze week</small><b>{data.stats.hoursWeek}</b></div>
            <div className="st"><small>Open correcties</small><b>{data.stats.openCorrections}</b></div>
          </div>

          <div className="dash-grid">
            <section className="panel" aria-labelledby="live-titel">
              <h3 id="live-titel">Nu in dienst <span className="pill">Live</span></h3>
              {data.onShift.length === 0 ? (
                <p className="muted">Er is nu niemand ingeklokt.</p>
              ) : (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">Medewerker</th>
                        <th scope="col">Ingeklokt</th>
                        <th scope="col">Afstand</th>
                        <th scope="col">Check</th>
                        <th scope="col" className="num">Duur</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.onShift.map((r) => (
                        <tr key={r.id}>
                          <td>
                            <div className="who">
                              <div className="av" aria-hidden="true">{r.initials}</div>
                              <div>{r.name}<small>{r.department ?? '—'}</small></div>
                            </div>
                          </td>
                          <td><span className="dot" aria-hidden="true" />{r.clockedIn}</td>
                          <td>{r.distance} <span className="acc">{r.accuracy}</span></td>
                          <td>
                            {r.check === 'ok'
                              ? <span className="pill g">Oké</span>
                              : <span className="pill y">Zwakke GPS</span>}
                          </td>
                          <td className="num"><b>{r.duration}</b></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <div className="dash-side">
              <section className="panel" aria-labelledby="aandacht-titel">
                <h3 id="aandacht-titel">Aandacht nodig</h3>
                {data.alerts.length === 0 ? (
                  <p className="muted">Alles in orde.</p>
                ) : (
                  <ul className="alerts">
                    {data.alerts.map((a, i) => (
                      <li key={i} className="al">
                        <div className={`icn ${a.kind}`} aria-hidden="true">{alertIcon[a.kind]}</div>
                        <div>
                          <b>{a.to ? <Link to={a.to}>{a.title}</Link> : a.title}</b>
                          <small>{a.detail}</small>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="panel" aria-labelledby="week-titel">
                <h3 id="week-titel">Uren deze week</h3>
                <div className="bars">
                  {data.week.bars.map((b, i) => (
                    <div
                      key={b.day}
                      className={i === data.week.todayIndex ? 'today' : undefined}
                      style={{ height: `${b.pct}%` }}
                      title={`${b.day}: ${b.hours} uur`}
                    />
                  ))}
                </div>
                <div className="bar-labels">
                  {data.week.bars.map((b) => <span key={b.day}>{b.day}</span>)}
                </div>
                <div className="sr-only">
                  <table>
                    <caption>Gewerkte uren per dag</caption>
                    <tbody>
                      {data.week.bars.map((b) => <tr key={b.day}><th scope="row">{b.day}</th><td>{b.hours}</td></tr>)}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </div>
        </>
      )}
    </>
  );
}
