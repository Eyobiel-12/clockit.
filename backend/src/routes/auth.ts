import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../db.js';
import { clearSession, isMobile, requireAuth, setSession, type Role } from '../auth.js';
import { restaurantSummary, uniqueInviteCode } from '../queries.js';
import { initials } from '../summary.js';

export const authRouter = Router();

const person = {
  firstName: z.string().trim().min(1, 'Vul je voornaam in').max(60),
  lastName: z.string().trim().min(1, 'Vul je achternaam in').max(80),
  email: z.string().trim().toLowerCase().email('Vul een geldig e-mailadres in').max(190),
  password: z.string().min(8, 'Je wachtwoord moet minimaal 8 tekens hebben').max(200),
};

const registerSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('owner'), ...person, restaurantName: z.string().trim().min(2, 'Vul de naam van je restaurant in').max(120) }),
  z.object({ mode: z.literal('code'), ...person, code: z.string().trim().regex(/^\d{6}$/, 'De code bestaat uit 6 cijfers') }),
]);

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1),
  password: z.string().min(1),
  remember: z.boolean().optional(),
});

type UserRow = RowDataPacket & {
  id: number;
  restaurant_id: number;
  first_name: string;
  last_name: string;
  email: string;
  password_hash: string;
  role: Role;
  department: string | null;
  status: 'active' | 'pending';
};

function publicUser(u: UserRow) {
  return {
    id: u.id,
    firstName: u.first_name,
    lastName: u.last_name,
    initials: initials(u.first_name, u.last_name),
    email: u.email,
    role: u.role,
    department: u.department,
    status: u.status,
  };
}

authRouter.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Ongeldige invoer' });
  }
  const data = parsed.data;

  const [existing] = await pool.query<RowDataPacket[]>('SELECT id FROM users WHERE email = ?', [data.email]);
  if (existing.length) return res.status(409).json({ error: 'Er bestaat al een account met dit e-mailadres' });

  const hash = await bcrypt.hash(data.password, 10);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    let restaurantId: number;
    let role: Role;
    let status: 'active' | 'pending';

    if (data.mode === 'owner') {
      const code = await uniqueInviteCode();
      const [r] = await conn.query<ResultSetHeader>(
        'INSERT INTO restaurants (name, invite_code, invite_expires_at) VALUES (?, ?, NOW() + INTERVAL 7 DAY)',
        [data.restaurantName, code],
      );
      restaurantId = r.insertId;
      role = 'owner';
      status = 'active';
    } else {
      const [rows] = await conn.query<RowDataPacket[]>(
        'SELECT id FROM restaurants WHERE invite_code = ? AND invite_expires_at > NOW()',
        [data.code],
      );
      if (!rows.length) {
        await conn.rollback();
        return res.status(400).json({ error: 'Deze code is onbekend of verlopen. Vraag je leidinggevende om een nieuwe.' });
      }
      restaurantId = rows[0].id;
      role = 'employee';
      status = 'pending';
    }

    const [u] = await conn.query<ResultSetHeader>(
      `INSERT INTO users (restaurant_id, first_name, last_name, email, password_hash, role, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [restaurantId, data.firstName, data.lastName, data.email, hash, role, status],
    );
    await conn.commit();

    const token = setSession(res, { id: u.insertId, restaurantId, role });
    res.status(201).json({ role, status, ...(isMobile(req) ? { token } : {}) });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Vul je e-mailadres en wachtwoord in' });
  const { email, password, remember = true } = parsed.data;

  const [rows] = await pool.query<UserRow[]>('SELECT * FROM users WHERE email = ?', [email]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'E-mailadres of wachtwoord klopt niet' });
  }

  const token = setSession(res, { id: user.id, restaurantId: user.restaurant_id, role: user.role }, remember);
  res.json({ role: user.role, status: user.status, ...(isMobile(req) ? { token } : {}) });
});

authRouter.post('/logout', (_req, res) => {
  clearSession(res);
  res.status(204).end();
});

authRouter.get('/me', requireAuth, async (req, res) => {
  const [rows] = await pool.query<UserRow[]>('SELECT * FROM users WHERE id = ?', [req.user!.id]);
  const user = rows[0];
  if (!user) {
    clearSession(res);
    return res.status(401).json({ error: 'Account bestaat niet meer' });
  }
  res.json({ user: publicUser(user), restaurant: await restaurantSummary(user.restaurant_id) });
});
