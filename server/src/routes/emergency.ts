import { Router, Request, Response } from 'express';
import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { sendEmergencySms } from '../services/smsService';
import { sendEmergencyEmail } from '../services/emailService';
import { broadcastToAll, broadcastToIncident } from '../websocket';
import { EmergencyIncidentRecord, IncidentStatus, TrustedContactRecord } from '../types';

import { authenticateToken } from './auth';

export const emergencyRouter = Router();

// Helper to log incident event
function logIncidentEvent(incidentId: string, event: string, actor: string, metadata: any = {}) {
  const eventId = `evt_${uuidv4()}`;
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO incident_events (id, incident_id, event, actor, timestamp, metadata)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(eventId, incidentId, event, actor, now, JSON.stringify(metadata));
}

// POST /api/emergency/create - Trigger SOS / Create Incident

emergencyRouter.post('/create', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      userId = 'usr_ananya_01',
      latitude = 13.0827,
      longitude = 80.2707,
      accuracy = 8,
      locationName = 'Live GPS Coordinates',
      triggerType = 'MANUAL_SOS',
      riskScore = 88,
    } = req.body;

    // Generate dynamic unique Incident ID (e.g. NG-2048 format, but dynamic) - Rule 7
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const incidentId = `NG-${randomSuffix}`;
    const now = new Date().toISOString();

    const riskLevel = riskScore >= 80 ? 'CRITICAL' : riskScore >= 60 ? 'HIGH' : riskScore >= 30 ? 'MODERATE' : 'LOW';

    // 1. Insert incident into database with initial status CREATED
    db.prepare(`
      INSERT INTO emergency_incidents (
        id, user_id, status, risk_level, risk_score, latitude, longitude, accuracy, location_name, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
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
    );

    logIncidentEvent(incidentId, 'INCIDENT_CREATED', 'USER', { triggerType, latitude, longitude, accuracy });

    // 2. Transition: LOCATION_ACQUIRED
    db.prepare(`UPDATE emergency_incidents SET status = 'LOCATION_ACQUIRED', updated_at = ? WHERE id = ?`).run(now, incidentId);
    logIncidentEvent(incidentId, 'LOCATION_ACQUIRED', 'SYSTEM', { latitude, longitude, accuracy });

    // Record initial location update
    db.prepare(`
      INSERT INTO location_updates (id, incident_id, user_id, latitude, longitude, accuracy, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(`loc_${uuidv4()}`, incidentId, userId, latitude, longitude, accuracy, now);

    // 3. Create live tracking session with secure token (Rule 5 & 23)
    const trackingToken = `trk_${uuidv4().replace(/-/g, '')}`;
    const trackingSessionId = `ses_${uuidv4()}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours expiry
    const trackingUrl = `/live-tracking?token=${trackingToken}&incident=${incidentId}`;

    db.prepare(`
      INSERT INTO tracking_sessions (id, user_id, incident_id, token, status, started_at, expires_at)
      VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?)
    `).run(trackingSessionId, userId, incidentId, trackingToken, now, expiresAt);

    // 4. Retrieve trusted contacts for this user (seeded with 9345596322 & saranyarajendran2612@gmail.com)
    const contacts = db.prepare('SELECT * FROM trusted_contacts WHERE user_id = ?').all(userId) as TrustedContactRecord[];

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    const userName = user ? user.name : 'NIRBHAYA AI User';

    // 5. Notify Contacts via Real SMS and Real Email
    const notificationResults: Array<{ type: string; recipient: string; status: string; error?: string }> = [];

    for (const contact of contacts) {
      // Send real SMS if phone is present (Target: 9345596322)
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
          status: smsResult.success ? 'SENT' : 'FAILED',
          error: smsResult.error,
        });
      }

      // Send real Email if email is present (Target: saranyarajendran2612@gmail.com)
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
          status: emailResult.success ? 'SENT' : 'FAILED',
          error: emailResult.error,
        });
      }
    }

    // 6. Transition: CONTACTS_NOTIFIED
    db.prepare(`UPDATE emergency_incidents SET status = 'CONTACTS_NOTIFIED', updated_at = ? WHERE id = ?`).run(now, incidentId);
    logIncidentEvent(incidentId, 'CONTACTS_NOTIFIED', 'SYSTEM', { count: contacts.length, results: notificationResults });

    // 7. Transition: RESPONDER_NOTIFIED & LIVE_TRACKING
    db.prepare(`UPDATE emergency_incidents SET status = 'LIVE_TRACKING', updated_at = ? WHERE id = ?`).run(now, incidentId);
    logIncidentEvent(incidentId, 'RESPONDER_NOTIFIED', 'SYSTEM', { channel: 'RESPONDER_NETWORK_WEBSOCKET' });
    logIncidentEvent(incidentId, 'LIVE_TRACKING_STARTED', 'SYSTEM', { trackingToken });

    // Fetch the updated incident record
    const incident = db.prepare('SELECT * FROM emergency_incidents WHERE id = ?').get(incidentId) as EmergencyIncidentRecord;

    // 8. Real-time broadcast to all connected responders & clients (Rule 5 & 13)
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
emergencyRouter.get('/active', (req: Request, res: Response): void => {
  try {
    const incidents = db.prepare(`
      SELECT e.*, u.name as user_name, u.phone as user_phone
      FROM emergency_incidents e
      LEFT JOIN users u ON e.user_id = u.id
      WHERE e.status NOT IN ('RESOLVED', 'CLOSED')
      ORDER BY e.created_at DESC
    `).all();

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
emergencyRouter.get('/:id', (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const incident = db.prepare(`
      SELECT e.*, u.name as user_name, u.phone as user_phone
      FROM emergency_incidents e
      LEFT JOIN users u ON e.user_id = u.id
      WHERE e.id = ?
    `).get(id);

    if (!incident) {
      res.status(404).json({ success: false, message: 'Incident not found' });
      return;
    }

    const events = db.prepare('SELECT * FROM incident_events WHERE incident_id = ? ORDER BY timestamp ASC').all(id);
    const notifications = db.prepare('SELECT * FROM notifications WHERE incident_id = ? ORDER BY created_at DESC').all(id);
    const locations = db.prepare('SELECT * FROM location_updates WHERE incident_id = ? ORDER BY timestamp ASC').all(id);
    const evidence = db.prepare('SELECT * FROM evidence_records WHERE incident_id = ? ORDER BY created_at DESC').all(id);
    const trackingSession = db.prepare('SELECT * FROM tracking_sessions WHERE incident_id = ? AND status = "ACTIVE"').get(id);

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

// POST /api/emergency/:id/accept - Responder accepts incident
emergencyRouter.post('/:id/accept', (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const {
      responderId = 'rsp_arjun_kumar_1042',
      responderName = 'Officer Arjun Kumar',
      responderBadge = 'TN-POL-4412',
      responderLat = 13.0850,
      responderLng = 80.2730,
    } = req.body;

    const now = new Date().toISOString();

    db.prepare(`
      UPDATE emergency_incidents
      SET status = 'RESPONDER_ACCEPTED',
          responder_id = ?,
          responder_name = ?,
          responder_badge = ?,
          responder_latitude = ?,
          responder_longitude = ?,
          updated_at = ?
      WHERE id = ?
    `).run(responderId, responderName, responderBadge, responderLat, responderLng, now, id);

    logIncidentEvent(id, 'RESPONDER_ACCEPTED', responderName, { responderId, responderBadge, responderLat, responderLng });

    const updated = db.prepare('SELECT * FROM emergency_incidents WHERE id = ?').get(id);

    // Realtime notification to user & responder
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

// POST /api/emergency/:id/navigate - Responder starts navigation
emergencyRouter.post('/:id/navigate', (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const incident = db.prepare('SELECT * FROM emergency_incidents WHERE id = ?').get(id) as EmergencyIncidentRecord;

    if (!incident) {
      res.status(404).json({ success: false, message: 'Incident not found' });
      return;
    }

    const now = new Date().toISOString();
    db.prepare(`UPDATE emergency_incidents SET status = 'RESPONDER_NAVIGATING', updated_at = ? WHERE id = ?`).run(now, id);
    logIncidentEvent(id, 'RESPONDER_NAVIGATING', incident.responder_name || 'Responder', {
      destination: { lat: incident.latitude, lng: incident.longitude }
    });

    // Real Google Maps navigation URL with actual coordinates (Rule 15)
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${incident.latitude},${incident.longitude}&travelmode=driving`;

    broadcastToIncident(id, {
      type: 'RESPONDER_NAVIGATING',
      incidentId: id,
      timestamp: now,
      googleMapsUrl,
    });

    res.json({
      success: true,
      message: 'Responder navigation initiated',
      googleMapsUrl,
      incident: { ...incident, status: 'RESPONDER_NAVIGATING' },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/emergency/:id/resolve - Resolve incident
emergencyRouter.post('/:id/resolve', (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const { resolvedBy = 'Officer Arjun Kumar', notes = 'Safety verified on-site' } = req.body;
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE emergency_incidents
      SET status = 'RESOLVED',
          resolved_at = ?,
          updated_at = ?
      WHERE id = ?
    `).run(now, now, id);

    // Expire live tracking session (Rule 23)
    db.prepare(`UPDATE tracking_sessions SET status = 'EXPIRED' WHERE incident_id = ?`).run(id);

    logIncidentEvent(id, 'INCIDENT_RESOLVED', resolvedBy, { notes, timestamp: now });

    const updated = db.prepare('SELECT * FROM emergency_incidents WHERE id = ?').get(id);

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
