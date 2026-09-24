import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';

export const evidenceRouter = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.bin';
    const uniqueName = `evidence_${Date.now()}_${uuidv4().substring(0, 8)}${ext}`;
    cb(null, uniqueName);
  },
});

const ALLOWED_MIME_PREFIXES = ['image/', 'audio/', 'video/'];
const DANGEROUS_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.sh', '.php', '.js', '.ts', '.py', '.dll', '.vbs', '.msi', '.html', '.htm', '.svg', '.bin'
]);

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
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

// POST /api/evidence/upload - Upload captured camera photo / audio / video
evidenceRouter.post('/upload', upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No media file provided' });
      return;
    }

    const {
      incidentId = 'active_session',
      userId = 'usr_ananya_01',
      type = 'photo',
      title = 'Camera Evidence Capture',
      durationSec = null,
    } = req.body;

    const filePath = req.file.path;
    const sha256Hash = await calculateSHA256(filePath);
    const id = `evi_${uuidv4()}`;
    const now = new Date().toISOString();

    await db.execute(`
      INSERT INTO evidence_records (
        id, incident_id, user_id, type, title, file_name, file_path, file_size, mime_type, sha256_hash, duration_sec, is_locked, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `, [
      id,
      incidentId,
      userId,
      type,
      title,
      req.file.filename,
      filePath,
      req.file.size,
      req.file.mimetype,
      sha256Hash,
      durationSec ? parseInt(durationSec, 10) : null,
      now
    ]);

    res.status(201).json({
      success: true,
      message: 'Evidence securely stored with SHA-256 integrity hash recorded',
      evidence: {
        id,
        incidentId,
        type,
        title,
        fileName: req.file.filename,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        sha256Hash,
        downloadUrl: `/uploads/${req.file.filename}`,
        isLocked: true,
        createdAt: now,
      },
    });
  } catch (error: any) {
    console.error('[Evidence] Error uploading evidence:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/evidence - List all evidence records
evidenceRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { incidentId, userId } = req.query;
    let query = 'SELECT * FROM evidence_records';
    const params: any[] = [];

    if (incidentId && userId) {
      query += ' WHERE incident_id = ? AND user_id = ?';
      params.push(incidentId, userId);
    } else if (incidentId) {
      query += ' WHERE incident_id = ?';
      params.push(incidentId);
    } else if (userId) {
      query += ' WHERE user_id = ?';
      params.push(userId);
    }

    query += ' ORDER BY created_at DESC';

    const records = await db.query(query, params);
    const enriched = records.map((r: any) => ({
      ...r,
      downloadUrl: `/uploads/${r.file_name}`,
    }));

    res.json({ success: true, count: enriched.length, evidence: enriched });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/evidence/:id/lock - Toggle lock status
evidenceRouter.post('/:id/lock', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const item = await db.queryOne<any>('SELECT is_locked FROM evidence_records WHERE id = ?', [id]);
    if (!item) {
      res.status(404).json({ success: false, message: 'Evidence record not found' });
      return;
    }

    const newLock = item.is_locked ? 0 : 1;
    await db.execute('UPDATE evidence_records SET is_locked = ? WHERE id = ?', [newLock, id]);

    res.json({ success: true, isLocked: Boolean(newLock) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/evidence/:id - Delete evidence (if unlocked)
evidenceRouter.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const item = await db.queryOne<any>('SELECT * FROM evidence_records WHERE id = ?', [id]);

    if (!item) {
      res.status(404).json({ success: false, message: 'Evidence record not found' });
      return;
    }

    if (item.is_locked) {
      res.status(403).json({ success: false, message: 'Cannot delete locked evidence. Unlock first.' });
      return;
    }

    // Remove file if exists
    if (fs.existsSync(item.file_path)) {
      try {
        fs.unlinkSync(item.file_path);
      } catch (err) {
        console.warn('[Evidence] File unlink error:', err);
      }
    }

    await db.execute('DELETE FROM evidence_records WHERE id = ?', [id]);
    res.json({ success: true, message: 'Evidence successfully deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
