# KlinikPortal - Standalone Setup Guide

## Übersicht

Diese Anleitung beschreibt, wie du das KlinikPortal mit einem lokalen PostgreSQL-Server ohne Internet-Abhängigkeiten betreiben kannst.

## Voraussetzungen

- PostgreSQL 14+ (lokal installiert)
- Node.js 18+ 
- npm oder yarn

## 1. Datenbank einrichten

### 1.1 Datenbank erstellen

```bash
# Als PostgreSQL-Superuser anmelden
psql -U postgres

# Datenbank erstellen
CREATE DATABASE klinik_aufnahme;

# Zur neuen Datenbank wechseln
\c klinik_aufnahme
```

### 1.2 SQL-Skript ausführen

Führe das vollständige SQL-Setup-Skript aus der Datei `database-setup.sql` aus:

```bash
psql -U postgres -d klinik_aufnahme -f database-setup.sql
```

Das Skript erstellt:
- Alle benötigten Tabellen (users, profiles, user_roles, patients)
- Enum-Typen für Rollen, Stationen, etc.
- Authentifizierungsfunktionen mit bcrypt/pgcrypto
- Row Level Security (RLS) Policies
- Einen Admin-Benutzer (admin / ChangeMe123!)

## 2. Backend starten

### 2.1 Abhängigkeiten installieren

```bash
cd backend
npm install
```

### 2.2 Konfiguration anpassen

Kopiere `.env.example` nach `.env` und passe die Werte an:

```bash
cp .env.example .env
```

Bearbeite `.env`:
```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=klinik_aufnahme
DATABASE_USER=postgres
DATABASE_PASSWORD=dein_passwort

JWT_SECRET=ein-sehr-langes-geheimes-passwort-hier
JWT_EXPIRES_IN=8h

PORT=3001
CORS_ORIGIN=http://localhost:5173
```

### 2.3 Backend starten

```bash
# Entwicklungsmodus (mit Auto-Reload)
npm run dev

# Oder Produktions-Build
npm run build
npm start
```

Das Backend läuft auf `http://localhost:3001`.

## 3. Frontend konfigurieren

### 3.1 Für Standalone-Modus wechseln

Um das Frontend mit dem lokalen Backend zu verbinden, müssen die Import-Pfade in `App.tsx` angepasst werden:

```tsx
// Ändere diese Imports:
import { AuthProvider } from '@/contexts/AuthContext.standalone';
import { PatientProvider } from '@/contexts/PatientContext.standalone';

// Statt:
// import { AuthProvider } from '@/contexts/AuthContext';
// import { PatientProvider } from '@/contexts/PatientContext';
```

### 3.2 API-URL konfigurieren

Erstelle/bearbeite `.env.local`:

```env
VITE_API_URL=http://localhost:3001/api
```

### 3.3 Frontend starten

```bash
npm install
npm run dev
```

Das Frontend läuft auf `http://localhost:5173`.

## 4. Erster Login

Melde dich mit dem voreingestellten Admin-Benutzer an:

- **Benutzername:** admin
- **Passwort:** ChangeMe123!

⚠️ **Wichtig:** Ändere das Admin-Passwort nach dem ersten Login!

## 5. Benutzer verwalten

Im Admin-Center kannst du:
- Neue Benutzer anlegen
- Rollen zuweisen
- Passwörter zurücksetzen

## API-Endpunkte

### Authentifizierung
| Methode | Endpoint | Beschreibung |
|---------|----------|--------------|
| POST | `/api/auth/login` | Anmelden |
| GET | `/api/auth/me` | Aktueller Benutzer |
| POST | `/api/auth/change-password` | Passwort ändern |

### Patienten
| Methode | Endpoint | Beschreibung |
|---------|----------|--------------|
| GET | `/api/patients` | Alle Patienten |
| GET | `/api/patients/:id` | Einzelner Patient |
| POST | `/api/patients` | Patient erstellen |
| PATCH | `/api/patients/:id` | Patient aktualisieren |
| DELETE | `/api/patients/:id` | Patient löschen (Admin) |

### Benutzerverwaltung (Admin)
| Methode | Endpoint | Beschreibung |
|---------|----------|--------------|
| GET | `/api/users` | Alle Benutzer |
| POST | `/api/users` | Benutzer erstellen |
| PUT | `/api/users/:id/roles` | Rollen aktualisieren |
| POST | `/api/users/:id/reset-password` | Passwort zurücksetzen |
| DELETE | `/api/users/:id` | Benutzer löschen |

## Sicherheitshinweise

1. **JWT_SECRET**: Verwende ein langes, zufälliges Passwort (mind. 32 Zeichen)
2. **CORS**: In Produktion die CORS_ORIGIN auf die tatsächliche Domain setzen
3. **HTTPS**: In Produktion unbedingt HTTPS verwenden
4. **Firewall**: PostgreSQL-Port (5432) nicht nach außen öffnen

## Troubleshooting

### Verbindungsfehler zur Datenbank
- Prüfe, ob PostgreSQL läuft: `pg_isready`
- Prüfe die Zugangsdaten in `.env`
- Prüfe, ob die pgcrypto-Extension installiert ist

### Authentifizierungsfehler
- Prüfe, ob der JWT_SECRET in Frontend und Backend identisch ist
- Prüfe die CORS-Einstellungen

### RLS-Fehler
- Stelle sicher, dass `set_current_user_id()` vor jeder Query aufgerufen wird
- Prüfe die RLS-Policies in der Datenbank
