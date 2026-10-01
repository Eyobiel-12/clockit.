import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ClockIcon, GridIcon, LogoutIcon, MenuIcon, PencilIcon, SlidersIcon, TeamIcon } from './icons';
import { roleLabel } from '../api';
import { useAuth } from '../auth';
import '../styles/app.css';

export default function AppShell() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { me, logout } = useAuth();

  useEffect(() => setOpen(false), [location.pathname]);

  if (!me) return null;
  const { user, restaurant } = me;

  const nav = [
    { to: '/dashboard', label: 'Overzicht', icon: <GridIcon /> },
    { to: '/team', label: 'Team', icon: <TeamIcon />, count: restaurant.pendingCount },
    { to: '/uren', label: 'Urenoverzicht', icon: <ClockIcon /> },
    { to: '/correcties', label: 'Correcties', icon: <PencilIcon />, count: restaurant.openCorrections },
    { to: '/instellingen', label: 'Instellingen', icon: <SlidersIcon /> },
  ];

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="app">
      <div className="shell">
        <aside className={`side${open ? ' open' : ''}`}>
          <div className="side-top">
            <Link className="logo" to="/"><i />Klokit</Link>
            <button
              className="side-toggle"
              type="button"
              aria-expanded={open}
              aria-controls="side-body"
              aria-label={open ? 'Menu sluiten' : 'Menu openen'}
              onClick={() => setOpen((o) => !o)}
            >
              <MenuIcon size={22} />
            </button>
          </div>

          <div className="side-body" id="side-body">
            <div className="rest">
              <b>{restaurant.name}</b>
              <span>Straal {restaurant.radius} m · {restaurant.memberCount} medewerkers</span>
            </div>
            <nav aria-label="App-menu">
              {nav.map((item) => (
                <NavLink key={item.to} to={item.to} className="nv">
                  {item.icon}
                  {item.label}
                  {item.count ? <span className="c" aria-label={`${item.count} open`}>{item.count}</span> : null}
                </NavLink>
              ))}
            </nav>
            <div className="me">
              <div className="av y" aria-hidden="true">{user.initials}</div>
              <div>
                <b>{user.firstName} {user.lastName}</b>
                <small>{roleLabel[user.role]}</small>
              </div>
              <button className="logout" type="button" aria-label="Uitloggen" onClick={handleLogout}>
                <LogoutIcon />
              </button>
            </div>
          </div>
        </aside>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
