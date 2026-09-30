import { useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/home.css';
import { useTitle } from '../useTitle';

const tickets = [
  { id: '#041', name: 'Sanne', time: '08:58', distance: '12 m', accuracy: '±8 m', ok: true },
  { id: '#042', name: 'Mehmet', time: '09:02', distance: '31 m', accuracy: '±14 m', ok: true },
  { id: '#043', name: 'Joost', time: '09:05', distance: '2,4 km', accuracy: '±20 m', ok: false },
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

export default function Home() {
  useTitle();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

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
            <li><a href="#prijzen" onClick={closeMenu}>Prijzen</a></li>
            <li><Link to="/login">Inloggen</Link></li>
          </ul>
          <Link className="btn" to="/registreren">Gratis beginnen</Link>
        </div>
      </nav>

      <main id="main">
        <header className="hero">
          <div>
            <h1>Je team klokt in op de werkvloer. Niet vanaf de bank.</h1>
            <p className="lead">Klokit controleert met GPS of je medewerkers echt in het restaurant zijn als ze inklokken. Geen prikklok, geen papieren lijst — gewoon hun eigen telefoon.</p>
            <div className="cta">
              <Link className="btn" to="/registreren">Gratis beginnen</Link>
              <a className="btn ghost" href="#hoe">Bekijk hoe het werkt</a>
            </div>
          </div>

          <div className="railwrap">
            <div className="rail" aria-hidden="true" />
            <ul className="tickets" aria-label="Voorbeelden van inklokbonnetjes">
              {tickets.map((t, i) => (
                <li key={t.id} className={`ticket t${i + 1}`}>
                  <h2 className="ticket-title">{t.id} INKLOKKEN</h2>
                  <dl>
                    <div className="row"><dt>{t.name}</dt><dd>{t.time}</dd></div>
                    <div className="row"><dt>Afstand</dt><dd>{t.distance}</dd></div>
                    <div className="row"><dt>Nauwk.</dt><dd>{t.accuracy}</dd></div>
                  </dl>
                  <span className={`stamp${t.ok ? '' : ' no'}`}>{t.ok ? 'GELUKT' : 'BUITEN ZONE'}</span>
                </li>
              ))}
            </ul>
            <p className="note">Elke punch krijgt een servertijd, afstand en GPS-nauwkeurigheid. Wie buiten de straal staat, kan niet inklokken en ziet direct waarom.</p>
          </div>
        </header>

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
