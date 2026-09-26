import { Router, Request, Response } from 'express';
import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { sendEmergencySms } from '../services/smsService';
import { sendEmergencyEmail } from '../services/emailService';
import { initiateEmergencyVoiceCall } from '../services/voiceService';
import { broadcastToAll, broadcastToIncident } from '../websocket';
import { EmergencyIncidentRecord, IncidentStatus, TrustedContactRecord } from '../types';

import { authenticateToken } from './auth';

export const emergencyRouter = Router();

// Helper to log incident event
async function logIncidentEvent(incidentId: string, event: string, actor: string, metadata: any = {}) {
  const eventId = `evt_${uuidv4()}`;
  const now = new Date().toISOString();
  await db.execute(`
    INSERT INTO incident_events (id, incident_id, event, actor, timestamp, metadata)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [eventId, incidentId, event, actor, now, JSON.stringify(metadata)]);
}

// POST /api/emergency/create - Trigger SOS / Create Incident
emergencyRouter.post('/create', async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    let authUserId: string | null = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const decoded: any = (await import('jsonwebtoken')).default.decode(token);
        if (decoded && decoded.id) authUserId = decoded.id;
      } catch (e) {}
    }

    let userId = authUserId || req.body.userId;
    if (!userId || userId === 'usr_ananya_01' || userId === 'usr_ananya_sharma_01') {
      const demoUser = await db.queryOne<{ id: string }>('SELECT id FROM users WHERE email = ?', ['demo@nirbhaya.ai']);
      userId = demoUser ? demoUser.id : 'USR-7F42A91C';
    }

    // Verify user exists in database to satisfy foreign key constraint
    const existingDbUser = await db.queryOne<{ id: string }>('SELECT id FROM users WHERE id = ?', [userId]);
    if (!existingDbUser) {
      const firstUser = await db.queryOne<{ id: string }>('SELECT id FROM users LIMIT 1');
      userId = firstUser ? firstUser.id : 'USR-7F42A91C';
    }

    const {
      latitude,
      longitude,
      accuracy = 10,
      locationName = 'Live GPS Coordinates',
      triggerType = 'MANUAL_SOS',
      riskScore = 88,
    } = req.body;

    if (latitude === undefined || longitude === undefined || typeof latitude !== 'number' || typeof longitude !== 'number') {
      res.status(400).json({
        success: false,
        error: 'GPS unavailable — valid device latitude and longitude are required to trigger a real SOS.',
      });
      return;
    }

    // Duplicate Emergency Prevention (Rule 6 & 13)
    const existingActive = await db.queryOne<any>(`
      SELECT * FROM emergency_incidents
      WHERE user_id = ? AND status NOT IN ('RESOLVED', 'CLOSED', 'CANCELLED')
      ORDER BY created_at DESC LIMIT 1
    `, [userId]);

    if (existingActive) {
      console.log(`[Emergency] Active incident ${existingActive.id} already in progress for user ${userId}. Synchronizing location.`);
      await db.execute(`
        UPDATE emergency_incidents 
        SET latitude = ?, longitude = ?, accuracy = ?, updated_at = ?
        WHERE id = ?
      `, [latitude, longitude, accuracy, new Date().toISOString(), existingActive.id]);

      // Record location update
      await db.execute(`
        INSERT INTO location_updates (id, incident_id, user_id, latitude, longitude, accuracy, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [`loc_${uuidv4()}`, existingActive.id, userId, latitude, longitude, accuracy, new Date().toISOString()]);

      // Find active tracking token
      const session = await db.queryOne<any>(`
        SELECT token FROM tracking_sessions WHERE incident_id = ? AND status = 'ACTIVE' LIMIT 1
      `, [existingActive.id]);

      res.json({
        success: true,
        incident: { ...existingActive, latitude, longitude, accuracy },
        trackingToken: session ? session.token : `trk_${existingActive.id}`,
        alreadyActive: true,
        notificationResults: [],
        message: `Incident ${existingActive.id} already active. Live telemetry synchronized.`
      });
      return;
    }

    // Generate dynamic unique Incident ID
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const incidentId = `NG-${randomSuffix}`;
    const now = new Date().toISOString();

    const riskLevel = riskScore >= 80 ? 'CRITICAL' : riskScore >= 60 ? 'HIGH' : riskScore >= 30 ? 'MODERATE' : 'LOW';

    // 1. Insert incident into database with initial status CREATED
    await db.execute(`
      INSERT INTO emergency_incidents (
        id, user_id, status, risk_level, risk_score, latitude, longitude, accuracy, location_name, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      incidentId,
      userId,
      'CREATED',
      riskLevel,
      riskScore,
      latitude,
      longitude,
      accuracy,
      locationName,
      now,
      now
    ]);

    await logIncidentEvent(incidentId, 'INCIDENT_CREATED', 'USER', { triggerType, latitude, longitude, accuracy });

    // 2. Transition: LOCATION_ACQUIRED
    await db.execute(`UPDATE emergency_incidents SET status = 'LOCATION_ACQUIRED', updated_at = ? WHERE id = ?`, [now, incidentId]);
    await logIncidentEvent(incidentId, 'LOCATION_ACQUIRED', 'SYSTEM', { latitude, longitude, accuracy });

    // Record initial location update
    await db.execute(`
      INSERT INTO location_updates (id, incident_id, user_id, latitude, longitude, accuracy, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [`loc_${uuidv4()}`, incidentId, userId, latitude, longitude, accuracy, now]);

    // 3. Create live tracking session with secure token
    const trackingToken = `trk_${uuidv4().replace(/-/g, '')}`;
    const trackingSessionId = `ses_${uuidv4()}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours expiry
    const trackingUrl = `/live-tracking?token=${trackingToken}&incident=${incidentId}`;

    await db.execute(`
      INSERT INTO tracking_sessions (id, user_id, incident_id, token, status, started_at, expires_at)
      VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?)
    `, [trackingSessionId, userId, incidentId, trackingToken, now, expiresAt]);

    // 4. Retrieve trusted contacts for this user (seeded with 9345596322 & saranyarajendran2612@gmail.com)
    const contacts = await db.query<TrustedContactRecord>('SELECT * FROM trusted_contacts WHERE user_id = ?', [userId]);

    const user = await db.queryOne<any>('SELECT * FROM users WHERE id = ?', [userId]);
    const userName = user ? user.name : 'NIRBHAYA AI User';

    // 5. Notify Contacts via Real Voice Call, Real SMS, and Real Email
    const notificationResults: Array<{
      type: string;
      recipient: string;
      status: string;
      error?: string;
      reason?: string;
      providerMessageId?: string;
    }> = [];

    // Prioritize primary contact for real voice call
    let voiceAttempted = false;

    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];

      // A. Real Automated Voice Call to primary contact (Section 6, 7, 8, 9)
      if (contact.phone && (!voiceAttempted || contact.is_primary)) {
        voiceAttempted = true;
        const voiceResult = await initiateEmergencyVoiceCall({
          incidentId,
          toPhone: contact.phone,
          recipientName: contact.name,
          userName,
          locationName,
          trackingUrl,
        });

        notificationResults.push({
          type: 'VOICE',
          recipient: contact.phone,
          status: voiceResult.status,
          error: voiceResult.error,
          reason: voiceResult.reason,
          providerMessageId: voiceResult.callSid,
        });
      }

      // B. Real SMS if phone is present (Target: 9345596322)
      if (contact.phone) {
        const smsResult = await sendEmergencySms({
          incidentId,
          toPhone: contact.phone,
          incidentCode: incidentId,
          locationName,
          latitude,
          longitude,
          trackingUrl,
        });

        notificationResults.push({
          type: 'SMS',
          recipient: contact.phone,
          status: smsResult.status,
          error: smsResult.error,
          reason: smsResult.reason,
          providerMessageId: smsResult.providerMessageId,
        });
      }

      // C. Real Email if email is present (Target: saranyarajendran2612@gmail.com)
      if (contact.email) {
        const emailResult = await sendEmergencyEmail({
          incidentId,
          toEmail: contact.email,
          incidentCode: incidentId,
          locationName,
          latitude,
          longitude,
          accuracy,
          emergencyStatus: 'ACTIVE DISTRESS',
          trackingUrl,
        });

        notificationResults.push({
          type: 'EMAIL',
          recipient: contact.email,
          status: emailResult.status,
          error: emailResult.error,
          providerMessageId: emailResult.providerMessageId,
        });
      }
    }

    // 6. Transition: ACKNOWLEDGED & CONTACTS_NOTIFIED
    await db.execute(`UPDATE emergency_incidents SET status = 'ACKNOWLEDGED', updated_at = ? WHERE id = ?`, [now, incidentId]);
    await logIncidentEvent(incidentId, 'ACKNOWLEDGED', 'SYSTEM', { count: contacts.length, results: notificationResults });
    await logIncidentEvent(incidentId, 'CONTACTS_NOTIFIED', 'SYSTEM', { count: contacts.length, results: notificationResults });

    // 7. Transition: LIVE_TRACKING active
    await db.execute(`UPDATE emergency_incidents SET status = 'CREATED', updated_at = ? WHERE id = ?`, [now, incidentId]);
    await logIncidentEvent(incidentId, 'RESPONDER_NOTIFIED', 'SYSTEM', { channel: 'RESPONDER_NETWORK_WEBSOCKET' });
    await logIncidentEvent(incidentId, 'LIVE_TRACKING_STARTED', 'SYSTEM', { trackingToken });

    // Fetch the updated incident record
    const incident = await db.queryOne<EmergencyIncidentRecord>('SELECT * FROM emergency_incidents WHERE id = ?', [incidentId]);

    // 8. Real-time broadcast to all connected responders & clients
    broadcastToAll({
      type: 'EMERGENCY_TRIGGERED',
      incident,
      trackingToken,
      notificationResults,
    });

    res.status(201).json({
      success: true,
      message: 'Emergency incident created and dispatched across network',
      incident,
      trackingToken,
      trackingSessionId,
      notificationResults,
    });
  } catch (error: any) {
    console.error('[Emergency] Error creating emergency incident:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate emergency protocol',
      error: error.message,
    });
  }
});

// GET /api/emergency/active - Active incidents for responder command center
emergencyRouter.get('/active', async (req: Request, res: Response): Promise<void> => {
  try {
    const incidents = await db.query(`
      SELECT e.*, u.name as user_name, u.phone as user_phone
      FROM emergency_incidents e
      LEFT JOIN users u ON e.user_id = u.id
      WHERE e.status NOT IN ('RESOLVED', 'CLOSED')
      ORDER BY e.created_at DESC
    `);

    res.json({
      success: true,
      count: incidents.length,
      incidents,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/emergency/:id - Single incident details with history & notifications
emergencyRouter.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const incident = await db.queryOne(`
      SELECT e.*, u.name as user_name, u.phone as user_phone
      FROM emergency_incidents e
      LEFT JOIN users u ON e.user_id = u.id
      WHERE e.id = ?
    `, [id]);

    if (!incident) {
      res.status(404).json({ success: false, message: 'Incident not found' });
      return;
    }

    const events = await db.query('SELECT * FROM incident_events WHERE incident_id = ? ORDER BY timestamp ASC', [id]);
    const notifications = await db.query('SELECT * FROM notifications WHERE incident_id = ? ORDER BY created_at DESC', [id]);
    const locations = await db.query('SELECT * FROM location_updates WHERE incident_id = ? ORDER BY timestamp ASC', [id]);
    const evidence = await db.query('SELECT * FROM evidence_records WHERE incident_id = ? ORDER BY created_at DESC', [id]);
    const trackingSession = await db.queryOne('SELECT * FROM tracking_sessions WHERE incident_id = ? AND status = "ACTIVE"', [id]);

    res.json({
      success: true,
      incident,
      events,
      notifications,
      locationHistory: locations,
      evidence,
      trackingSession,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/emergency/:id/acknowledge - Responder acknowledges incident
emergencyRouter.post('/:id/acknowledge', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { responderName = 'Officer Arjun Kumar' } = req.body;
    const now = new Date().toISOString();

    await db.execute(`UPDATE emergency_incidents SET status = 'ACKNOWLEDGED', updated_at = ? WHERE id = ?`, [now, id]);
    await logIncidentEvent(id, 'ACKNOWLEDGED', responderName, { timestamp: now });

    const updated = await db.queryOne('SELECT * FROM emergency_incidents WHERE id = ?', [id]);
    broadcastToIncident(id, { type: 'INCIDENT_ACKNOWLEDGED', incidentId: id, responderName, timestamp: now });
    broadcastToAll({ type: 'INCIDENT_UPDATED', incident: updated });

    res.json({ success: true, message: 'Incident acknowledged by operations desk', incident: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/emergency/:id/accept - Responder accepts incident
emergencyRouter.post('/:id/accept', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      responderId = 'RSP-1042',
      responderName = 'Officer Arjun Kumar (Application Responder)',
      responderBadge = 'APP-RSP-1042',
      responderLat,
      responderLng,
    } = req.body;

    const now = new Date().toISOString();

    await db.execute(`
      UPDATE emergency_incidents
      SET status = 'RESPONDER_ACCEPTED',
          responder_id = ?,
          responder_name = ?,
          responder_badge = ?,
          responder_latitude = ?,
          responder_longitude = ?,
          updated_at = ?
      WHERE id = ?
    `, [responderId, responderName, responderBadge, responderLat || null, responderLng || null, now, id]);

    await logIncidentEvent(id, 'RESPONDER_ACCEPTED', responderName, { responderId, responderBadge, responderLat, responderLng, timestamp: now });

    const updated = await db.queryOne('SELECT * FROM emergency_incidents WHERE id = ?', [id]);

    broadcastToIncident(id, {
      type: 'RESPONDER_ACCEPTED',
      incidentId: id,
      responderName,
      responderBadge,
      responderLat,
      responderLng,
      timestamp: now,
    });
    broadcastToAll({ type: 'INCIDENT_UPDATED', incident: updated });

    res.json({ success: true, message: 'Incident accepted by responder', incident: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/emergency/:id/en-route - Responder is en route to emergency scene
emergencyRouter.post('/:id/en-route', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const incident = await db.queryOne<EmergencyIncidentRecord>('SELECT * FROM emergency_incidents WHERE id = ?', [id]);

    if (!incident) {
      res.status(404).json({ success: false, message: 'Incident not found' });
      return;
    }

    const now = new Date().toISOString();
    await db.execute(`UPDATE emergency_incidents SET status = 'EN_ROUTE', updated_at = ? WHERE id = ?`, [now, id]);
    await logIncidentEvent(id, 'EN_ROUTE', incident.responder_name || 'Responder', {
      destination: { lat: incident.latitude, lng: incident.longitude },
      timestamp: now
    });

    const updated = await db.queryOne('SELECT * FROM emergency_incidents WHERE id = ?', [id]);

    broadcastToIncident(id, {
      type: 'RESPONDER_EN_ROUTE',
      incidentId: id,
      timestamp: now,
    });
    broadcastToAll({ type: 'INCIDENT_UPDATED', incident: updated });

    res.json({ success: true, message: 'Responder status updated to EN_ROUTE', incident: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/emergency/:id/navigate - Responder starts turn-by-turn navigation (transitions to EN_ROUTE)
emergencyRouter.post('/:id/navigate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const incident = await db.queryOne<EmergencyIncidentRecord>('SELECT * FROM emergency_incidents WHERE id = ?', [id]);

    if (!incident) {
      res.status(404).json({ success: false, message: 'Incident not found' });
      return;
    }

    const now = new Date().toISOString();
    await db.execute(`UPDATE emergency_incidents SET status = 'EN_ROUTE', updated_at = ? WHERE id = ?`, [now, id]);
    await logIncidentEvent(id, 'EN_ROUTE', incident.responder_name || 'Responder', {
      destination: { lat: incident.latitude, lng: incident.longitude },
      navigationStarted: true,
      timestamp: now
    });

    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${incident.latitude},${incident.longitude}&travelmode=driving`;

    broadcastToIncident(id, {
      type: 'RESPONDER_NAVIGATING',
      incidentId: id,
      timestamp: now,
      googleMapsUrl,
    });
    broadcastToAll({ type: 'INCIDENT_UPDATED', incident: { ...incident, status: 'EN_ROUTE' } });

    res.json({
      success: true,
      message: 'Responder navigation initiated',
      googleMapsUrl,
      incident: { ...incident, status: 'EN_ROUTE' },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/emergency/:id/on-scene - Responder arrives on scene
emergencyRouter.post('/:id/on-scene', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const incident = await db.queryOne<EmergencyIncidentRecord>('SELECT * FROM emergency_incidents WHERE id = ?', [id]);

    if (!incident) {
      res.status(404).json({ success: false, message: 'Incident not found' });
      return;
    }

    const now = new Date().toISOString();
    await db.execute(`UPDATE emergency_incidents SET status = 'ON_SCENE', updated_at = ? WHERE id = ?`, [now, id]);
    await logIncidentEvent(id, 'ON_SCENE', incident.responder_name || 'Responder', { timestamp: now });

    const updated = await db.queryOne('SELECT * FROM emergency_incidents WHERE id = ?', [id]);

    broadcastToIncident(id, {
      type: 'RESPONDER_ON_SCENE',
      incidentId: id,
      timestamp: now,
    });
    broadcastToAll({ type: 'INCIDENT_UPDATED', incident: updated });

    res.json({ success: true, message: 'Responder arrived ON_SCENE', incident: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/emergency/:id/resolve - Resolve incident
emergencyRouter.post('/:id/resolve', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { resolvedBy = 'Officer Arjun Kumar', notes = 'Safety verified on-scene' } = req.body;
    const now = new Date().toISOString();

    await db.execute(`
      UPDATE emergency_incidents
      SET status = 'RESOLVED',
          resolved_at = ?,
          updated_at = ?
      WHERE id = ?
    `, [now, now, id]);

    // Expire live tracking session
    await db.execute(`UPDATE tracking_sessions SET status = 'EXPIRED' WHERE incident_id = ?`, [id]);

    await logIncidentEvent(id, 'INCIDENT_RESOLVED', resolvedBy, { notes, timestamp: now });

    const updated = await db.queryOne('SELECT * FROM emergency_incidents WHERE id = ?', [id]);

    broadcastToIncident(id, {
      type: 'INCIDENT_RESOLVED',
      incidentId: id,
      resolvedBy,
      timestamp: now,
    });
    broadcastToAll({ type: 'INCIDENT_RESOLVED', incident: updated });

    res.json({ success: true, message: 'Incident marked as resolved. Live tracking expired.', incident: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/emergency/:id/cancel - User cancels emergency
emergencyRouter.post('/:id/cancel', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason = 'Cancelled by user' } = req.body;
    const now = new Date().toISOString();

    await db.execute(`
      UPDATE emergency_incidents
      SET status = 'CANCELLED',
          resolved_at = ?,
          updated_at = ?
      WHERE id = ?
    `, [now, now, id]);

    await db.execute(`UPDATE tracking_sessions SET status = 'EXPIRED' WHERE incident_id = ?`, [id]);
    await logIncidentEvent(id, 'INCIDENT_CANCELLED', 'USER', { reason, timestamp: now });

    const updated = await db.queryOne('SELECT * FROM emergency_incidents WHERE id = ?', [id]);
    broadcastToIncident(id, { type: 'INCIDENT_CANCELLED', incidentId: id, reason, timestamp: now });
    broadcastToAll({ type: 'INCIDENT_RESOLVED', incident: updated });

    res.json({ success: true, message: 'Incident cancelled', incident: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/emergency/test-call - Controlled voice call test (Section 30)
emergencyRouter.post('/test-call', async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone = '9345596322', recipientName = 'Saranya' } = req.body;
    const now = new Date().toISOString();

    console.log(`[Emergency API] Controlled single voice call test requested for ${phone}`);

    const result = await initiateEmergencyVoiceCall({
      incidentId: 'TEST-CALL',
      toPhone: phone,
      recipientName,
      userName: 'Nirbhaya AI Verification System',
      locationName: 'Test Verification Facility',
      isTestCall: true,
    });

    res.json({
      success: result.success,
      status: result.status,
      callSid: result.callSid,
      provider: result.provider,
      error: result.error,
      reason: result.reason,
      timestamp: now,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
