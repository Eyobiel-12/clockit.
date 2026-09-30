import Constants from 'expo-constants';

/**
 * De API draait op dezelfde computer als de Expo-server. Op een telefoon is dat het
 * netwerkadres van die computer, dat we uit de Expo-verbinding halen (hostUri = "192.168.x.x:8081").
 * Overschrijven kan met EXPO_PUBLIC_API_URL in mobile/.env.local.
 */
function defaultApiUrl() {
  const host = Constants.expoConfig?.hostUri?.split(':')[0] ?? 'localhost';
  return `http://${host}:4000/api`;
}

export const API_URL = process.env.EXPO_PUBLIC_API_URL || defaultApiUrl();

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

let authToken: string | null = null;
export function setAuthToken(token: string | null) {
  authToken = token;
}

export async function api<T = void>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const headers: Record<string, string> = { 'X-Client': 'mobile' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError(0, `Geen verbinding met de server (${API_URL})`);
  }

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? 'Er ging iets mis', data.code);
  return data as T;
}

// ---- Types van de API (gelijk aan frontend/src/api.ts) ----

export type Role = 'owner' | 'manager' | 'employee';

export type Me = {
  user: {
    id: number;
    firstName: string;
    lastName: string;
    initials: string;
    email: string;
    role: Role;
    department: string | null;
    status: 'active' | 'pending';
  };
  restaurant: {
    id: number;
    name: string;
    address: string | null;
    radius: number;
    location: LatLng | null;
    memberCount: number;
    pendingCount: number;
    openCorrections: number;
  };
};

export type AuthResponse = { role: Role; status: 'active' | 'pending'; token: string };

export type DashboardData = {
  stats: { onShift: number; activeMembers: number; hoursToday: string; hoursWeek: string; openCorrections: number };
  onShift: {
    id: number; initials: string; name: string; department: string | null;
    clockedIn: string; distance: string; accuracy: string; check: 'ok' | 'weak'; duration: string;
  }[];
  alerts: { kind: 'error' | 'warning' | 'info'; title: string; detail: string; to?: string }[];
  week: { todayIndex: number; bars: { day: string; hours: string; pct: number }[] };
};

export type TeamMember = {
  id: number;
  name: string;
  firstName: string;
  initials: string;
  email: string;
  role: Role;
  department: string | null;
  status: 'on' | 'off' | 'pending';
  weekHours: string;
};

export type TeamData = {
  members: TeamMember[];
  departments: string[];
  invite: { code: string; expiresAt: string };
};

export type LatLng = { lat: number; lng: number };

export type ClockRules = {
  blockMocked: boolean;
  /** Markeer inklokken met een slechtere nauwkeurigheid dan dit (meter); null = uit. */
  weakGpsM: number | null;
  autoClockOut: boolean;
};

export type RestaurantSettings = {
  name: string;
  address: string | null;
  location: LatLng | null;
  radius: number;
  timeZone: string;
  rules: ClockRules;
  limits: { radiusMin: number; radiusMax: number };
};

export type Place = { label: string; lat: number; lng: number };

export type Shift = {
  id: number;
  day: string;
  clockIn: string;
  clockInAt: string;
  clockOut: string | null;
  duration: string;
  distance: string;
  accuracy: string;
  local: { date: string; clockIn: string; clockOut: string | null };
  autoClosed?: boolean;
  corrected?: boolean;
  correction?: { status: 'pending' | 'approved' | 'rejected'; label: string } | null;
};

export type ClockStatus = {
  restaurant: { name: string; radius: number; hasLocation: boolean };
  /** Waarom inklokken nu niet kan (aanmelding niet bevestigd, geen locatie ingesteld), anders null. */
  blocked: string | null;
  open: Shift | null;
  today: string;
  week: string;
  recent: Shift[];
};

export const roleLabel: Record<Role, string> = {
  owner: 'Eigenaar',
  manager: 'Manager',
  employee: 'Medewerker',
};

// ---- Urenoverzicht ----

export type Period = 'day' | 'week' | 'month';

export type ShiftDetail = {
  id: number;
  name: string;
  initials: string;
  department: string | null;
  day: string;
  date: string;
  clockIn: string;
  clockOut: string | null;
  duration: string;
  distance: string | null;
  accuracy: string | null;
  open: boolean;
  autoClosed: boolean;
  corrected: boolean;
  manual: boolean;
  mocked: boolean;
  weak: boolean;
  correctionId: number | null;
};

export type TimesheetData = {
  period: Period;
  range: { label: string; date: string; prev: string; next: string; today: string; isCurrent: boolean };
  columns: { key: string; label: string; sub?: string; today: boolean }[];
  rows: {
    userId: number;
    name: string;
    initials: string;
    department: string | null;
    total: string;
    totalMins: number;
    cells: { mins: number; text: string | null; open: boolean; correction: boolean; shifts: ShiftDetail[] }[];
    shifts: ShiftDetail[];
  }[];
  totals: { cells: (string | null)[]; total: string };
  top: { userId: number; name: string; total: string }[];
  flagged: { shiftId: number; userId: number; label: string; badge: string; tone: 'red' | 'yellow' }[];
  weakGpsM: number | null;
};

// ---- Correcties ----

export type CorrectionStatus = 'pending' | 'approved' | 'rejected';

export type TimeSpan = { clockIn: string; clockOut: string | null; duration: string | null; mins: number | null };

export type Correction = {
  id: number;
  status: CorrectionStatus;
  type: string;
  typeLabel: string;
  user: { id: number; name: string; firstName: string; initials: string };
  shiftId: number | null;
  dayShort: string;
  dayLong: string;
  createdAgo: string;
  automatic: boolean;
  reason: string | null;
  current: TimeSpan | null;
  requested: TimeSpan | null;
  applied: TimeSpan | null;
  delta: string | null;
  decision: { by: string; ago: string; note: string | null } | null;
  history: { title: string; detail?: string; note?: string }[];
  prefill: { date: string; clockIn: string; clockOut: string };
};

export type CorrectionsData = {
  counts: Record<CorrectionStatus, number>;
  items: Correction[];
};
