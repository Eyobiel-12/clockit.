import { Router } from 'express';
import { z } from 'zod';
import type { RowDataPacket } from 'mysql2';
import { pool } from '../db.js';
import { requireRole, type Role } from '../auth.js';
import { uniqueInviteCode, weekShifts } from '../queries.js';
import { initials, summarize } from '../summary.js';
import { formatMinutes } from '../time.js';

export const teamRouter = Router();
teamRouter.use(requireRole('owner', 'manager'));

type MemberRow = RowDataPacket & {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: Role;
  department: string | null;
  status: 'active' | 'pending';
};

teamRouter.get('/', async (req, res) => {
  const restaurantId = req.user!.restaurantId;
  const [members] = await pool.query<MemberRow[]>(
    `SELECT id, first_name, last_name, email, role, department, status
       FROM users WHERE restaurant_id = ?
      ORDER BY FIELD(role, 'owner', 'manager', 'employee'), first_name`,
    [restaurantId],
  );
  const { rows, weekStart } = await weekShifts(restaurantId);
  const { perUser } = summarize(rows, weekStart);
  const onShift = new Set(rows.filter((s) => s.clock_out_at === null).map((s) => s.user_id));

  const [[r]] = await pool.query<RowDataPacket[]>(
    'SELECT invite_code, invite_expires_at FROM restaurants WHERE id = ?', [restaurantId],
  );

  const departments = [...new Set(members.map((m) => m.department).filter((d): d is string => !!d))].sort();

  res.json({
    members: members.map((m) => ({
      id: m.id,
      name: `${m.first_name} ${m.last_name}`,
      firstName: m.first_name,
      initials: initials(m.first_name, m.last_name),
      email: m.email,
      role: m.role,
      department: m.department,
      status: m.status === 'pending' ? 'pending' : onShift.has(m.id) ? 'on' : 'off',
      weekHours: formatMinutes(perUser.get(m.id) ?? 0),
    })),
    departments,
    invite: { code: r.invite_code as string, expiresAt: (r.invite_expires_at as Date).toISOString() },
  });
});

const patchSchema = z.object({
  status: z.literal('active').optional(),
  role: z.enum(['manager', 'employee']).optional(),
  department: z.string().trim().max(60).nullable().optional(),
});

async function findMember(restaurantId: number, id: number) {
  const [rows] = await pool.query<MemberRow[]>(
    'SELECT id, role, status FROM users WHERE id = ? AND restaurant_id = ?', [id, restaurantId],
  );
  return rows[0];
}

teamRouter.patch('/:id', async (req, res) => {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Ongeldige invoer' });
  const id = Number(req.params.id);
  const member = await findMember(req.user!.restaurantId, id);
  if (!member) return res.status(404).json({ error: 'Medewerker niet gevonden' });
  if (member.role === 'owner') return res.status(403).json({ error: 'De eigenaar kan niet aangepast worden' });

  const { status, role, department } = parsed.data;
  if (role && req.user!.role !== 'owner') {
    return res.status(403).json({ error: 'Alleen de eigenaar kan rollen wijzigen' });
  }

  const sets: string[] = [];
  const params: unknown[] = [];
  if (status) { sets.push('status = ?'); params.push(status); }
  if (role) { sets.push('role = ?'); params.push(role); }
  if (department !== undefined) { sets.push('department = ?'); params.push(department || null); }
  if (!sets.length) return res.status(400).json({ error: 'Niets om aan te passen' });

  await pool.query(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, [...params, id]);
  res.status(204).end();
});

teamRouter.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const member = await findMember(req.user!.restaurantId, id);
  if (!member) return res.status(404).json({ error: 'Medewerker niet gevonden' });
  if (member.role === 'owner' || id === req.user!.id) {
    return res.status(403).json({ error: 'Deze persoon kan niet verwijderd worden' });
  }
  // Managers mogen alleen aanmeldingen weigeren; actieve medewerkers verwijderen is aan de eigenaar.
  if (member.status === 'active' && req.user!.role !== 'owner') {
    return res.status(403).json({ error: 'Alleen de eigenaar kan medewerkers verwijderen' });
  }
  await pool.query('DELETE FROM users WHERE id = ?', [id]);
  res.status(204).end();
});

teamRouter.post('/invite-code', async (req, res) => {
  const code = await uniqueInviteCode();
  await pool.query(
    'UPDATE restaurants SET invite_code = ?, invite_expires_at = NOW() + INTERVAL 7 DAY WHERE id = ?',
    [code, req.user!.restaurantId],
  );
  const [[r]] = await pool.query<RowDataPacket[]>(
    'SELECT invite_code, invite_expires_at FROM restaurants WHERE id = ?', [req.user!.restaurantId],
  );
  res.json({ code: r.invite_code, expiresAt: (r.invite_expires_at as Date).toISOString() });
});
