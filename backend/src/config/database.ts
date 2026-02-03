import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  database: process.env.DATABASE_NAME || 'klinik_aufnahme',
  user: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || '',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Helper um die aktuelle User-ID für RLS zu setzen
export async function setCurrentUser(client: any, userId: string | null) {
  if (userId) {
    await client.query("SELECT set_current_user_id($1)", [userId]);
  } else {
    await client.query("SET app.current_user_id = ''");
  }
}

// Helper für Queries mit User-Kontext (für RLS)
export async function queryWithUser<T = any>(
  userId: string | null,
  queryText: string,
  values?: any[]
): Promise<T[]> {
  const client = await pool.connect();
  try {
    await setCurrentUser(client, userId);
    const result = await client.query(queryText, values);
    return result.rows;
  } finally {
    client.release();
  }
}

// Test-Verbindung beim Start
export async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('✅ Datenbankverbindung erfolgreich');
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Datenbankverbindung fehlgeschlagen:', error);
    return false;
  }
}
