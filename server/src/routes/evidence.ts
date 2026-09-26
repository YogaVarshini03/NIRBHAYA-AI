import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from './auth';

export const evidenceRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'nirbhaya_super_secure_jwt_secret_2026';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads', 'evidence');
if (!fs.existsSync(BASE_UPLOADS_DIR)) {
  fs.mkdirSync(BASE_UPLOADS_DIR, { recursive: true });
}

// Multer storage: uploads/evidence/<userId>/<evidenceId>/<filename>
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const user = (req as any).user;
    const userId = user?.id || 'anonymous';
    const evidenceId = `evi_${uuidv4()}`;
    (req as any).evidenceId = evidenceId;
    const targetDir = path.join(BASE_UPLOADS_DIR, userId, evidenceId);
    fs.mkdirSync(targetDir, { recursive: true });
    cb(null, targetDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || (file.mimetype.startsWith('audio') ? '.webm' : '.jpg');
    const safeName = `media_${Date.now()}${ext}`;
    cb(null, safeName);
  },
});

const ALLOWED_MIME_PREFIXES = ['image/', 'audio/', 'video/'];
const DANGEROUS_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.sh', '.php', '.js', '.ts', '.py', '.dll', '.vbs', '.msi', '.html', '.htm', '.svg', '.bin'
]);

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (DANGEROUS_EXTENSIONS.has(ext)) {
      return cb(new Error('Executable and script file uploads are strictly prohibited for system security.'));
    }

    const isAllowedMime = ALLOWED_MIME_PREFIXES.some(prefix => file.mimetype.startsWith(prefix)) ||
      file.mimetype === 'application/octet-stream';

    if (!isAllowedMime) {
      return cb(new Error('Invalid MIME type. Only photo, video, and audio media may be deposited into the vault.'));
    }

    cb(null, true);
  },
});

