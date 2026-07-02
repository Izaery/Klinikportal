import { Router, Response } from 'express';
import { pool, queryWithUser } from '../config/database';
import { authMiddleware, AuthenticatedRequest, requireRoles } from '../middleware/auth';

const router = Router();

// Alle Middleware für Auth
router.use(authMiddleware);

// Alle Patienten abrufen
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const hasContacts = await tableExists('patient_contacts');
    const contactsSelect = hasContacts
      ? `COALESCE((SELECT json_agg(json_build_object(
              'id', c.id,
              'content', c.content,
              'created_by', c.created_by,
              'created_by_display_name', c.created_by_display_name,
              'created_at', c.created_at
          ) ORDER BY c.created_at DESC)
           FROM public.patient_contacts c WHERE c.patient_id = p.id), '[]'::json)`
      : `'[]'::json`;

    const patients = await queryWithUser(
      userId,
      `SELECT p.*, ${contactsSelect} AS contacts
       FROM public.patients p
       ORDER BY p.last_modified_at DESC`
    );

    res.json(patients);
  } catch (error) {
    console.error('Get patients error:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Patienten' });
  }
});

// Einzelnen Patienten abrufen
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const hasContacts = await tableExists('patient_contacts');
    const contactsSelect = hasContacts
      ? `COALESCE((SELECT json_agg(json_build_object(
              'id', c.id,
              'content', c.content,
              'created_by', c.created_by,
              'created_by_display_name', c.created_by_display_name,
              'created_at', c.created_at
          ) ORDER BY c.created_at DESC)
           FROM public.patient_contacts c WHERE c.patient_id = p.id), '[]'::json)`
      : `'[]'::json`;

    const patients = await queryWithUser(
      userId,
      `SELECT p.*, ${contactsSelect} AS contacts
       FROM public.patients p WHERE p.id = $1`,
      [id]
    );

    if (patients.length === 0) {
      return res.status(404).json({ error: 'Patient nicht gefunden' });
    }

    res.json(patients[0]);
  } catch (error) {
    console.error('Get patient error:', error);
    res.status(500).json({ error: 'Fehler beim Laden des Patienten' });
  }
});

// Neuen Patienten erstellen
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const displayName = req.user!.displayName;
    const data = req.body;

    const client = await pool.connect();
    try {
      // User-Kontext setzen für RLS
      await client.query("SELECT set_current_user_id($1)", [userId]);

      const result = await client.query(
        `INSERT INTO public.patients (
          first_name, last_name, birth_date, gender, case_number,
          phone, email, catchment_area, diagnosis, external_referral,
          substance_abuse, substance_abuse_details, relevant_conditions,
          relevant_conditions_details, notes, auftrag, admission_type, urgency,
          station, on_waiting_list, voll_station, secondary_station,
          monday_call, pre_interview_date, pre_interview_confirmed, admission_date,
          move_back_reason, insurance,
          created_by, created_by_display_name,
          last_modified_by, last_modified_by_display_name
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32
        ) RETURNING *`,
        [
          data.first_name,
          data.last_name,
          data.birth_date,
          data.gender,
          data.case_number || null,
          data.phone || null,
          data.email || null,
          data.catchment_area || false,
          data.diagnosis,
          data.external_referral || false,
          data.substance_abuse || false,
          data.substance_abuse_details || null,
          data.relevant_conditions || false,
          data.relevant_conditions_details || null,
          data.notes || null,
          data.auftrag || null,
          data.admission_type,
          data.urgency || null,
          data.station || null,
          data.on_waiting_list || false,
          data.voll_station || null,
          data.secondary_station || null,
          data.monday_call || false,
          data.pre_interview_date || null,
          data.pre_interview_confirmed || false,
          data.admission_date || null,
          data.move_back_reason || null,
          data.insurance || null,
          userId,
          displayName,
          userId,
          displayName,
        ]
      );

      res.status(201).json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Create patient error:', error);
    res.status(500).json({ error: 'Fehler beim Erstellen des Patienten' });
  }
});

// Patienten aktualisieren
router.patch('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const displayName = req.user!.displayName;
    const { id } = req.params;
    const data = req.body;

    // Dynamisches Update erstellen
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const fieldMap: Record<string, string> = {
      first_name: 'first_name',
      last_name: 'last_name',
      birth_date: 'birth_date',
      gender: 'gender',
      case_number: 'case_number',
      phone: 'phone',
      email: 'email',
      catchment_area: 'catchment_area',
      diagnosis: 'diagnosis',
      external_referral: 'external_referral',
      substance_abuse: 'substance_abuse',
      substance_abuse_details: 'substance_abuse_details',
      relevant_conditions: 'relevant_conditions',
      relevant_conditions_details: 'relevant_conditions_details',
      notes: 'notes',
      admission_type: 'admission_type',
      urgency: 'urgency',
      station: 'station',
      on_waiting_list: 'on_waiting_list',
      voll_station: 'voll_station',
      secondary_station: 'secondary_station',
      monday_call: 'monday_call',
      pre_interview_date: 'pre_interview_date',
      admission_date: 'admission_date',
      archived: 'archived',
      auftrag: 'auftrag',
      pre_interview_confirmed: 'pre_interview_confirmed',
      move_back_reason: 'move_back_reason',
      insurance: 'insurance',
    };

    for (const [key, dbField] of Object.entries(fieldMap)) {
      if (data[key] !== undefined) {
        updates.push(`${dbField} = $${paramIndex}`);
        values.push(data[key]);
        paramIndex++;
      }
    }

    // Immer last_modified aktualisieren
    updates.push(`last_modified_by = $${paramIndex}`);
    values.push(userId);
    paramIndex++;

    updates.push(`last_modified_by_display_name = $${paramIndex}`);
    values.push(displayName);
    paramIndex++;

    values.push(id);

    const client = await pool.connect();
    try {
      await client.query("SELECT set_current_user_id($1)", [userId]);

      const result = await client.query(
        `UPDATE public.patients SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Patient nicht gefunden' });
      }

      res.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Update patient error:', error);
    res.status(500).json({ error: 'Fehler beim Aktualisieren des Patienten' });
  }
});

// Patienten löschen (nur Admin)
router.delete(
  '/:id',
  requireRoles('ADMIN'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const client = await pool.connect();
      try {
        await client.query("SELECT set_current_user_id($1)", [userId]);

        const result = await client.query(
          `DELETE FROM public.patients WHERE id = $1 RETURNING id`,
          [id]
        );

        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Patient nicht gefunden' });
        }

        res.json({ success: true, message: 'Patient gelöscht' });
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Delete patient error:', error);
      res.status(500).json({ error: 'Fehler beim Löschen des Patienten' });
    }
  }
);

// Kontakteintrag zu Patient hinzufügen
router.post('/:id/contacts', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const displayName = req.user!.displayName;
    const { id } = req.params;
    const { content } = req.body;

    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'Inhalt ist erforderlich' });
    }

    const client = await pool.connect();
    try {
      await client.query("SELECT set_current_user_id($1)", [userId]);

      const result = await client.query(
        `INSERT INTO public.patient_contacts (patient_id, content, created_by, created_by_display_name)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [id, content.trim(), userId, displayName]
      );

      res.status(201).json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Add patient contact error:', error);
    res.status(500).json({ error: 'Fehler beim Speichern des Kontakteintrags' });
  }
});

export default router;
