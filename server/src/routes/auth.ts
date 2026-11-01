import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { rateLimiter } from '../services/rateLimiter';

export const authRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'nirbhaya_super_secure_jwt_secret_2026';

// Middleware to authenticate JWT token
export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Authentication required. Authorization header missing.' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(401).json({ success: false, error: 'Invalid or expired session token.' });
    }
    (req as any).user = user;
    next();
  });
}

// Strict authentication enforcement middleware (Rule 14 & 18)
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Authentication required. Authorization header missing.' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ success: false, error: 'Invalid or expired token.' });
    }
    (req as any).user = user;
    next();
  });
}

// Strict role-based authorization check (Rule 14)
export function requireRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user || !allowedRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Requires role: ${allowedRoles.join(' or ')}. Current role: ${user?.role || 'NONE'}`,
      });
    }
    next();
  };
}

// POST /api/auth/login with 5-attempt / 15-minute rate limiting
authRouter.post('/login', rateLimiter.createMiddleware('LOGIN'), async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const { ipKey, userKey, ip } = (req as any).securityKeys || {};

  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required.' });
  }

  try {
    const cleanEmail = email.trim().toLowerCase();
    const user = await db.queryOne('SELECT * FROM users WHERE email = ?', [cleanEmail]) as any;

    if (!user) {
      const record = await rateLimiter.recordFailedAttempt(ipKey, 'LOGIN_FAILED_UNKNOWN_USER', null, ip, { email: cleanEmail });
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.',
        attemptsLeft: record.attemptsLeft,
      });
    }

    const isValid = Boolean(user.password_hash && typeof user.password_hash === 'string' && bcrypt.compareSync(password, user.password_hash));
    if (!isValid) {
      const record = await rateLimiter.recordFailedAttempt(userKey, 'LOGIN_FAILED_WRONG_PASSWORD', user.id, ip, { email: cleanEmail });
      await rateLimiter.recordFailedAttempt(ipKey, 'LOGIN_FAILED_WRONG_PASSWORD', user.id, ip, { email: cleanEmail });
      return res.status(401).json({
        success: false,
        error: record.isLocked
          ? 'Too many failed login attempts. Account locked for 15 minutes.'
          : `Invalid email or password. ${record.attemptsLeft} attempts remaining.`,
        attemptsLeft: record.attemptsLeft,
        isLocked: record.isLocked,
      });
    }

    // Reset rate limiter on successful authentication
    if (ipKey) rateLimiter.reset(ipKey);
    if (userKey) rateLimiter.reset(userKey);

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Record login in login_history table (Section 3)
    try {
      const loginId = `log_${uuidv4()}`;
      const sessionId = `ses_${uuidv4().substring(0, 8).toUpperCase()}`;
      const userAgent = req.headers['user-agent'] || 'Modern Web Browser';
      await db.execute(`
        INSERT INTO login_history (id, user_id, user_name, login_time, ip_address, device_info, login_status, session_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [loginId, user.id, user.name, new Date().toISOString(), String(ip), String(userAgent), 'SUCCESS', sessionId]);
    } catch (logErr) {
      console.warn('[Auth API] Could not record login history:', logErr);
    }

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        hasPin: Boolean(user.pin_hash),
        createdAt: user.created_at,
      }
    });
  } catch (err: any) {
    console.error('[Auth API] Login error:', err);
    return res.status(500).json({ success: false, error: 'Server authentication error.' });
  }
});

