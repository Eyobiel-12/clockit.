import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from './config.js';

export type Role = 'owner' | 'manager' | 'employee';

export type SessionUser = {
  id: number;
  restaurantId: number;
  role: Role;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}

const COOKIE = 'clockit_session';
const MAX_AGE_LONG = 30 * 24 * 60 * 60 * 1000;

/** Zet de sessiecookie (website) en geeft het token terug, dat de app als Bearer-token gebruikt. */
export function setSession(res: Response, user: SessionUser, remember = true): string {
  const token = jwt.sign(user, config.jwtSecret, { expiresIn: '30d' });
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.cookieSecure,
    path: '/',
    ...(remember ? { maxAge: MAX_AGE_LONG } : {}),
  });
  return token;
}

/** De mobiele app stuurt `X-Client: mobile` en krijgt het token in de response. */
export function isMobile(req: Request) {
  return req.get('x-client') === 'mobile';
}

function tokenFrom(req: Request): string | undefined {
  const header = req.get('authorization');
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return req.cookies?.[COOKIE];
}

export function clearSession(res: Response) {
  res.clearCookie(COOKIE, { path: '/' });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = tokenFrom(req);
  if (!token) return res.status(401).json({ error: 'Niet ingelogd' });
  try {
    const payload = jwt.verify(token, config.jwtSecret) as SessionUser;
    req.user = { id: payload.id, restaurantId: payload.restaurantId, role: payload.role };
    next();
  } catch {
    clearSession(res);
    res.status(401).json({ error: 'Sessie verlopen, log opnieuw in' });
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Geen toegang' });
    }
    next();
  };
}