// Helper: Calculate SHA-256 hash of a file on disk
function calculateSHA256(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

// Log audit event helper
async function logAuditEvent(evidenceId: string, userId: string, action: string, metadata: any = {}) {
  try {
    const auditId = `aud_${uuidv4()}`;
    const now = new Date().toISOString();
    await db.execute(`
      INSERT INTO evidence_audit (id, evidence_id, user_id, action, timestamp, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [auditId, evidenceId, userId, action, now, JSON.stringify(metadata)]);
  } catch (err) {
    console.warn('[Evidence Audit] Could not record audit event:', err);
  }
}

// Evidence Vault Session Middleware: Requires both valid JWT user AND valid Evidence Vault token
export async function requireEvidenceVaultAuth(req: Request, res: Response, next: Function) {
  const user = (req as any).user;
  if (!user || !user.id) {
    return res.status(401).json({ success: false, error: 'Authentication required. Authorization header missing.' });
  }

  // Token can be passed via header x-evidence-vault-token or query param vaultToken
  const vaultToken = (req.headers['x-evidence-vault-token'] as string) || (req.query.vaultToken as string);
  if (!vaultToken) {
    return res.status(403).json({
      success: false,
      error: 'Evidence Vault authorization required. Please enter your NIRBHAYA Access Key.',
      requiresVaultAuth: true,
    });
  }

  try {
    const decoded = jwt.verify(vaultToken, JWT_SECRET) as any;
    if (decoded.userId !== user.id || decoded.type !== 'EVIDENCE_VAULT') {
      return res.status(403).json({ success: false, error: 'Invalid evidence vault session token.', requiresVaultAuth: true });
    }

    // Check if session exists and is active in database (queried by primary key id)
    const session = await db.queryOne<{ id: string; user_id: string; revoked_at: string | null }>(
      'SELECT id, user_id, revoked_at FROM evidence_sessions WHERE id = ?',
      [decoded.sessionId]
    );

    if (!session || session.revoked_at || session.user_id !== user.id) {
      return res.status(403).json({ success: false, error: 'Evidence session has been locked or revoked.', requiresVaultAuth: true });
    }

    (req as any).vaultSession = decoded;
    next();
  } catch (err: any) {
    return res.status(403).json({
      success: false,
      error: 'Evidence session expired or invalid. Please verify access key again.',
      requiresVaultAuth: true
    });
  }
}

// ----------------------------------------------------
// ACCESS KEY VERIFICATION & SESSION MANAGEMENT
// ----------------------------------------------------

// In-memory rate limiting map for brute force protection (resilient across SQLite and MySQL)
const failedAttemptMap = new Map<string, { count: number; lockedUntil: number }>();

// POST /api/evidence/access/verify - Verify NIRBHAYA Access Key & Issue Short-Lived Vault Session
evidenceRouter.post('/access/verify', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const { accessKey } = req.body;

  if (!accessKey || typeof accessKey !== 'string') {
    res.status(400).json({ success: false, error: 'NIRBHAYA Access Key is required.' });
    return;
  }

  try {
    // 1. Check brute force lockout
    const userAttempts = failedAttemptMap.get(user.id);
    const nowMs = Date.now();
    if (userAttempts && userAttempts.lockedUntil > nowMs) {
      const waitMin = Math.ceil((userAttempts.lockedUntil - nowMs) / 60000);
      res.status(429).json({
        success: false,
        error: `Too many failed attempts. Evidence vault is temporarily locked for ${waitMin} more minute(s). Try again later.`
      });
      return;
    }

    // 2. Fetch user's active key record using standard schema columns only
    const keyRow = await db.queryOne<any>(
      'SELECT id, user_id, key_prefix, key_hash, status, created_at, last_used_at FROM access_keys WHERE user_id = ? AND status = ? ORDER BY created_at DESC LIMIT 1',
      [user.id, 'ACTIVE']
    );

    if (!keyRow) {
      res.status(404).json({ success: false, error: 'No active NIRBHAYA Access Key found for this account.' });
      return;
    }

    const inputKey = accessKey.trim().toUpperCase();
    let isMatch = false;

    // 3. Verify input key against stored bcrypt hash
    if (keyRow.key_hash && typeof keyRow.key_hash === 'string' && keyRow.key_hash.startsWith('$2')) {
      try {
        isMatch = bcrypt.compareSync(inputKey, keyRow.key_hash);
      } catch (bcryptErr) {
        console.warn('[Evidence Access] bcrypt compare error:', bcryptErr);
        isMatch = false;
      }
    }

    if (!isMatch) {
      const current = failedAttemptMap.get(user.id) || { count: 0, lockedUntil: 0 };
      current.count += 1;
      if (current.count >= 5) {
        current.lockedUntil = Date.now() + 15 * 60 * 1000; // 15 minute lockout
        failedAttemptMap.set(user.id, current);
        res.status(429).json({
          success: false,
          error: 'Too many failed attempts. Evidence vault locked for 15 minutes.'
        });
        return;
      }

      failedAttemptMap.set(user.id, current);
      res.status(401).json({
        success: false,
        error: 'Invalid NIRBHAYA Access Key.'
      });
      return;
    }

    // Reset failed attempts upon successful match
    failedAttemptMap.delete(user.id);

    // Safely update last_used_at on access_keys table (standard column)
    const nowIso = new Date().toISOString();
    try {
      await db.execute(
        'UPDATE access_keys SET last_used_at = ? WHERE id = ?',
        [nowIso, keyRow.id]
      );
    } catch (updateErr) {
      console.warn('[Evidence Access] Could not update last_used_at on access_keys:', updateErr);
    }

    // 4. Create 30-minute Evidence Vault Session
    const sessionId = `evses_${uuidv4()}`;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const vaultToken = jwt.sign(
      { userId: user.id, sessionId, type: 'EVIDENCE_VAULT' },
      JWT_SECRET,
      { expiresIn: '30m' }
    );

    await db.execute(`
      INSERT INTO evidence_sessions (id, user_id, session_token, created_at, expires_at, revoked_at)
      VALUES (?, ?, ?, ?, ?, NULL)
    `, [sessionId, user.id, vaultToken, nowIso, expiresAt]);

    res.json({
      success: true,
      message: 'Access verified. Evidence Vault unlocked.',
      vaultToken,
      expiresAt,
      expiresInSec: 1800,
    });
  } catch (err: any) {
    console.error('[Evidence Access] Error verifying key:', err);
    res.status(500).json({ success: false, error: err.message || 'Server error verifying access key.' });
  }
});

// POST /api/evidence/access/revoke - Lock Vault Session Immediately
evidenceRouter.post('/access/revoke', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const vaultToken = (req.headers['x-evidence-vault-token'] as string) || req.body?.vaultToken;

  if (vaultToken) {
    try {
      let decodedSessionId: string | null = null;
      try {
        const decoded = jwt.verify(vaultToken, JWT_SECRET) as any;
        decodedSessionId = decoded.sessionId;
      } catch {}

      const now = new Date().toISOString();
      if (decodedSessionId) {
        await db.execute('UPDATE evidence_sessions SET revoked_at = ? WHERE id = ? AND user_id = ?', [now, decodedSessionId, user.id]);
      } else {
        await db.execute('UPDATE evidence_sessions SET revoked_at = ? WHERE session_token = ? AND user_id = ?', [now, vaultToken, user.id]);
      }
    } catch (err) {
      console.warn('[Evidence Access Revoke] Error revoking session:', err);
    }
  }

  res.json({ success: true, message: 'Evidence Vault session locked successfully.' });
});

// GET /api/evidence/access/status - Check if active session is valid
evidenceRouter.get('/access/status', requireAuth, requireEvidenceVaultAuth, (req: Request, res: Response) => {
  res.json({ success: true, authorized: true });
});

// ----------------------------------------------------
// EVIDENCE CRUD ENDPOINTS (Protected by requireAuth + requireEvidenceVaultAuth)
// ----------------------------------------------------

// POST /api/evidence/upload - Upload Real Camera Snapshot or Audio Clip
evidenceRouter.post('/upload', requireAuth, requireEvidenceVaultAuth, upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No media file provided' });
      return;
    }

    const user = (req as any).user;
    const evidenceId = (req as any).evidenceId || `evi_${uuidv4()}`;
    const {
      incidentId = 'direct_capture',
      type = 'photo',
      title = 'Captured Evidence',
      durationSec = null,
      latitude = null,
      longitude = null,
      gpsAccuracy = null,
      capturedAt = null,
    } = req.body;

    const filePath = req.file.path;
    const sha256Hash = await calculateSHA256(filePath);
    const now = new Date().toISOString();

    const parsedLat = latitude !== null && latitude !== '' && !isNaN(Number(latitude)) ? Number(latitude) : null;
    const parsedLon = longitude !== null && longitude !== '' && !isNaN(Number(longitude)) ? Number(longitude) : null;
    const parsedAcc = gpsAccuracy !== null && gpsAccuracy !== '' && !isNaN(Number(gpsAccuracy)) ? Number(gpsAccuracy) : null;
    const parsedDuration = durationSec !== null && !isNaN(Number(durationSec)) ? Number(durationSec) : null;

    await db.execute(`
      INSERT INTO evidence_records (
        id, incident_id, user_id, user_name, type, title, file_name, file_path, file_size, mime_type, sha256_hash, duration_sec, latitude, longitude, gps_accuracy, captured_at, is_locked, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `, [
      evidenceId,
      incidentId,
      user.id,
      user.name || 'Authenticated User',
      type,
      title,
      req.file.filename,
      filePath,
      req.file.size,
      req.file.mimetype,
      sha256Hash,
      parsedDuration,
      parsedLat,
      parsedLon,
      parsedAcc,
      capturedAt || now,
      now
    ]);

    // Record complete Chain of Custody Audit Trail
    await logAuditEvent(evidenceId, user.id, 'EVIDENCE_CREATED', { type, title, mimeType: req.file.mimetype, size: req.file.size });
    await logAuditEvent(evidenceId, user.id, 'METADATA_ATTACHED', { latitude: parsedLat, longitude: parsedLon, accuracy: parsedAcc, incidentId });
    await logAuditEvent(evidenceId, user.id, 'SHA256_GENERATED', { sha256: sha256Hash });
    await logAuditEvent(evidenceId, user.id, 'EVIDENCE_STORED', { storagePath: `evidence/${user.id}/${evidenceId}/${req.file.filename}` });
    await logAuditEvent(evidenceId, user.id, 'EVIDENCE_LOCKED', { isLocked: true });

    res.status(201).json({
      success: true,
      message: 'Evidence securely stored with SHA-256 integrity hash recorded',
      evidence: {
        id: evidenceId,
        incidentId,
        userId: user.id,
        userName: user.name || 'Authenticated User',
        type,
        title,
        fileName: req.file.filename,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        sha256Hash,
        durationSec: parsedDuration,
        latitude: parsedLat,
        longitude: parsedLon,
        gpsAccuracy: parsedAcc,
        capturedAt: capturedAt || now,
        isLocked: true,
        createdAt: now,
      },
    });
  } catch (error: any) {
    console.error('[Evidence] Error uploading evidence:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/evidence - List Evidence Records for Current User
evidenceRouter.get('/', requireAuth, requireEvidenceVaultAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { incidentId } = req.query;

    let query = 'SELECT * FROM evidence_records WHERE user_id = ?';
    const params: any[] = [user.id];

    if (incidentId) {
      query += ' AND incident_id = ?';
      params.push(incidentId);
    }

    query += ' ORDER BY created_at DESC';

    const records = await db.query(query, params);
    const enriched = records.map((r: any) => ({
      id: r.id,
      incidentId: r.incident_id,
      userId: r.user_id,
      userName: r.user_name || user.name,
      type: r.type,
      title: r.title,
      fileName: r.file_name,
      fileSize: r.file_size,
      mimeType: r.mime_type,
      sha256Hash: r.sha256_hash,
      durationSec: r.duration_sec,
      latitude: r.latitude,
      longitude: r.longitude,
      gpsAccuracy: r.gps_accuracy,
      capturedAt: r.captured_at || r.created_at,
      isLocked: Boolean(r.is_locked),
      createdAt: r.created_at,
    }));

    res.json({ success: true, count: enriched.length, evidence: enriched });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/evidence/:id - Get Single Evidence Record
evidenceRouter.get('/:id', requireAuth, requireEvidenceVaultAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const record = await db.queryOne<any>('SELECT * FROM evidence_records WHERE id = ?', [id]);

    if (!record) {
      res.status(404).json({ success: false, error: 'Evidence record not found.' });
      return;
    }

    if (record.user_id !== user.id && user.role !== 'ADMIN') {
      res.status(403).json({ success: false, error: 'Access denied to this evidence record.' });
      return;
    }

    res.json({
      success: true,
      evidence: {
        id: record.id,
        incidentId: record.incident_id,
        userId: record.user_id,
        userName: record.user_name,
        type: record.type,
        title: record.title,
        fileName: record.file_name,
        fileSize: record.file_size,
        mimeType: record.mime_type,
        sha256Hash: record.sha256_hash,
        durationSec: record.duration_sec,
        latitude: record.latitude,
        longitude: record.longitude,
        gpsAccuracy: record.gps_accuracy,
        capturedAt: record.captured_at || record.created_at,
        isLocked: Boolean(record.is_locked),
        createdAt: record.created_at,
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/evidence/:id/file - Stream Actual Stored Audio/Video/Image File
evidenceRouter.get('/:id/file', requireAuth, requireEvidenceVaultAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const record = await db.queryOne<any>('SELECT * FROM evidence_records WHERE id = ?', [id]);

    if (!record) {
      res.status(404).json({ success: false, error: 'Evidence record not found.' });
      return;
    }

    if (record.user_id !== user.id && user.role !== 'ADMIN') {
      res.status(403).json({ success: false, error: 'Access denied to this evidence file.' });
      return;
    }

    if (!fs.existsSync(record.file_path)) {
      res.status(404).json({ success: false, error: 'Evidence file unavailable' });
      return;
    }

    const stat = fs.statSync(record.file_path);
    const fileSize = stat.size;
    const range = req.headers.range;

    // Record audit event: file accessed
    await logAuditEvent(id, user.id, 'EVIDENCE_ACCESSED', { action: 'STREAM_FILE', ip: req.ip });

    // Handle HTTP 206 Partial Content for audio/video scrub/seek
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const fileStream = fs.createReadStream(record.file_path, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': record.mime_type,
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      });
      fileStream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': record.mime_type,
        'Content-Disposition': `inline; filename="${record.file_name}"`,
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      });
      fs.createReadStream(record.file_path).pipe(res);
    }
  } catch (error: any) {
    console.error('[Evidence File Stream] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to stream evidence file.' });
  }
});

// GET /api/evidence/:id/metadata - Real Cryptographic Metadata & Chain of Custody
evidenceRouter.get('/:id/metadata', requireAuth, requireEvidenceVaultAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const record = await db.queryOne<any>('SELECT * FROM evidence_records WHERE id = ?', [id]);

    if (!record) {
      res.status(404).json({ success: false, error: 'Evidence record not found.' });
      return;
    }

    if (record.user_id !== user.id && user.role !== 'ADMIN') {
      res.status(403).json({ success: false, error: 'Access denied.' });
      return;
    }

    // Fetch real audit trail from database
    const audits = await db.query(
      'SELECT id, action, timestamp, metadata FROM evidence_audit WHERE evidence_id = ? ORDER BY timestamp ASC',
      [id]
    );

    res.json({
      success: true,
      metadata: {
        evidenceId: record.id,
        incidentId: record.incident_id,
        userId: record.user_id,
        userName: record.user_name || user.name,
        type: record.type,
        title: record.title,
        fileName: record.file_name,
        fileSize: record.file_size,
        mimeType: record.mime_type,
        sha256Hash: record.sha256_hash,
        durationSec: record.duration_sec,
        latitude: record.latitude,
        longitude: record.longitude,
        gpsAccuracy: record.gps_accuracy,
        capturedAt: record.captured_at || record.created_at,
        isLocked: Boolean(record.is_locked),
        createdAt: record.created_at,
        chainOfCustody: audits.map((a: any) => ({
          id: a.id,
          stage: a.action.replace(/_/g, ' '),
          timestamp: a.timestamp,
          verified: true,
          metadata: a.metadata ? JSON.parse(a.metadata) : null,
        })),
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/evidence/:id/lock - Lock Evidence (Tamper-evident freeze)
evidenceRouter.post('/:id/lock', requireAuth, requireEvidenceVaultAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const record = await db.queryOne<any>('SELECT * FROM evidence_records WHERE id = ?', [id]);

    if (!record) {
      res.status(404).json({ success: false, error: 'Evidence record not found.' });
      return;
    }

    if (record.user_id !== user.id && user.role !== 'ADMIN') {
      res.status(403).json({ success: false, error: 'Access denied.' });
      return;
    }

    await db.execute('UPDATE evidence_records SET is_locked = 1 WHERE id = ?', [id]);
    await logAuditEvent(id, user.id, 'EVIDENCE_LOCKED', { isLocked: true });

    res.json({ success: true, isLocked: true, message: 'Evidence integrity locked.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/evidence/:id/unlock - Explicit Unlock Evidence (Requires Vault Auth + Logs Audit)
evidenceRouter.post('/:id/unlock', requireAuth, requireEvidenceVaultAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const record = await db.queryOne<any>('SELECT * FROM evidence_records WHERE id = ?', [id]);

    if (!record) {
      res.status(404).json({ success: false, error: 'Evidence record not found.' });
      return;
    }

    if (record.user_id !== user.id && user.role !== 'ADMIN') {
      res.status(403).json({ success: false, error: 'Access denied.' });
      return;
    }

    await db.execute('UPDATE evidence_records SET is_locked = 0 WHERE id = ?', [id]);
    await logAuditEvent(id, user.id, 'EVIDENCE_UNLOCKED', { isLocked: false });

    res.json({ success: true, isLocked: false, message: 'Evidence unlocked for authorized modification.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/evidence/:id - Delete Evidence (Only if Unlocked)
evidenceRouter.delete('/:id', requireAuth, requireEvidenceVaultAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const record = await db.queryOne<any>('SELECT * FROM evidence_records WHERE id = ?', [id]);

    if (!record) {
      res.status(404).json({ success: false, error: 'Evidence record not found.' });
      return;
    }

    if (record.user_id !== user.id && user.role !== 'ADMIN') {
      res.status(403).json({ success: false, error: 'Access denied.' });
      return;
    }

    if (record.is_locked) {
      res.status(403).json({
        success: false,
        error: 'Cannot delete locked evidence. Evidence is protected by tamper-evident lock. Unlock before deleting.'
      });
      return;
    }

    // Remove file from disk
    if (fs.existsSync(record.file_path)) {
      try {
        fs.unlinkSync(record.file_path);
      } catch (err) {
        console.warn('[Evidence] File unlink error:', err);
      }
    }

    await logAuditEvent(id, user.id, 'EVIDENCE_DELETED', { fileName: record.file_name });
    await db.execute('DELETE FROM evidence_records WHERE id = ?', [id]);

    res.json({ success: true, message: 'Evidence successfully deleted from vault.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
