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

    `CREATE TABLE IF NOT EXISTS access_keys (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      key_prefix VARCHAR(32) NOT NULL,
      key_hash VARCHAR(255) NOT NULL,
      status VARCHAR(32) DEFAULT 'ACTIVE',
      created_at VARCHAR(64) NOT NULL,
      last_used_at VARCHAR(64),
      INDEX idx_ak_user (user_id)
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS login_history (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      user_name VARCHAR(255) NOT NULL,
      login_time VARCHAR(64) NOT NULL,
      logout_time VARCHAR(64),
      ip_address VARCHAR(64),
      device_info TEXT,
      login_status VARCHAR(32) NOT NULL,
      session_id VARCHAR(64),
      INDEX idx_login_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS risk_assessments (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      score INT NOT NULL,
      level VARCHAR(32) NOT NULL,
      factors TEXT NOT NULL,
      latitude DOUBLE,
      longitude DOUBLE,
      accuracy DOUBLE,
      confidence INT,
      created_at VARCHAR(64) NOT NULL,
      INDEX idx_risk_user (user_id)
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

    CREATE TABLE IF NOT EXISTS access_keys (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      key_prefix TEXT NOT NULL,
      key_hash TEXT NOT NULL,
      status TEXT CHECK(status IN ('ACTIVE', 'REVOKED')) DEFAULT 'ACTIVE',
      created_at TEXT NOT NULL,
      last_used_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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

    CREATE TABLE IF NOT EXISTS login_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      login_time TEXT NOT NULL,
      logout_time TEXT,
      ip_address TEXT,
      device_info TEXT,
      login_status TEXT NOT NULL,
      session_id TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS risk_assessments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      score INTEGER NOT NULL,
      level TEXT NOT NULL,
      factors TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      accuracy REAL,
      confidence INTEGER,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
  console.log('[Database] All SQLite tables verified & initialized.');
}

async function seedDefaultData() {
  const salt = bcrypt.genSaltSync(10);
  const now = new Date().toISOString();

  // 1. Seed primary user (ABHISHEK K / USR-7F42A91C)
  const existingUser = await db.queryOne<{ id: string }>('SELECT id FROM users WHERE email = ?', ['demo@nirbhaya.ai']);
  if (!existingUser) {
    const passwordHash = bcrypt.hashSync('demo1234', salt);
    await db.execute(
      'INSERT INTO users (id, name, email, password_hash, phone, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['USR-7F42A91C', 'Abhishek K', 'demo@nirbhaya.ai', passwordHash, '+91 93455 96322', 'USER', now]
    );
    console.log('[Database] Seeded default user: Abhishek K (USR-7F42A91C)');
  } else if (existingUser.id !== 'USR-7F42A91C') {
    // Migrate to permanent clean ID format safely with foreign keys disabled
    if (sqliteDb) sqliteDb.pragma('foreign_keys = OFF');
    await db.execute("UPDATE users SET id = 'USR-7F42A91C', name = 'Abhishek K', phone = '+91 93455 96322' WHERE email = 'demo@nirbhaya.ai'");
    await db.execute("UPDATE trusted_contacts SET user_id = 'USR-7F42A91C' WHERE user_id = ?", [existingUser.id]);
    await db.execute("UPDATE emergency_incidents SET user_id = 'USR-7F42A91C' WHERE user_id = ?", [existingUser.id]);
    await db.execute("UPDATE location_updates SET user_id = 'USR-7F42A91C' WHERE user_id = ?", [existingUser.id]);
    await db.execute("UPDATE tracking_sessions SET user_id = 'USR-7F42A91C' WHERE user_id = ?", [existingUser.id]);
    if (sqliteDb) sqliteDb.pragma('foreign_keys = ON');
    console.log('[Database] Migrated demo user ID to USR-7F42A91C');
  }

  // 2. Seed responder user (Officer Arjun Kumar / RSP-1042)
  const existingResponder = await db.queryOne<{ id: string }>('SELECT id FROM users WHERE email = ?', ['arjun@police.gov.in']);
  if (!existingResponder) {
    const respHash = bcrypt.hashSync('responder1234', salt);
    await db.execute(
      'INSERT INTO users (id, name, email, password_hash, phone, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['RSP-1042', 'Officer Arjun Kumar (Application Responder)', 'arjun@police.gov.in', respHash, '+91 112 000 1042', 'RESPONDER', now]
    );
    console.log('[Database] Seeded default responder: Officer Arjun Kumar (RSP-1042)');
  } else if (existingResponder.id !== 'RSP-1042') {
    if (sqliteDb) sqliteDb.pragma('foreign_keys = OFF');
    await db.execute("UPDATE users SET id = 'RSP-1042', name = 'Officer Arjun Kumar (Application Responder)' WHERE email = 'arjun@police.gov.in'");
    if (sqliteDb) sqliteDb.pragma('foreign_keys = ON');
    console.log('[Database] Migrated responder ID to RSP-1042');
  }

  // 3. Seed admin user (ADM-9001)
  const existingAdmin = await db.queryOne<{ id: string }>('SELECT id FROM users WHERE email = ?', ['admin@nirbhaya.ai']);
  if (!existingAdmin) {
    const adminHash = bcrypt.hashSync('admin1234', salt);
    await db.execute(
      'INSERT INTO users (id, name, email, password_hash, phone, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['ADM-9001', 'Safety Operations Admin', 'admin@nirbhaya.ai', adminHash, '+91 98765 00001', 'ADMIN', now]
    );
    console.log('[Database] Seeded default admin: Safety Operations Admin (ADM-9001)');
  }

  // 4. Seed primary trusted test contact for demo user
  const user = await db.queryOne<{ id: string }>('SELECT id FROM users WHERE email = ?', ['demo@nirbhaya.ai']);
  if (user) {
    const contactCheck = await db.queryOne<{ id: string }>('SELECT id FROM trusted_contacts WHERE user_id = ? AND phone = ?', [user.id, '9345596322']);
    if (!contactCheck) {
      await db.execute(
        `INSERT INTO trusted_contacts (id, user_id, name, phone, email, relationship, is_primary, notification_preference, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'cnt_test_primary_01',
          user.id,
          'Saranya R (Primary Emergency Contact)',
          '9345596322',
          'saranyarajendran2612@gmail.com',
          'Guardian',
          1,
          'All Channels',
          now,
          now
        ]
      );
      console.log('[Database] Seeded primary emergency contact (9345596322 / saranyarajendran2612@gmail.com)');
    }
  }

  // 5. Seed default NIRBHAYA Access Keys (Section 1)
  const seedKey = async (email: string, rawKey: string) => {
    const userRow = await db.queryOne<{ id: string }>('SELECT id FROM users WHERE email = ?', [email]);
    if (!userRow) return;
    const existing = await db.queryOne<{ id: string }>('SELECT id FROM access_keys WHERE user_id = ? AND status = ?', [userRow.id, 'ACTIVE']);
    if (!existing) {
      const keyHash = bcrypt.hashSync(rawKey, salt);
      const prefix = rawKey.substring(0, 8); // e.g. NIR-7F42
      await db.execute(
        'INSERT INTO access_keys (id, user_id, key_prefix, key_hash, status, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [`ak_${userRow.id}`, userRow.id, prefix, keyHash, 'ACTIVE', now]
      );
      console.log(`[Database] Seeded active access key for ${userRow.id}: ${rawKey}`);
    }
  };

  await seedKey('demo@nirbhaya.ai', 'NIR-7F42-SAFE-2026');
  await seedKey('arjun@police.gov.in', 'NIR-1042-RESP-2026');
  await seedKey('admin@nirbhaya.ai', 'NIR-9001-ADMN-2026');
}
