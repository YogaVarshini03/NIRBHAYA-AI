import { Router, Request, Response } from 'express';
import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { broadcastToIncident } from '../websocket';

export const trackingRouter = Router();

// POST /api/tracking/start - Initialize a live tracking session
trackingRouter.post('/start', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId = 'usr_ananya_01', incidentId = null } = req.body;
    const sessionId = `ses_${uuidv4()}`;
    const token = `trk_${uuidv4().replace(/-/g, '')}`;
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(); // 12 hrs

    await db.execute(`
      INSERT INTO tracking_sessions (id, user_id, incident_id, token, status, started_at, expires_at)
      VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?)
    `, [sessionId, userId, incidentId || 'standalone_session', token, now, expiresAt]);

    res.json({
      success: true,
      sessionId,
      token,
      trackingUrl: `/tracking/${token}`,
      startedAt: now,
      expiresAt,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/tracking/update - Continuous GPS breadcrumb point from navigator.geolocation.watchPosition()
trackingRouter.post('/update', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      token,
      incidentId,
      userId = 'usr_ananya_01',
      latitude,
      longitude,
      accuracy = 5,
      speed = null,
      heading = null,
      altitude = null,
    } = req.body;

    if (!latitude || !longitude) {
      res.status(400).json({ success: false, message: 'Latitude and longitude are required' });
      return;
    }

    const now = new Date().toISOString();
    const updateId = `loc_${uuidv4()}`;

    // Verify token if provided
    if (token) {
      const session = await db.queryOne<any>('SELECT * FROM tracking_sessions WHERE token = ?', [token]);
      if (session && session.status === 'EXPIRED') {
        res.status(403).json({ success: false, message: 'Tracking session has expired' });
        return;
      }
    }

    // Persist GPS update in database
    await db.execute(`
      INSERT INTO location_updates (id, incident_id, user_id, latitude, longitude, accuracy, speed, heading, altitude, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [updateId, incidentId || null, userId, latitude, longitude, accuracy, speed, heading, altitude, now]);

    // If an incident is associated, update its live position
    if (incidentId) {
      await db.execute(`
        UPDATE emergency_incidents
        SET latitude = ?, longitude = ?, accuracy = ?, updated_at = ?
        WHERE id = ?
      `, [latitude, longitude, accuracy, now, incidentId]);

      // Broadcast to real-time viewers
      broadcastToIncident(incidentId, {
        type: 'USER_LOCATION',
        incidentId,
        latitude,
        longitude,
        accuracy,
        speed,
        heading,
        altitude,
        timestamp: now,
      });
    }

    res.json({
      success: true,
      locationId: updateId,
      timestamp: now,
      status: 'Live GPS recorded',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/tracking/stop - Terminate tracking session
trackingRouter.post('/stop', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, incidentId } = req.body;
    if (token) {
      await db.execute(`UPDATE tracking_sessions SET status = 'EXPIRED' WHERE token = ?`, [token]);
    }
    if (incidentId) {
      await db.execute(`UPDATE tracking_sessions SET status = 'EXPIRED' WHERE incident_id = ?`, [incidentId]);
    }
    res.json({ success: true, message: 'Tracking session deactivated' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/tracking/:token - Public/Authorized view using secure token
trackingRouter.get('/:token', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    const session = await db.queryOne<any>('SELECT * FROM tracking_sessions WHERE token = ?', [token]);

    if (!session) {
      res.status(404).json({ success: false, message: 'Invalid or non-existent tracking token' });
      return;
    }

    if (session.status === 'EXPIRED' || new Date(session.expires_at) < new Date()) {
      res.status(410).json({
        success: false,
        status: 'EXPIRED',
        message: 'This live tracking session has concluded and expired for privacy and safety.',
      });
      return;
    }

    // Get incident if exists and verify not resolved
    let incident: any = null;
    if (session.incident_id && session.incident_id !== 'standalone_session') {
      incident = await db.queryOne('SELECT * FROM emergency_incidents WHERE id = ?', [session.incident_id]);
      if (incident && (incident.status === 'RESOLVED' || incident.status === 'CLOSED')) {
        await db.execute("UPDATE tracking_sessions SET status = 'EXPIRED' WHERE id = ?", [session.id]);
        res.status(410).json({
          success: false,
          status: 'EXPIRED',
          message: 'This emergency incident has concluded. Live GPS tracking telemetry access is permanently terminated.',
        });
        return;
      }
    }

    // Get latest location and trail
    const trail = await db.query(`
      SELECT latitude, longitude, accuracy, speed, heading, timestamp
      FROM location_updates
      WHERE incident_id = ? OR user_id = ?
      ORDER BY timestamp DESC
      LIMIT 100
    `, [session.incident_id, session.user_id]);

    const latestLocation = trail[0] || null;

    res.json({
      success: true,
      status: 'ACTIVE',
      session,
      incident,
      latestLocation,
      trail: trail.reverse(),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
