import { describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { type SessionUser, clearSession, isMobile, requireAuth, requireRole, setSession } from './auth.js';

const USER: SessionUser = { id: 7, restaurantId: 1, role: 'owner' };

/** Minimale nep-Request: alleen de headers en cookies die auth.ts gebruikt. */
function mockRequest(options: { headers?: Record<string, string>; cookies?: Record<string, string> } = {}) {
  const headers = options.headers ?? {};
  return {
    get: (name: string) => headers[name.toLowerCase()],
    cookies: options.cookies,
  } as unknown as Request;
}

function mockResponse() {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    cookies: [] as { name: string; value: string; options: unknown }[],
    cleared: [] as string[],
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
    cookie(name: string, value: string, options: unknown) {
      this.cookies.push({ name, value, options });
      return this;
    },
    clearCookie(name: string) {
      this.cleared.push(name);
      return this;
    },
  };
  return res as typeof res & Response;
}

/**
 * Express 5 typeert NextFunction met meerdere overloads (`next()`, `next('route')`,
 * `next('router')`). Een mock neemt er maar één over, dus voegen we het type er weer
 * aan toe; anders klaagt de typecheck bij elke aanroep.
 */
function mockNext() {
  const fn = vi.fn();
  return fn as typeof fn & NextFunction;
}

describe('isMobile', () => {
  it('herkent de app aan de X-Client-header', () => {
    expect(isMobile(mockRequest({ headers: { 'x-client': 'mobile' } }))).toBe(true);
  });

  it('geeft false zonder de header', () => {
    expect(isMobile(mockRequest())).toBe(false);
  });

  it('geeft false bij een andere waarde', () => {
    expect(isMobile(mockRequest({ headers: { 'x-client': 'web' } }))).toBe(false);
  });
});

describe('setSession', () => {
  it('zet een httpOnly-cookie en geeft een geldig token terug', () => {
    const res = mockResponse();
    const token = setSession(res, USER);
    const payload = jwt.verify(token, config.jwtSecret) as SessionUser;

    expect(payload.id).toBe(USER.id);
    expect(payload.restaurantId).toBe(USER.restaurantId);
    expect(payload.role).toBe('owner');
    expect(res.cookies).toHaveLength(1);
    expect(res.cookies[0].name).toBe('clockit_session');
    expect(res.cookies[0].options).toMatchObject({ httpOnly: true, sameSite: 'lax', path: '/' });
  });

  it('zet een maxAge als "onthouden" aanstaat', () => {
    const res = mockResponse();
    setSession(res, USER, true);
    expect(res.cookies[0].options).toMatchObject({ maxAge: 30 * 24 * 60 * 60 * 1000 });
  });

  it('laat maxAge weg zonder "onthouden", zodat de cookie bij afsluiten verdwijnt', () => {
    const res = mockResponse();
    setSession(res, USER, false);
    expect(res.cookies[0].options).not.toHaveProperty('maxAge');
  });
});

describe('clearSession', () => {
  it('wist de sessiecookie', () => {
    const res = mockResponse();
    clearSession(res);
    expect(res.cleared).toEqual(['clockit_session']);
  });
});

describe('requireAuth', () => {
  it('laat een geldig Bearer-token door en vult req.user', () => {
    const token = jwt.sign(USER, config.jwtSecret, { expiresIn: '30d' });
    const req = mockRequest({ headers: { authorization: `Bearer ${token}` } });
    const next = mockNext();

    requireAuth(req, mockResponse(), next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.user).toEqual(USER);
  });

  it('accepteert ook het token uit de cookie', () => {
    const token = jwt.sign(USER, config.jwtSecret, { expiresIn: '30d' });
    const req = mockRequest({ cookies: { clockit_session: token } });
    const next = mockNext();

    requireAuth(req, mockResponse(), next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.user?.id).toBe(USER.id);
  });

  it('geeft 401 zonder token', () => {
    const res = mockResponse();
    const next = mockNext();

    requireAuth(mockRequest(), res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: 'Niet ingelogd' });
  });

  it('geeft 401 en wist de cookie bij een ongeldig token', () => {
    const res = mockResponse();
    const next = mockNext();

    requireAuth(mockRequest({ headers: { authorization: 'Bearer rommel' } }), res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.cleared).toEqual(['clockit_session']);
  });

  it('geeft 401 bij een verlopen token', () => {
    const expired = jwt.sign(USER, config.jwtSecret, { expiresIn: -10 });
    const res = mockResponse();
    const next = mockNext();

    requireAuth(mockRequest({ headers: { authorization: `Bearer ${expired}` } }), res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: 'Sessie verlopen, log opnieuw in' });
  });

  it('geeft 401 bij een token dat met een ander geheim is gesigneerd', () => {
    const foreign = jwt.sign(USER, 'een-ander-geheim', { expiresIn: '30d' });
    const res = mockResponse();
    const next = mockNext();

    requireAuth(mockRequest({ headers: { authorization: `Bearer ${foreign}` } }), res, next);

    expect(res.statusCode).toBe(401);
  });

  it('negeert een Authorization-header zonder "Bearer "', () => {
    const res = mockResponse();
    const next = mockNext();

    requireAuth(mockRequest({ headers: { authorization: 'Basic abc' } }), res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: 'Niet ingelogd' });
  });
});

describe('requireRole', () => {
  it('laat een toegestane rol door', () => {
    const req = mockRequest();
    req.user = USER;
    const next = mockNext();

    requireRole('owner', 'manager')(req, mockResponse(), next);

    expect(next).toHaveBeenCalledOnce();
  });

  it('geeft 403 bij een rol die er niet bij staat', () => {
    const req = mockRequest();
    req.user = { ...USER, role: 'employee' };
    const res = mockResponse();
    const next = mockNext();

    requireRole('owner', 'manager')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: 'Geen toegang' });
  });

  it('geeft 403 als er helemaal geen gebruiker is', () => {
    const res = mockResponse();
    const next = mockNext();

    requireRole('owner')(mockRequest(), res, next);

    expect(res.statusCode).toBe(403);
  });

  it('laat met een enkele rol alleen die rol door', () => {
    const req = mockRequest();
    req.user = { ...USER, role: 'manager' };
    const res = mockResponse();
    const next = mockNext();

    requireRole('owner')(req, res, next);

    expect(res.statusCode).toBe(403);
  });
});
