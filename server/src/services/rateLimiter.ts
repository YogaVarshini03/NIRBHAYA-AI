import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';

interface AttemptRecord {
  count: number;
  lockedUntil: number | null;
  firstAttempt: number;
}

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;   // 15 minute rolling window

const attemptStore = new Map<string, AttemptRecord>();

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

export const rateLimiter = {
  check(key: string): { isLocked: boolean; remainingSec: number } {
    const record = attemptStore.get(key);
    if (!record) return { isLocked: false, remainingSec: 0 };

    const now = Date.now();
    if (record.lockedUntil && record.lockedUntil > now) {
      const remainingSec = Math.ceil((record.lockedUntil - now) / 1000);
      return { isLocked: true, remainingSec };
    }

    // Reset expired window
    if (record.lockedUntil && record.lockedUntil <= now) {
      attemptStore.delete(key);
    } else if (now - record.firstAttempt > ATTEMPT_WINDOW_MS) {
      attemptStore.delete(key);
    }

    return { isLocked: false, remainingSec: 0 };
  },

  async recordFailedAttempt(
    key: string,
    action: string,
    userId: string | null,
    ip: string,
    details: Record<string, any> = {}
  ): Promise<{ isLocked: boolean; attemptsLeft: number; remainingSec: number }> {
    const now = Date.now();
    let record = attemptStore.get(key);

    if (!record || (record.lockedUntil && record.lockedUntil <= now) || (now - record.firstAttempt > ATTEMPT_WINDOW_MS)) {
      record = { count: 1, lockedUntil: null, firstAttempt: now };
    } else {
      record.count += 1;
    }

    let isLocked = false;
    let remainingSec = 0;

    if (record.count >= MAX_ATTEMPTS) {
      record.lockedUntil = now + LOCKOUT_DURATION_MS;
      isLocked = true;
      remainingSec = Math.ceil(LOCKOUT_DURATION_MS / 1000);
      console.warn(`[Security RateLimiter] Lockout triggered for key: ${key} (${action}) - Locked for 15 minutes.`);
    }

    attemptStore.set(key, record);

    // Persist to audit_logs table
    try {
      await db.execute(`
        INSERT INTO audit_logs (id, user_id, action, ip_address, timestamp, details)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        `aud_${uuidv4()}`,
        userId || 'ANONYMOUS',
        action,
        ip,
        new Date().toISOString(),
        JSON.stringify({ ...details, failedAttempts: record.count, isLocked, remainingSec })
      ]);
    } catch (err: any) {
      console.warn('[Security RateLimiter] Could not write audit log:', err.message);
    }

    return {
      isLocked,
      attemptsLeft: Math.max(0, MAX_ATTEMPTS - record.count),
      remainingSec
    };
  },

  reset(key: string): void {
    attemptStore.delete(key);
  },

  createMiddleware(actionType: 'LOGIN' | 'VERIFY_PIN' | 'CANCEL_SOS') {
    return (req: Request, res: Response, next: NextFunction) => {
      const ip = getClientIp(req);
      const user = (req as any).user;
      const targetUser = user?.id || req.body?.email || req.params?.id || 'GLOBAL';

      const ipKey = `${actionType}:ip:${ip}`;
      const userKey = `${actionType}:user:${targetUser}`;

      const ipStatus = rateLimiter.check(ipKey);
      if (ipStatus.isLocked) {
        return res.status(429).json({
          success: false,
          error: `Too many failed attempts from this IP. Please wait ${Math.ceil(ipStatus.remainingSec / 60)} minutes before trying again.`,
          retryAfter: ipStatus.remainingSec
        });
      }

      const userStatus = rateLimiter.check(userKey);
      if (userStatus.isLocked) {
        return res.status(429).json({
          success: false,
          error: `Account locked due to multiple failed security attempts. Please wait ${Math.ceil(userStatus.remainingSec / 60)} minutes before trying again.`,
          retryAfter: userStatus.remainingSec
        });
      }

      (req as any).securityKeys = { ipKey, userKey, ip, targetUser };
      next();
    };
  }
};
