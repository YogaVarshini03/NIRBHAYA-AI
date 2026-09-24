import mysql from 'mysql2/promise';
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

let mysqlPool: mysql.Pool | null = null;
let sqliteDb: Database.Database | null = null;
let activeEngine: 'MYSQL' | 'SQLITE' = 'SQLITE';

function normalizeParams(params: any[]): any[] {
  if (params.length === 1 && Array.isArray(params[0])) {
    return params[0];
  }
  return params;
}

export const db = {
  isMySQL(): boolean {
    return activeEngine === 'MYSQL';
  },

  getEngine(): string {
    return activeEngine;
  },

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const flat = normalizeParams(params);
    if (mysqlPool) {
      const [rows] = await mysqlPool.query(sql, flat);
      return rows as T[];
    }
    if (sqliteDb) {
      return sqliteDb.prepare(sql).all(...flat) as T[];
    }
    throw new Error('Database not initialized');
  },

  async queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows && rows.length > 0 ? rows[0] : null;
  },

  async execute(sql: string, params: any[] = []): Promise<{ changes: number; lastInsertRowid?: any }> {
    const flat = normalizeParams(params);
    if (mysqlPool) {
      const [result] = await mysqlPool.execute(sql, flat);
      const res = result as mysql.ResultSetHeader;
      return { changes: res.affectedRows, lastInsertRowid: res.insertId };
    }
    if (sqliteDb) {
      const info = sqliteDb.prepare(sql).run(...flat);
      return { changes: info.changes, lastInsertRowid: info.lastInsertRowid };
    }
    throw new Error('Database not initialized');
  },

  prepare(sql: string) {
    if (mysqlPool) {
      return {
        run: async (...params: any[]) => {
          return db.execute(sql, normalizeParams(params));
        },
        get: async (...params: any[]) => {
          return db.queryOne(sql, normalizeParams(params));
        },
        all: async (...params: any[]) => {
          return db.query(sql, normalizeParams(params));
        },
      };
    }

    if (sqliteDb) {
      const stmt = sqliteDb.prepare(sql);
      return {
        run: (...params: any[]) => {
          const flat = normalizeParams(params);
          return stmt.run(...flat);
        },
        get: (...params: any[]) => {
          const flat = normalizeParams(params);
          return stmt.get(...flat);
        },
        all: (...params: any[]) => {
          const flat = normalizeParams(params);
          return stmt.all(...flat);
        },
      };
    }

    throw new Error('Database not initialized');
  }
};

export async function initDatabase(): Promise<void> {
  const isMySQLConfigured = Boolean(
    process.env.MYSQLHOST ||
    process.env.MYSQL_URL ||
    (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('mysql'))
  );

  if (isMySQLConfigured) {
    try {
      console.log('[Database] Railway MySQL configuration detected. Connecting to MySQL...');

      if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('mysql')) {
        mysqlPool = mysql.createPool({
          uri: process.env.DATABASE_URL,
          waitForConnections: true,
          connectionLimit: 10,
          queueLimit: 0,
        });
      } else if (process.env.MYSQL_URL) {
        mysqlPool = mysql.createPool({
          uri: process.env.MYSQL_URL,
          waitForConnections: true,
          connectionLimit: 10,
          queueLimit: 0,
        });
      } else {
        mysqlPool = mysql.createPool({
          host: process.env.MYSQLHOST || 'localhost',
          port: Number(process.env.MYSQLPORT) || 3306,
          user: process.env.MYSQLUSER || 'root',
          password: process.env.MYSQLPASSWORD || '',
          database: process.env.MYSQLDATABASE || 'railway',
          waitForConnections: true,
          connectionLimit: 10,
          queueLimit: 0,
        });
      }

      // Test connection
      const connection = await mysqlPool.getConnection();
      console.log(`[Database] Successfully connected to Railway MySQL on ${process.env.MYSQLHOST || 'internal network'}!`);
      connection.release();

      activeEngine = 'MYSQL';
      await initMySQLTables();
      await seedDefaultData();
      return;
    } catch (mysqlErr: any) {
      console.warn(`[Database] MySQL connection failed (${mysqlErr.message}). Falling back to local SQLite.`);
      mysqlPool = null;
    }
  }

  // SQLite fallback
  const DB_PATH = (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('mysql'))
    ? process.env.DATABASE_URL
    : path.join(DATA_DIR, 'nirbhaya.db');

  console.log(`[Database] Initializing SQLite database at ${DB_PATH}`);
  sqliteDb = new Database(DB_PATH);
  sqliteDb.pragma('journal_mode = WAL');
  sqliteDb.pragma('foreign_keys = ON');
  activeEngine = 'SQLITE';

  initSQLiteTables();
  await seedDefaultData();
}

