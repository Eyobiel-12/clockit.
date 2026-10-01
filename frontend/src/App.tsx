import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Team from './pages/Team';
import Welcome from './pages/Welcome';
import AppShell from './components/AppShell';
import ComingSoon from './pages/ComingSoon';
import Settings from './pages/Settings';
import Onboarding from './pages/Onboarding';
import Timesheet from './pages/Timesheet';
import Corrections from './pages/Corrections';
import { useAuth } from './auth';

/** Alleen voor ingelogde gebruikers; `managers` beperkt tot eigenaar en manager. */
function Protected({ children, managers }: { children: ReactNode; managers?: boolean }) {
  const { me, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="app loading" aria-busy="true" />;
  if (!me) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (managers && me.user.role === 'employee') return <Navigate to="/welkom" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/registreren" element={<Register />} />
      <Route path="/welkom" element={<Protected><Welcome /></Protected>} />
      <Route path="/onboarding" element={<Protected managers><Onboarding /></Protected>} />
      <Route element={<Protected managers><AppShell /></Protected>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/team" element={<Team />} />
        <Route path="/uren" element={<Timesheet />} />
        <Route path="/correcties" element={<Corrections />} />
        <Route path="/instellingen" element={<Settings />} />
      </Route>
      <Route path="*" element={<ComingSoon title="Pagina niet gevonden" standalone />} />
    </Routes>
  );
}
