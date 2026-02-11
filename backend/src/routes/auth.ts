import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../config/database';
import { generateToken, authMiddleware, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Benutzername und Passwort erforderlich' });
    }

    // Email-Format wie im Frontend: username@clinic.local
    const email = `${username.toLowerCase()}@clinic.local`;

    // Die DB-Funktion authenticate_user nutzen – sie prüft Passwort mit pgcrypto
    const authResult = await pool.query(
      `SELECT * FROM public.authenticate_user($1, $2)`,
      [email, password]
    );

    if (authResult.rows.length === 0 || !authResult.rows[0].user_id) {
      console.log('Login fehlgeschlagen für:', email);
      return res.status(401).json({ error: 'Ungültiger Benutzername oder Passwort' });
    }

    const row = authResult.rows[0];
    const roles = row.roles || [];

    // JWT erstellen
    const token = generateToken({
      id: row.user_id,
      username: row.username,
      displayName: row.display_name,
      roles,
    });

    res.json({
      token,
      user: {
        id: row.user_id,
        username: row.username,
        displayName: row.display_name,
        roles,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Serverfehler bei der Anmeldung' });
  }
});

// Aktuellen Benutzer abrufen
router.get('/me', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }

    // Aktuelle Benutzerdaten aus DB holen
    const profileResult = await pool.query(
      `SELECT p.username, p.display_name, p.created_at
       FROM public.profiles p
       WHERE p.user_id = $1`,
      [req.user.id]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: 'Profil nicht gefunden' });
    }

    const profile = profileResult.rows[0];

    // Rollen abrufen
    const rolesResult = await pool.query(
      `SELECT role FROM public.user_roles WHERE user_id = $1`,
      [req.user.id]
    );
    const roles = rolesResult.rows.map((r) => r.role);

    res.json({
      id: req.user.id,
      username: profile.username,
      displayName: profile.display_name,
      roles,
      createdAt: profile.created_at,
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// Passwort ändern
router.post('/change-password', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Aktuelles und neues Passwort erforderlich' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Neues Passwort muss mindestens 6 Zeichen haben' });
    }

    // Aktuelles Passwort prüfen
    const userResult = await pool.query(
      `SELECT id FROM public.users 
       WHERE id = $1 AND password_hash = crypt($2, password_hash)`,
      [req.user.id, currentPassword]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Aktuelles Passwort ist falsch' });
    }

    // Neues Passwort setzen
    await pool.query(
      `UPDATE public.users 
       SET password_hash = crypt($1, gen_salt('bf', 12)), updated_at = now()
       WHERE id = $2`,
      [newPassword, req.user.id]
    );

    res.json({ success: true, message: 'Passwort erfolgreich geändert' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Serverfehler beim Passwortändern' });
  }
});

export default router;
