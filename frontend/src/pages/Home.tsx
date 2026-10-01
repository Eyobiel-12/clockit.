import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import DemoTour from '../components/DemoTour';
import { appSteps, dashboardSteps } from '../components/demoSteps';
import '../styles/home.css';
import { useTitle } from '../useTitle';

const timecard = [
  { day: 'Maandag', in: '16:02', out: '22:31', hours: '6:29' },
  { day: 'Dinsdag', in: '15:58', out: '23:04', hours: '7:06' },
  { day: 'Donderdag', in: '11:30', out: '17:45', hours: '6:15' },
  { day: 'Vrijdag', in: '16:01', out: null, hours: null },
];

const steps = [
  { title: 'Zet je restaurant op de kaart', text: 'Plaats een pin op je adres en kies hoe groot de straal is, van 25 tot 300 meter.' },
  { title: 'Nodig je team uit', text: 'Deel een code van 6 cijfers of een link. Medewerkers maken een account en zitten meteen in jouw team.' },
  { title: 'Zie wie er werkt', text: 'Een live lijst van wie nu in dienst is, plus uren per dag en per week.' },
];

const features = [
  { title: 'Check op de server', text: 'Een aangepaste app kan de locatie niet vervalsen. De tijd komt van de server, niet van de telefoon.' },
  { title: 'Zwakke GPS wordt gemarkeerd', text: 'Nauwkeurigheid wordt bij elke punch opgeslagen, zodat je twijfelgevallen snel ziet.' },
  { title: 'Correcties met goedkeuring', text: 'Vergeten uit te klokken? De medewerker vraagt een correctie aan, jij keurt goed. Alles wordt gelogd.' },
  { title: 'Export naar CSV', text: 'Weekoverzicht in één klik naar je salarisadministratie.' },
];

const week = [
  { name: 'Sanne de Vries', days: ['8:00', '7:30', '—', '8:15'], total: '23:45' },
  { name: 'Mehmet Yilmaz', days: ['6:00', '6:00', '9:10', '—'], total: '21:10' },
  { name: 'Priya Ramdin', days: ['—', '5:45', '5:30', '6:00'], total: '17:15' },
  { name: 'Joost Bakker', days: ['4:00', '11:20*', '4:30', '—'], total: '19:50', flagDay: 1 },
  { name: 'Fatima El Amrani', days: ['7:00', '—', '7:15', '7:00'], total: '21:15' },
];

