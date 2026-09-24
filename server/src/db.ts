import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = process.env.DATABASE_URL || path.join(DATA_DIR, 'nirbhaya.db');
export const db = new Database(DB_PATH);

// Enable WAL mode for high performance concurrent reads/writes
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  console.log(`[Database] Initializing SQLite database at ${DB_PATH}`);

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      phone TEXT NOT NULL,
      role TEXT CHECK(role IN ('USER', 'RESPONDER', 'ADMIN')) DEFAULT 'USER',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS trusted_contacts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      relationship TEXT NOT NULL,
      is_primary INTEGER DEFAULT 0,
      notification_preference TEXT DEFAULT 'All Channels',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS emergency_incidents (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      status TEXT NOT NULL,
      risk_level TEXT NOT NULL,
      risk_score INTEGER NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      accuracy REAL NOT NULL,
      location_name TEXT NOT NULL,
      responder_id TEXT,
      responder_name TEXT,
      responder_badge TEXT,
      responder_latitude REAL,
      responder_longitude REAL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      resolved_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS incident_events (
      id TEXT PRIMARY KEY,
      incident_id TEXT NOT NULL,
      event TEXT NOT NULL,
      actor TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      metadata TEXT,
      FOREIGN KEY (incident_id) REFERENCES emergency_incidents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS location_updates (
      id TEXT PRIMARY KEY,
      incident_id TEXT,
      user_id TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      accuracy REAL NOT NULL,
      speed REAL,
      heading REAL,
      altitude REAL,
      timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tracking_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      incident_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      status TEXT DEFAULT 'ACTIVE',
      started_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS evidence_records (
      id TEXT PRIMARY KEY,
      incident_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      sha256_hash TEXT NOT NULL,
      duration_sec INTEGER,
      is_locked INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      incident_id TEXT NOT NULL,
      recipient TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      provider TEXT NOT NULL,
      provider_message_id TEXT,
      error_message TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      ip_address TEXT,
      timestamp TEXT NOT NULL,
      details TEXT
    );
  `);

  // Seed default demo user and responder if not exists
  const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get('demo@nirbhaya.ai');
  const salt = bcrypt.genSaltSync(10);

  if (!existingUser) {
    const passwordHash = bcrypt.hashSync('demo1234', salt);
    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, phone, role, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      'usr_ananya_01',
      'Ananya Sharma',
      'demo@nirbhaya.ai',
      passwordHash,
      '+91 98765 43210',
      'USER',
      new Date().toISOString()
    );

    console.log('[Database] Seeded default user: Ananya Sharma (demo@nirbhaya.ai)');
  }

  // Seed responder user
  const existingResponder = db.prepare('SELECT id FROM users WHERE email = ?').get('arjun@police.gov.in');
  if (!existingResponder) {
    const respHash = bcrypt.hashSync('responder1234', salt);
    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, phone, role, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      'rsp_arjun_kumar_1042',
      'Officer Arjun Kumar',
      'arjun@police.gov.in',
      respHash,
      '+91 112 000 1042',
      'RESPONDER',
      new Date().toISOString()
    );
    console.log('[Database] Seeded default responder: Officer Arjun Kumar');
  }

  // Seed specifically requested test contacts (9345596322 and saranyarajendran2612@gmail.com)
  const user = db.prepare('SELECT id FROM users WHERE email = ?').get('demo@nirbhaya.ai') as { id: string };
  const contactCheck = db.prepare('SELECT id FROM trusted_contacts WHERE phone = ?').get('9345596322');

  if (!contactCheck && user) {
    // 1. Primary requested test contact (Rule 8 & 9)
    db.prepare(`
      INSERT INTO trusted_contacts (id, user_id, name, phone, email, relationship, is_primary, notification_preference, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'cnt_test_primary_01',
      user.id,
      'Saranya R (Primary Test Guardian)',
      '9345596322',
      'saranyarajendran2612@gmail.com',
      'Guardian',
      1,
      'All Channels',
      new Date().toISOString(),
      new Date().toISOString()
    );

    // 2. Family contact
    db.prepare(`
      INSERT INTO trusted_contacts (id, user_id, name, phone, email, relationship, is_primary, notification_preference, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'cnt_sunita_sharma',
      user.id,
      'Sunita Sharma',
      '+91 98765 11223',
      'sunita.sharma@family.com',
      'Mother',
      0,
      'SMS & App',
      new Date().toISOString(),
      new Date().toISOString()
    );

    console.log('[Database] Seeded requested test contacts (9345596322 / saranyarajendran2612@gmail.com)');
  }

  console.log('[Database] Initialization complete. All tables verified.');
}
