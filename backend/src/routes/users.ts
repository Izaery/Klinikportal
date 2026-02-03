import { Router, Response } from 'express';
import { pool, queryWithUser } from '../config/database';
import { authMiddleware, AuthenticatedRequest, requireRoles } from '../middleware/auth';

const router = Router();

// Alle Middleware für Auth
router.use(authMiddleware);

// Alle Benutzer abrufen (nur Admin)
router.get(
  '/',
  requireRoles('ADMIN'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await pool.query(
        `SELECT 
          u.id,
          p.username,
          p.display_name,
          p.created_at,
          COALESCE(array_agg(ur.role) FILTER (WHERE ur.role IS NOT NULL), '{}') as roles
         FROM public.users u
         JOIN public.profiles p ON p.user_id = u.id
         LEFT JOIN public.user_roles ur ON ur.user_id = u.id
         GROUP BY u.id, p.username, p.display_name, p.created_at
         ORDER BY p.created_at DESC`
      );

      res.json(result.rows);
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ error: 'Fehler beim Laden der Benutzer' });
    }
  }
);

// Benutzer erstellen (nur Admin)
router.post(
  '/',
  requireRoles('ADMIN'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { username, password, displayName, roles } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: 'Benutzername und Passwort erforderlich' });
      }

      const email = `${username.toLowerCase()}@clinic.local`;

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Benutzer erstellen
        const userResult = await client.query(
          `INSERT INTO public.users (email, password_hash, email_confirmed)
           VALUES ($1, crypt($2, gen_salt('bf', 12)), true)
           RETURNING id`,
          [email, password]
        );

        const userId = userResult.rows[0].id;

        // Profil erstellen
        await client.query(
          `INSERT INTO public.profiles (user_id, username, display_name)
           VALUES ($1, $2, $3)`,
          [userId, username.toLowerCase(), displayName || username]
        );

        // Rollen zuweisen
        const userRoles = roles || ['INTAKE'];
        for (const role of userRoles) {
          await client.query(
            `INSERT INTO public.user_roles (user_id, role) VALUES ($1, $2)`,
            [userId, role]
          );
        }

        await client.query('COMMIT');

        res.status(201).json({
          success: true,
          message: `Benutzer ${username} erstellt`,
          userId,
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error('Create user error:', error);
      if (error.constraint === 'users_email_key') {
        return res.status(400).json({ error: 'Benutzername existiert bereits' });
      }
      res.status(500).json({ error: 'Fehler beim Erstellen des Benutzers' });
    }
  }
);

// Benutzer-Rollen aktualisieren (nur Admin)
router.put(
  '/:id/roles',
  requireRoles('ADMIN'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { roles } = req.body;

      if (!Array.isArray(roles)) {
        return res.status(400).json({ error: 'Rollen müssen ein Array sein' });
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Alte Rollen löschen
        await client.query(
          `DELETE FROM public.user_roles WHERE user_id = $1`,
          [id]
        );

        // Neue Rollen zuweisen
        for (const role of roles) {
          await client.query(
            `INSERT INTO public.user_roles (user_id, role) VALUES ($1, $2)`,
            [id, role]
          );
        }

        await client.query('COMMIT');

        res.json({ success: true, message: 'Rollen aktualisiert' });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Update roles error:', error);
      res.status(500).json({ error: 'Fehler beim Aktualisieren der Rollen' });
    }
  }
);

// Benutzer-Passwort zurücksetzen (nur Admin)
router.post(
  '/:id/reset-password',
  requireRoles('ADMIN'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;

      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: 'Passwort muss mindestens 6 Zeichen haben' });
      }

      await pool.query(
        `UPDATE public.users 
         SET password_hash = crypt($1, gen_salt('bf', 12)), updated_at = now()
         WHERE id = $2`,
        [newPassword, id]
      );

      res.json({ success: true, message: 'Passwort zurückgesetzt' });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ error: 'Fehler beim Zurücksetzen des Passworts' });
    }
  }
);

// Benutzer löschen (nur Admin)
router.delete(
  '/:id',
  requireRoles('ADMIN'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;

      // Verhindere dass man sich selbst löscht
      if (id === req.user!.id) {
        return res.status(400).json({ error: 'Sie können sich nicht selbst löschen' });
      }

      await pool.query(`DELETE FROM public.users WHERE id = $1`, [id]);

      res.json({ success: true, message: 'Benutzer gelöscht' });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ error: 'Fehler beim Löschen des Benutzers' });
    }
  }
);

// Alle Profile abrufen (für Anzeigenamen)
router.get('/profiles', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT user_id, username, display_name FROM public.profiles`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get profiles error:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Profile' });
  }
});

export default router;