// POST /api/auth/register
authRouter.post('/register', async (req: Request, res: Response) => {
  const { name, email, password, phone, pin, role = 'USER', emergencyContact } = req.body;

  if (!name || !email || !password || !phone) {
    return res.status(400).json({ success: false, error: 'Please provide all required fields.' });
  }

  // E.164 Phone validation: reject numbers without country code
  const cleanPhone = phone.trim().replace(/[\s\-\(\)]/g, '');
  if (!/^\+[1-9]\d{6,14}$/.test(cleanPhone)) {
    return res.status(400).json({
      success: false,
      error: 'Phone number must include country code in E.164 format (e.g. +91XXXXXXXXXX).'
    });
  }

  // Safety PIN validation (4-6 digits)
  if (!pin || !/^\d{4,6}$/.test(String(pin).trim())) {
    return res.status(400).json({
      success: false,
      error: 'Please enter a 4-digit security PIN.'
    });
  }

  let cleanEmergency: string | null = null;
  if (emergencyContact && emergencyContact.trim()) {
    cleanEmergency = emergencyContact.trim().replace(/[\s\-\(\)]/g, '');
    if (!/^\+[1-9]\d{6,14}$/.test(cleanEmergency)) {
      return res.status(400).json({
        success: false,
        error: 'Primary emergency contact phone must include country code in E.164 format (e.g. +91XXXXXXXXXX).'
      });
    }
  }

  try {
    const existing = await db.queryOne('SELECT id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (existing) {
      return res.status(409).json({ success: false, error: 'An account with this email already exists.' });
    }

    // Backend-generated permanent unique User ID (Section 1: e.g. USR-7F42A91C)
    const userId = `USR-${uuidv4().substring(0, 8).toUpperCase()}`;
    const passwordHash = bcrypt.hashSync(password, 10);
    const pinHash = bcrypt.hashSync(String(pin).trim(), 10);
    const now = new Date().toISOString();
    const assignedRole = ['USER', 'RESPONDER', 'ADMIN'].includes(role) ? role : 'USER';

    await db.execute(`
      INSERT INTO users (id, name, email, password_hash, phone, pin_hash, role, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [userId, name.trim(), email.trim().toLowerCase(), passwordHash, cleanPhone, pinHash, assignedRole, now]);

    // If emergency contact provided, insert as primary contact
    if (cleanEmergency) {
      await db.execute(`
        INSERT INTO trusted_contacts (id, user_id, name, phone, email, relationship, is_primary, notification_preference, verification_status, priority_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', 1, ?, ?)
      `, [
        `cnt_${uuidv4()}`,
        userId,
        'Primary Contact',
        cleanEmergency,
        'guardian@nirbhaya.ai',
        'Guardian',
        1,
        'All Channels',
        now,
        now
      ]);
    }

    // Generate unique NIRBHAYA Access Key (Section 1: e.g. NIR-XXXX-XXXX-XXXX)
    const part1 = uuidv4().substring(0, 4).toUpperCase();
    const part2 = uuidv4().substring(0, 4).toUpperCase();
    const part3 = uuidv4().substring(0, 4).toUpperCase();
    const rawAccessKey = `NIR-${part1}-${part2}-${part3}`;
    const accessKeyHash = bcrypt.hashSync(rawAccessKey, 10);
    const keyPrefix = `NIR-${part1}`;

    await db.execute(`
      INSERT INTO access_keys (id, user_id, key_prefix, key_hash, status, created_at)
      VALUES (?, ?, ?, ?, 'ACTIVE', ?)
    `, [`ak_${userId}`, userId, keyPrefix, accessKeyHash, now]);

    // Record initial registration in login history
    const loginId = `log_${uuidv4()}`;
    const sessionId = `ses_${uuidv4().substring(0, 8).toUpperCase()}`;
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    await db.execute(`
      INSERT INTO login_history (id, user_id, user_name, login_time, ip_address, device_info, login_status, session_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [loginId, userId, name.trim(), now, String(ip), req.headers['user-agent'] || 'Browser', 'SUCCESS', sessionId]);

    const token = jwt.sign(
      { id: userId, email: email.trim().toLowerCase(), name: name.trim(), role: assignedRole },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      success: true,
      token,
      accessKey: rawAccessKey, // Shown ONCE to user with secure copy/download
      user: {
        id: userId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: cleanPhone,
        role: assignedRole,
        hasPin: true,
        createdAt: now,
      }
    });
  } catch (err: any) {
    console.error('[Auth API] Register error:', err);
    return res.status(500).json({ success: false, error: 'Failed to create safety account.' });
  }
});

// POST /api/auth/set-pin - Set safety PIN for existing accounts without one
authRouter.post('/set-pin', authenticateToken, async (req: Request, res: Response) => {
  const authUser = (req as any).user;
  const { pin } = req.body;

  if (!pin || !/^\d{4,6}$/.test(String(pin).trim())) {
    return res.status(400).json({ success: false, error: 'Please enter a valid 4-digit numeric PIN.' });
  }

  try {
    const pinHash = bcrypt.hashSync(String(pin).trim(), 10);
    await db.execute('UPDATE users SET pin_hash = ? WHERE id = ?', [pinHash, authUser.id]);
    return res.json({ success: true, message: 'Safety PIN successfully created.' });
  } catch (err: any) {
    console.error('[Auth API] Set PIN error:', err);
    return res.status(500).json({ success: false, error: 'Server error saving PIN.' });
  }
});

// POST /api/auth/verify-pin - Verify user's personal security PIN with rate limiting & duress support
authRouter.post('/verify-pin', authenticateToken, rateLimiter.createMiddleware('VERIFY_PIN'), async (req: Request, res: Response) => {
  const authUser = (req as any).user;
  const { pin } = req.body;
  const { ipKey, userKey, ip } = (req as any).securityKeys || {};

  if (!pin || typeof pin !== 'string') {
    return res.status(400).json({ success: false, error: 'PIN is required.' });
  }

  try {
    const user = await db.queryOne<any>('SELECT pin_hash, duress_pin_hash FROM users WHERE id = ?', [authUser.id]);
    if (!user || !user.pin_hash) {
      return res.status(400).json({ success: false, error: 'Security PIN not set for user account.' });
    }

    // 1. Check for Duress PIN (Stealth distress signal)
    const isDuress = Boolean(user.duress_pin_hash && bcrypt.compareSync(pin.trim(), user.duress_pin_hash));
    if (isDuress) {
      console.warn(`[Security Alert] User ${authUser.id} entered DURESS PIN. Initiating silent covert alert protocol.`);
      if (ipKey) rateLimiter.reset(ipKey);
      if (userKey) rateLimiter.reset(userKey);
      return res.json({ success: true, duress: true, message: 'PIN verified successfully.' });
    }

    // 2. Check Standard Safety PIN
    const isValid = bcrypt.compareSync(pin.trim(), user.pin_hash);
    if (!isValid) {
      const record = await rateLimiter.recordFailedAttempt(userKey, 'PIN_VERIFY_FAILED', authUser.id, ip);
      await rateLimiter.recordFailedAttempt(ipKey, 'PIN_VERIFY_FAILED', authUser.id, ip);
      return res.status(401).json({
        success: false,
        error: record.isLocked
          ? 'Too many failed PIN attempts. PIN verification locked for 15 minutes.'
          : `Incorrect PIN. ${record.attemptsLeft} attempts remaining.`,
        attemptsLeft: record.attemptsLeft,
        isLocked: record.isLocked,
      });
    }

    if (ipKey) rateLimiter.reset(ipKey);
    if (userKey) rateLimiter.reset(userKey);

    return res.json({ success: true, message: 'PIN verified successfully.' });
  } catch (err: any) {
    console.error('[Auth API] Verify PIN error:', err);
    return res.status(500).json({ success: false, error: 'Server error verifying PIN.' });
  }
});

// GET /api/auth/me
authRouter.get('/me', authenticateToken, async (req: Request, res: Response) => {
  const authUser = (req as any).user;
  const user = await db.queryOne('SELECT id, name, email, phone, role, pin_hash, created_at FROM users WHERE id = ?', [authUser.id]) as any;

  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found.' });
  }

  return res.json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      hasPin: Boolean(user.pin_hash),
      createdAt: user.created_at,
    }
  });
});

