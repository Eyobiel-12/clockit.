export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function api<T = void>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method: options.method ?? 'GET',
      credentials: 'same-origin',
      headers: options.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Geen verbinding met de server');
  }

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? 'Er ging iets mis');
  return data as T;
}

// ---- Types van de API ----

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
