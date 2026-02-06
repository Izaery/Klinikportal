import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection } from './config/database';
import authRoutes from './routes/auth';
import patientsRoutes from './routes/patients';
import usersRoutes from './routes/users';

// Konfiguration laden
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
const corsOriginsRaw = process.env.CORS_ORIGIN || 'http://localhost:5173';
const corsOrigins = corsOriginsRaw
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const allowAnyOrigin = corsOrigins.includes('*');

app.use(
  cors({
    origin: (origin, callback) => {
      // origin ist z.B. bei curl/health-checks manchmal undefined
      if (!origin) return callback(null, true);
      if (allowAnyOrigin) return callback(null, true);
      if (corsOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS blockiert Origin: ${origin}`));
    },
    credentials: !allowAnyOrigin,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());

// Logging-Middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Health-Check
app.get(['/health', '/api/health'], (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API-Routen
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientsRoutes);
app.use('/api/users', usersRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route nicht gefunden' });
});

// Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Interner Serverfehler' });
});

// Server starten
async function startServer() {
  // Datenbankverbindung testen
  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.error('⚠️  Server startet ohne Datenbankverbindung');
  }

  app.listen(PORT, () => {
    console.log(`
🏥 KlinikPortal Backend läuft auf Port ${PORT}
   
   Endpoints:
   - POST /api/auth/login          - Anmelden
   - GET  /api/auth/me             - Aktueller Benutzer
   - POST /api/auth/change-password - Passwort ändern
   
   - GET    /api/patients          - Alle Patienten
   - GET    /api/patients/:id      - Einzelner Patient
   - POST   /api/patients          - Patient erstellen
   - PATCH  /api/patients/:id      - Patient aktualisieren
   - DELETE /api/patients/:id      - Patient löschen (Admin)
   
   - GET    /api/users             - Alle Benutzer (Admin)
   - POST   /api/users             - Benutzer erstellen (Admin)
   - PUT    /api/users/:id/roles   - Rollen aktualisieren (Admin)
   - DELETE /api/users/:id         - Benutzer löschen (Admin)
    `);
  });
}

startServer();