function TimecardContent() {
  return (
    <>
      <span className="tc-stamp" aria-hidden="true">✓ Op locatie · 38 m</span>
      <div className="tc-head">
        <h2>Weekkaart</h2>
        <span className="tc-week">wk 39 · 2026</span>
      </div>
      <div className="tc-meta">
        <span>Naam <b>Sanne de Vries</b></span>
        <span>Locatie <b>Brasserie Anker</b></span>
      </div>
      <table>
        <caption className="sr-only">Gewerkte uren deze week</caption>
        <thead>
          <tr><th scope="col">Dag</th><th scope="col">In</th><th scope="col">Uit</th><th scope="col">Uren</th></tr>
        </thead>
        <tbody>
          {timecard.map((r) => (
            <tr key={r.day}>
              <th scope="row">{r.day}</th>
              <td>{r.in}</td>
              <td className={r.out ? undefined : 'live'}>{r.out ?? '—'}</td>
              <td className={r.hours ? undefined : 'live'}>{r.hours ?? 'bezig'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="tc-total">
        <span>Totaal deze week</span>
        <b>19:50</b>
      </div>
    </>
  );
}

export default function Home() {
  useTitle();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);
  const [demo, setDemo] = useState<'dashboard' | 'app'>(() => (window.location.hash === '#demo-app' ? 'app' : 'dashboard'));

  useEffect(() => {
    if (window.location.hash === '#demo-app') document.getElementById('demo')?.scrollIntoView();
  }, []);
  const visualRef = useRef<HTMLDivElement>(null);

  // Van papier naar digitaal: zodra je begint te scrollen scheurt de weekkaart, vliegen de stukken weg
  // en popt de telefoon eruit. Dat speelt als één animatie af (klasse .popped); terug naar boven zet hem terug.
  useEffect(() => {
    const visual = visualRef.current;
    if (!visual) return;
    const pinned = window.matchMedia('(min-width: 1081px)');
    let frame = 0;
    const update = () => {
      frame = 0;
      let start: boolean;
      let reset: boolean;
      if (pinned.matches) {
        start = window.scrollY > 10;
        reset = window.scrollY < 4;
      } else {
        // Tablet/mobiel: de kaart staat lager, dus wachten tot hij goed in beeld is.
        const top = visual.getBoundingClientRect().top;
        start = top < window.innerHeight * 0.7;
        reset = top > window.innerHeight * 0.9;
      }
      if (start) visual.classList.add('popped');
      else if (reset) visual.classList.remove('popped');
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="home">
      <a className="skip" href="#main">Naar inhoud</a>

      <nav className="nav" aria-label="Hoofdmenu">
        <Link className="logo" to="/" aria-label="Klokit, naar home"><i aria-hidden="true" />Klokit</Link>
        <button
          className="nav-toggle"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="nav-menu"
          aria-label={menuOpen ? 'Menu sluiten' : 'Menu openen'}
          onClick={() => setMenuOpen((o) => !o)}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>
        <div className={`nav-menu${menuOpen ? ' open' : ''}`} id="nav-menu">
          <ul>
            <li><a href="#hoe" onClick={closeMenu}>Hoe het werkt</a></li>
            <li><a href="#functies" onClick={closeMenu}>Functies</a></li>
            <li><a href="#demo" onClick={closeMenu}>Demo</a></li>
            <li><a href="#prijzen" onClick={closeMenu}>Prijzen</a></li>
            <li><Link to="/login">Inloggen</Link></li>
          </ul>
          <Link className="btn" to="/registreren">Gratis starten</Link>
        </div>
      </nav>

      <main id="main">
        <div className="hero-scene">
        <header className="hero">
          <div className="hero-copy">
            <h1>Uren die kloppen. Zonder prikklok aan de muur.</h1>
            <p className="lead">Je team klokt in met de eigen telefoon. Klokit checkt of iemand echt in het restaurant staat, en jij hebt de uren meteen klaar voor de loonadministratie.</p>
            <div className="cta">
              <Link className="btn" to="/registreren">Gratis starten</Link>
              <a className="btn ghost" href="#hoe">Bekijk hoe het werkt</a>
            </div>
            <p className="fine">Gratis tot 5 medewerkers. Geen hardware, geen papier.</p>
          </div>

          <div className="hero-visual" ref={visualRef}>
            <video
              className="hero-phone"
              src="/clock-it-telefoon-transparant.webm"
              autoPlay
              muted
              loop
              playsInline
              aria-label="Klokit-app op een telefoon: een medewerker klokt in op locatie"
            />
            <figure className="timecard" aria-label="Voorbeeld van een weekkaart">
              <div className="tc-piece top"><div className="tc-sheet"><TimecardContent /></div></div>
              <div className="tc-piece bottom" aria-hidden="true"><div className="tc-sheet"><TimecardContent /></div></div>
            </figure>
          </div>
        </header>
        </div>

        <section className="paper" id="hoe" aria-labelledby="hoe-titel">
          <h2 id="hoe-titel">In vijf minuten draaien</h2>
          <p className="lead">Van aanmelden tot de eerste ingeklokte medewerker.</p>
          <ol className="steps">
            {steps.map((s, i) => (
              <li key={s.title} className="step">
                <b aria-hidden="true">{i + 1}</b>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="functies" aria-labelledby="functies-titel">
          <div className="feat">
            <div>
              <h2 id="functies-titel">Uren waar je salaris op kunt bouwen</h2>
              <ul className="feat-list">
                {features.map((f) => (
                  <li key={f.title}><strong>{f.title}</strong>{f.text}</li>
                ))}
              </ul>
            </div>

            <figure className="sheet">
              <div className="sheet-scroll">
                <table>
                  <caption className="sr-only">Voorbeeld van een weekoverzicht</caption>
                  <thead>
                    <tr>
                      {['MEDEWERKER', 'MA', 'DI', 'WO', 'DO', 'TOTAAL'].map((h) => <th key={h} scope="col">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {week.map((r) => (
                      <tr key={r.name}>
                        <td>{r.name}</td>
                        {r.days.map((d, i) => <td key={i} className={r.flagDay === i ? 'flag' : undefined}>{d}</td>)}
                        <td>{r.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <figcaption className="flag sheet-note">* Uitklokken vergeten — correctie wacht op goedkeuring</figcaption>
            </figure>
          </div>
        </section>

        <section className="demo-sec" id="demo" aria-labelledby="demo-titel">
          <p className="eyebrow">Interactieve demo</p>
          <h2 id="demo-titel">Klik door de interactieve demo.</h2>
          <div className="demo-tabs" role="tablist" aria-label="Kies een demo">
            <button type="button" role="tab" id="demo-tab-dashboard" aria-selected={demo === 'dashboard'} aria-controls="demo-panel" onClick={() => setDemo('dashboard')}>
              Eigenaar · dashboard
            </button>
            <button type="button" role="tab" id="demo-tab-app" aria-selected={demo === 'app'} aria-controls="demo-panel" onClick={() => setDemo('app')}>
              Medewerker · app
            </button>
          </div>
          <div className="demo-panel" id="demo-panel" role="tabpanel" aria-labelledby={`demo-tab-${demo}`}>
            {demo === 'dashboard' ? (
              <DemoTour key="dashboard" steps={dashboardSteps} variant="desktop" link="/#demo" />
            ) : (
              <DemoTour key="app" steps={appSteps} variant="phone" link="/#demo-app" />
            )}
          </div>
        </section>

        <section className="paper" id="prijzen" aria-labelledby="prijzen-titel">
          <h2 id="prijzen-titel">Prijzen</h2>
          <p className="lead">Klein team? Dan betaal je niets.</p>
          <div className="price">
            <article className="plan">
              <h3>Gratis</h3>
              <div className="amt">€0</div>
              <ul>
                <li>Tot 5 medewerkers</li>
                <li>GPS in- en uitklokken</li>
                <li>Live dienstoverzicht</li>
                <li>Weekoverzichten</li>
              </ul>
              <Link className="btn ghost" to="/registreren">Gratis beginnen</Link>
            </article>
            <article className="plan pro">
              <h3>Pro</h3>
              <div className="amt">€19</div>
              <p>per locatie per maand</p>
              <ul>
                <li>Onbeperkt medewerkers</li>
                <li>CSV-export voor salaris</li>
                <li>Correcties en pauzes</li>
                <li>Roosters (binnenkort)</li>
              </ul>
              <Link className="btn" to="/registreren?plan=pro">Probeer Pro 30 dagen</Link>
            </article>
          </div>
        </section>
      </main>

      <footer className="footer">
        <span>© 2026 Klokit</span>
        <span>Privacy · Locatie wordt alleen gebruikt bij in- en uitklokken</span>
      </footer>
    </div>
  );
}
