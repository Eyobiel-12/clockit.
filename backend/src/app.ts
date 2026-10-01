import express, { type NextFunction, type Request, type Response } from 'express';
import cookieParser from 'cookie-parser';
import { pool } from './db.js';
import { requireAuth } from './auth.js';
import { authRouter } from './routes/auth.js';
import { teamRouter } from './routes/team.js';
import { dashboardRouter } from './routes/dashboard.js';
import { shiftsRouter } from './routes/shifts.js';
import { restaurantRouter } from './routes/restaurant.js';
import { timesheetRouter } from './routes/timesheet.js';
import { correctionsRouter } from './routes/corrections.js';

/**
 * Bouwt de Express-app zonder te luisteren op een poort, zodat tests hem met
 * supertest kunnen aanroepen. Het opstarten zelf gebeurt in `index.ts`.
 */
export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '100kb' }));

  // CORS voor de Expo-app in de browser (expo start --web). De app gebruikt een Bearer-token,
  // geen cookies, dus '*' zonder credentials is voldoende en stelt de website-cookies niet bloot.
  app.use('/api', (req, res, next) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Client');
    res.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(204).end();
    next();
  });
  app.use(cookieParser());

  app.get('/api/health', async (_req, res) => {
    await pool.query('SELECT 1');
    res.json({ ok: true });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/team', requireAuth, teamRouter);
  app.use('/api/dashboard', requireAuth, dashboardRouter);
  app.use('/api/shifts', requireAuth, shiftsRouter);
  app.use('/api/restaurant', requireAuth, restaurantRouter);
  app.use('/api/timesheet', requireAuth, timesheetRouter);
  app.use('/api/corrections', requireAuth, correctionsRouter);

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Niet gevonden' });
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: 'Er ging iets mis op de server' });
  });

  return app;
}
