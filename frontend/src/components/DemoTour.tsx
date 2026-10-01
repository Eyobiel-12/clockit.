import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { DemoStep } from './demoSteps';

// Klik-door-demo zoals een product-tour: echte schermen van Klokit met per stap een klikpunt en uitleg.
// "desktop": dashboard in een MacBook, met een muisaanwijzer die van punt naar punt glijdt.
// "phone": de app in een telefoon, met een tikcirkel.

/** Uitleg naast het gemarkeerde element: rechts als daar plek is, anders links. Blijft binnen het scherm. */
function tipStyle([from, to]: [number, number], y: number): CSSProperties {
  const right = to < 60;
  const ty = y < 22 ? '-12%' : y > 78 ? '-88%' : '-50%';
  return {
    left: `calc(${right ? to : from}% ${right ? '+' : '-'} 16px)`,
    top: `${y}%`,
    transform: `translate(${right ? '0' : '-100%'}, ${ty})`,
  };
}

/** Bij de telefoon staat de uitleg ernaast, op de hoogte van het tikpunt. */
function phoneTipStyle(y: number): CSSProperties {
  return { top: `${Math.min(Math.max(y, 18), 82)}%` };
}

function Cursor() {
  return (
    <svg className="demo-cursor-icon" width="26" height="30" viewBox="0 0 26 30" aria-hidden="true">
      <path d="M2 2 L2 24 L8 18.5 L12.5 28 L16.5 26.2 L12 16.8 L20 16.8 Z" fill="#0E3B43" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

/** Kleine lijn-iconen voor de bediening. */
const icon = {
  back: <path d="M15 5 8 12l7 7" />,
  next: <path d="m9 5 7 7-7 7" />,
  replay: <><path d="M4 12a8 8 0 1 0 2.4-5.7" /><path d="M4 4v4.5h4.5" /></>,
  full: <path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" />,
  exit: <path d="M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5" />,
  link: <><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1" /><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" /></>,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
};

function CtrlButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button type="button" className="demo-ctrl" onClick={onClick} disabled={disabled} aria-label={label} title={label}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
    </button>
  );
}

export default function DemoTour({ steps, variant, link }: { steps: DemoStep[]; variant: 'desktop' | 'phone'; link: string }) {
  // 0..steps.length-1 = stappen, steps.length = eindscherm.
  const [step, setStep] = useState(0);
  const total = steps.length;
  const current = steps[step];
  const phone = variant === 'phone';
  const go = (n: number) => setStep(Math.min(Math.max(n, 0), total));
  const root = useRef<HTMLDivElement>(null);
  const [full, setFull] = useState(false);
  const [copied, setCopied] = useState(false);
  const canFull = typeof document !== 'undefined' && document.fullscreenEnabled;

  useEffect(() => {
    const onChange = () => setFull(document.fullscreenElement === root.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  function toggleFull() {
    if (document.fullscreenElement) document.exitFullscreen();
    else root.current?.requestFullscreen().catch(() => {});
  }

  async function copyLink() {
    const url = new URL(link, window.location.href).href;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Geen toegang tot het klembord (bv. oude browser): dan via een tijdelijk tekstveld.
      const t = document.createElement('textarea');
      t.value = url; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const controls = (
    <div className="demo-controls">
      <div className="demo-ctrl-group">
        <CtrlButton label="Vorige stap" onClick={() => go(step - 1)} disabled={step <= 0}>{icon.back}</CtrlButton>
        <span className="demo-ctrl-count" aria-hidden="true">{Math.min(step + 1, total)} / {total}</span>
        <CtrlButton label="Volgende stap" onClick={() => go(step + 1)} disabled={step >= total}>{icon.next}</CtrlButton>
      </div>
      <div className="demo-ctrl-group">
        <CtrlButton label="Opnieuw afspelen" onClick={() => go(0)}>{icon.replay}</CtrlButton>
        {canFull && <CtrlButton label={full ? 'Volledig scherm sluiten' : 'Volledig scherm'} onClick={toggleFull}>{full ? icon.exit : icon.full}</CtrlButton>}
        <CtrlButton label={copied ? 'Link gekopieerd' : 'Link kopiëren'} onClick={copyLink}>{copied ? icon.check : icon.link}</CtrlButton>
        {copied && <span className="demo-copied" role="status">Link gekopieerd</span>}
      </div>
    </div>
  );

  // Volgende scherm alvast laden, zodat de overgang direct is.
  useEffect(() => {
    const next = steps[step + 1];
    if (next) new Image().src = next.img;
  }, [step, steps]);

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(step + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(step - 1); }
  };

  const shown = Math.min(step, total - 1);
  const nextLabel = step === total - 1 ? 'Demo afronden' : current ? `Volgende stap: ${steps[step + 1].title}` : '';

  // Dezelfde uitleg staat naast het klikpunt (groot scherm) of onder het apparaat (mobiel); CSS toont er één.
  const tip = (style?: CSSProperties, below?: boolean) => current && (
    <div className={`demo-tip${below ? ' below' : ''}`} style={style} key={`${step}${below ? 'b' : ''}`}>
      <span className="demo-count">Stap {step + 1} van {total}</span>
      <strong>{current.title}</strong>
      <p>{current.text}</p>
      <button type="button" className="demo-next" onClick={() => go(step + 1)}>
        {step === total - 1 ? 'Afronden' : 'Volgende'} <span aria-hidden="true">→</span>
      </button>
    </div>
  );

  return (
    <div className={`demo ${variant}`} onKeyDown={onKey} ref={root}>
      <div className="demo-device">
        <div className="demo-viewport">
          <div className="demo-screen">
            {steps.map((s, i) => (
              <img
                key={s.img}
                src={s.img}
                alt=""
                loading={i === 0 ? 'eager' : 'lazy'}
                decoding="async"
                className={i === shown ? 'on' : undefined}
              />
            ))}

            {current && (phone ? (
              // Tikcirkel: per stap opnieuw, zodat de puls bij elke stap begint.
              <button key={step} type="button" className="demo-tap" style={{ left: `${current.x}%`, top: `${current.y}%` }} onClick={() => go(step + 1)} aria-label={nextLabel} />
            ) : (
              // Muisaanwijzer: blijft staan en glijdt naar het volgende punt.
              <button type="button" className="demo-cursor" style={{ left: `${current.x}%`, top: `${current.y}%` }} onClick={() => go(step + 1)} aria-label={nextLabel}>
                <span key={step} className="demo-click" aria-hidden="true" />
                <Cursor />
              </button>
            ))}

            {step === total && (
              <div className="demo-cover">
                <h3>{phone ? 'Zo klokt je team in.' : 'Zo houdt Klokit je uren op orde.'}</h3>
                <div className="demo-end-actions">
                  <Link className="btn" to="/registreren">Gratis starten</Link>
                  <button type="button" className="btn ghost" onClick={() => go(0)}>Opnieuw bekijken</button>
                </div>
              </div>
            )}
          </div>
          {tip(phone ? phoneTipStyle(current?.y ?? 50) : current && tipStyle(current.span, current.y))}
        </div>
        {!phone && controls}
      </div>
      {!phone && <div className="demo-base" aria-hidden="true" />}
      {phone && controls}
      {tip(undefined, true)}

      {/* Voor schermlezers: meldt elke nieuwe stap. */}
      <p className="sr-only" aria-live="polite">
        {current ? `Stap ${step + 1} van ${total}: ${current.title}. ${current.text}` : 'Einde van de demo.'}
      </p>
    </div>
  );
}