async function initMySQLTables() {
  if (!mysqlPool) return;

  const tables = [
    `CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      phone VARCHAR(64) NOT NULL,
      role VARCHAR(32) DEFAULT 'USER',
      created_at VARCHAR(64) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS trusted_contacts (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      name VARCHAR(255) NOT NULL,
      phone VARCHAR(64) NOT NULL,
      email VARCHAR(255) NOT NULL,
      relationship VARCHAR(64) NOT NULL,
      is_primary INT DEFAULT 0,
      notification_preference VARCHAR(64) DEFAULT 'All Channels',
      created_at VARCHAR(64) NOT NULL,
      updated_at VARCHAR(64) NOT NULL,
      INDEX idx_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS emergency_incidents (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      status VARCHAR(32) NOT NULL,
      risk_level VARCHAR(32) NOT NULL,
      risk_score INT NOT NULL,
      latitude DOUBLE NOT NULL,
      longitude DOUBLE NOT NULL,
      accuracy DOUBLE NOT NULL,
      location_name VARCHAR(255) NOT NULL,
      responder_id VARCHAR(64),
      responder_name VARCHAR(255),
      responder_badge VARCHAR(64),
      responder_latitude DOUBLE,
      responder_longitude DOUBLE,
      created_at VARCHAR(64) NOT NULL,
      updated_at VARCHAR(64) NOT NULL,
      resolved_at VARCHAR(64),
      INDEX idx_status (status),
      INDEX idx_inc_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS incident_events (
      id VARCHAR(64) PRIMARY KEY,
      incident_id VARCHAR(64) NOT NULL,
      event VARCHAR(255) NOT NULL,
      actor VARCHAR(255) NOT NULL,
      timestamp VARCHAR(64) NOT NULL,
      metadata TEXT,
      INDEX idx_event_inc (incident_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS location_updates (
      id VARCHAR(64) PRIMARY KEY,
      incident_id VARCHAR(64),
      user_id VARCHAR(64) NOT NULL,
      latitude DOUBLE NOT NULL,
      longitude DOUBLE NOT NULL,
      accuracy DOUBLE NOT NULL,
      speed DOUBLE,
      heading DOUBLE,
      altitude DOUBLE,
      timestamp VARCHAR(64) NOT NULL,
      INDEX idx_loc_inc (incident_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS tracking_sessions (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      incident_id VARCHAR(64) NOT NULL,
      token VARCHAR(255) UNIQUE NOT NULL,
      status VARCHAR(32) DEFAULT 'ACTIVE',
      started_at VARCHAR(64) NOT NULL,
      expires_at VARCHAR(64) NOT NULL,
      INDEX idx_token (token)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS evidence_records (
      id VARCHAR(64) PRIMARY KEY,
      incident_id VARCHAR(64) NOT NULL,
      user_id VARCHAR(64) NOT NULL,
      type VARCHAR(32) NOT NULL,
      title VARCHAR(255) NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      file_path VARCHAR(512) NOT NULL,
      file_size BIGINT NOT NULL,
      mime_type VARCHAR(64) NOT NULL,
      sha256_hash VARCHAR(128) NOT NULL,
      duration_sec INT,
      is_locked INT DEFAULT 1,
      created_at VARCHAR(64) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS notifications (
      id VARCHAR(64) PRIMARY KEY,
      incident_id VARCHAR(64) NOT NULL,
      recipient VARCHAR(255) NOT NULL,
      type VARCHAR(32) NOT NULL,
      status VARCHAR(32) NOT NULL,
      provider VARCHAR(64) NOT NULL,
      provider_message_id VARCHAR(255),
      error_message TEXT,
      created_at VARCHAR(64) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS audit_logs (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64),
      action VARCHAR(255) NOT NULL,
      ip_address VARCHAR(64),
      timestamp VARCHAR(64) NOT NULL,
      details TEXT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
  ];

  for (const tableSql of tables) {
    await mysqlPool.query(tableSql);
  }
  console.log('[Database] All MySQL tables verified & initialized.');
}

function initSQLiteTables() {
  if (!sqliteDb) return;

  sqliteDb.exec(`
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
  console.log('[Database] All SQLite tables verified & initialized.');
}

async function seedDefaultData() {
  const salt = bcrypt.genSaltSync(10);
  const now = new Date().toISOString();

  // 1. Seed demo user
  const existingUser = await db.queryOne<{ id: string }>('SELECT id FROM users WHERE email = ?', ['demo@nirbhaya.ai']);
  if (!existingUser) {
    const passwordHash = bcrypt.hashSync('demo1234', salt);
    await db.execute(
      'INSERT INTO users (id, name, email, password_hash, phone, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['usr_ananya_01', 'Ananya Sharma', 'demo@nirbhaya.ai', passwordHash, '+91 98765 43210', 'USER', now]
    );
    console.log('[Database] Seeded default user: Ananya Sharma (demo@nirbhaya.ai)');
  }

  // 2. Seed responder user
  const existingResponder = await db.queryOne<{ id: string }>('SELECT id FROM users WHERE email = ?', ['arjun@police.gov.in']);
  if (!existingResponder) {
    const respHash = bcrypt.hashSync('responder1234', salt);
    await db.execute(
      'INSERT INTO users (id, name, email, password_hash, phone, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['rsp_arjun_kumar_1042', 'Officer Arjun Kumar', 'arjun@police.gov.in', respHash, '+91 112 000 1042', 'RESPONDER', now]
    );
    console.log('[Database] Seeded default responder: Officer Arjun Kumar');
  }

  // 3. Seed requested trusted test contacts
  const user = await db.queryOne<{ id: string }>('SELECT id FROM users WHERE email = ?', ['demo@nirbhaya.ai']);
  const contactCheck = await db.queryOne<{ id: string }>('SELECT id FROM trusted_contacts WHERE phone = ?', ['9345596322']);

  if (!contactCheck && user) {
    // Primary requested test contact (Rule 8 & 9)
    await db.execute(
      `INSERT INTO trusted_contacts (id, user_id, name, phone, email, relationship, is_primary, notification_preference, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'cnt_test_primary_01',
        user.id,
        'Saranya R (Primary Test Guardian)',
        '9345596322',
        'saranyarajendran2612@gmail.com',
        'Guardian',
        1,
        'All Channels',
        now,
        now
      ]
    );

    // Family contact
    await db.execute(
      `INSERT INTO trusted_contacts (id, user_id, name, phone, email, relationship, is_primary, notification_preference, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'cnt_sunita_sharma',
        user.id,
        'Sunita Sharma',
        '+91 98765 11223',
        'sunita.sharma@family.com',
        'Mother',
        0,
        'SMS & App',
        now,
        now
      ]
    );

    console.log('[Database] Seeded requested test contacts (9345596322 / saranyarajendran2612@gmail.com)');
  }
}