// GET /api/auth/login-history (Section 3: Login history records)
authRouter.get('/login-history', authenticateToken, async (req: Request, res: Response) => {
  const authUser = (req as any).user;
  try {
    const history = await db.query(`
      SELECT id, user_id, user_name, login_time, logout_time, ip_address, device_info, login_status, session_id
      FROM login_history
      WHERE user_id = ?
      ORDER BY login_time DESC
      LIMIT 25
    `, [authUser.id]);

    return res.json({
      success: true,
      userId: authUser.id,
      count: history.length,
      history,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/auth/profile (Section 26: User Profile editing)
authRouter.put('/profile', authenticateToken, async (req: Request, res: Response) => {
  const authUser = (req as any).user;
  const { name, phone } = req.body;

  if (!name && !phone) {
    return res.status(400).json({ success: false, error: 'Name or phone is required to update.' });
  }

  try {
    const updates: string[] = [];
    const params: any[] = [];

    if (name) {
      updates.push('name = ?');
      params.push(name.trim());
    }
    if (phone) {
      const cleanPhone = phone.trim().replace(/[\s\-\(\)]/g, '');
      if (!/^\+[1-9]\d{6,14}$/.test(cleanPhone)) {
        return res.status(400).json({
          success: false,
          error: 'Phone number must include country code in E.164 format (e.g. +91XXXXXXXXXX).'
        });
      }
      updates.push('phone = ?');
      params.push(cleanPhone);
    }

    params.push(authUser.id);

    await db.execute(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

    const updated = await db.queryOne('SELECT id, name, email, phone, role, created_at FROM users WHERE id = ?', [authUser.id]) as any;

    return res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        role: updated.role,
        createdAt: updated.created_at,
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/auth/access-key (Section 1: Access Key status & masked view)
authRouter.get('/access-key', requireAuth, async (req: Request, res: Response) => {
  const authUser = (req as any).user;
  try {
    const key = await db.queryOne(
      'SELECT id, key_prefix, status, created_at, last_used_at FROM access_keys WHERE user_id = ? AND status = ? ORDER BY created_at DESC LIMIT 1',
      [authUser.id, 'ACTIVE']
    ) as any;

    if (!key) {
      return res.json({ success: true, hasKey: false });
    }

    return res.json({
      success: true,
      hasKey: true,
      key: {
        id: key.id,
        prefix: key.key_prefix,
        maskedKey: `${key.key_prefix}-****-****`,
        status: key.status,
        createdAt: key.created_at,
        lastUsedAt: key.last_used_at,
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});



// POST /api/auth/access-key/revoke (Section 1: Revoke Access Key)
authRouter.post('/access-key/revoke', requireAuth, async (req: Request, res: Response) => {
  const authUser = (req as any).user;
  try {
    await db.execute("UPDATE access_keys SET status = 'REVOKED' WHERE user_id = ?", [authUser.id]);
    return res.json({ success: true, message: 'NIRBHAYA Access Key revoked successfully.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
