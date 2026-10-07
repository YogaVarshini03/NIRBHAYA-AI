import { Router, Request, Response } from 'express';
import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { sendEmergencySms } from '../services/smsService';
import { initiateEmergencyVoiceCall } from '../services/voiceService';
import { getNearestPoliceStations, PoliceStationInfo } from '../services/policeService';
import { broadcastToAll, broadcastToIncident } from '../websocket';
import { EmergencyIncidentRecord } from '../types';

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

// GET /api/emergency/police-stations - Query nearest police stations
emergencyRouter.get('/police-stations', async (req: Request, res: Response): Promise<void> => {
  try {
    const lat = parseFloat(req.query.lat as string) || 11.0168;
    const lng = parseFloat(req.query.lng as string) || 76.9558;
    const stations = await getNearestPoliceStations(lat, lng);
    res.json({ success: true, stations });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/emergency/create - Trigger SOS / Dispatch Emergency
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

    const existingDbUser = await db.queryOne<{ id: string; name: string; phone: string; language?: string }>(
      'SELECT id, name, phone, language FROM users WHERE id = ?',
      [userId]
    );
    if (!existingDbUser) {
      const firstUser = await db.queryOne<{ id: string; name: string; phone: string; language?: string }>('SELECT id, name, phone, language FROM users LIMIT 1');
      userId = firstUser ? firstUser.id : 'USR-7F42A91C';
    }

    const {
      latitude,
      longitude,
      accuracy = 10,
      locationName = 'Live GPS Coordinates',
      triggerType = 'MANUAL_SOS',
      riskScore = 88,
      batteryLevel = 85,
    } = req.body;

    if (latitude === undefined || longitude === undefined || typeof latitude !== 'number' || typeof longitude !== 'number') {
      res.status(400).json({
        success: false,
        error: 'GPS location coordinates are required to dispatch emergency services.',
      });
      return;
    }

    const userRecord = await db.queryOne<any>('SELECT * FROM users WHERE id = ?', [userId]);
    const userName = userRecord?.name || 'NIRBHAYA AI User';
    const userPhone = userRecord?.phone || '';
    const userLang = (userRecord?.language as 'en' | 'ta') || 'en';

    // Duplicate check: if active incident exists, update its coordinates
    const existingActive = await db.queryOne<any>(`
      SELECT * FROM emergency_incidents
      WHERE user_id = ? AND status NOT IN ('RESOLVED', 'CLOSED', 'CANCELLED')
      ORDER BY created_at DESC LIMIT 1
    `, [userId]);

    if (existingActive) {
      console.log(`[Emergency] Active incident ${existingActive.id} exists. Updating live telemetry.`);
      await db.execute(`
        UPDATE emergency_incidents 
        SET latitude = ?, longitude = ?, accuracy = ?, updated_at = ?
        WHERE id = ?
      `, [latitude, longitude, accuracy, new Date().toISOString(), existingActive.id]);

      const session = await db.queryOne<any>(`
        SELECT token FROM tracking_sessions WHERE incident_id = ? AND status = 'ACTIVE' LIMIT 1
      `, [existingActive.id]);

      res.json({
        success: true,
        incident: { ...existingActive, latitude, longitude, accuracy },
        trackingToken: session ? session.token : `trk_${existingActive.id}`,
        alreadyActive: true,
        notificationResults: [],
        message: `Incident ${existingActive.id} is already in progress. Live telemetry synchronized.`
      });
      return;
    }

    // Generate Incident ID & Tracking Token
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const incidentId = `NG-${randomSuffix}`;
    const trackingToken = `trk_${uuidv4().replace(/-/g, '')}`;
    const trackingSessionId = `ses_${uuidv4()}`;
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(); // 6 hours expiry (Rule Phase 1C)
    const appBase = (process.env.APP_BASE_URL || 'http://localhost:5173').replace(/\/$/, '');
    const trackingUrl = `${appBase}/track/${trackingToken}`;

    const riskLevel = riskScore >= 80 ? 'CRITICAL' : riskScore >= 60 ? 'HIGH' : riskScore >= 30 ? 'MODERATE' : 'LOW';

    // Query nearest police stations using Overpass OSM API + local fallback
    const nearestStations = await getNearestPoliceStations(latitude, longitude);
    const primaryPoliceStation = nearestStations[0] || null;

    // 1. Insert Incident Row
    await db.execute(`
      INSERT INTO emergency_incidents (
        id, user_id, status, risk_level, risk_score, latitude, longitude, accuracy, location_name,
        police_station_name, police_station_phone, nearest_stations_json, created_at, updated_at
      ) VALUES (?, ?, 'CREATED', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      incidentId,
      userId,
      riskLevel,
      riskScore,
      latitude,
      longitude,
      accuracy,
      locationName,
      primaryPoliceStation?.name || 'Local Police Station',
      primaryPoliceStation?.phone || '100',
      JSON.stringify(nearestStations),
      now,
      now
    ]);

    // 2. Create 6-Hour Public Tracking Session
    await db.execute(`
      INSERT INTO tracking_sessions (id, user_id, incident_id, token, status, started_at, expires_at)
      VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?)
    `, [trackingSessionId, userId, incidentId, trackingToken, now, expiresAt]);

    // 3. Record Initial GPS Breadcrumb
    await db.execute(`
      INSERT INTO location_updates (id, incident_id, user_id, latitude, longitude, accuracy, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [`loc_${uuidv4()}`, incidentId, userId, latitude, longitude, accuracy, now]);

    await logIncidentEvent(incidentId, 'INCIDENT_CREATED', 'USER', { triggerType, latitude, longitude, accuracy, batteryLevel });

    // 4. Retrieve verified trusted contacts in priority order
    let contacts = await db.query<any>(`
      SELECT * FROM trusted_contacts 
      WHERE user_id = ? AND verification_status = 'VERIFIED'
      ORDER BY priority_order ASC, is_primary DESC
    `, [userId]);

    // Fallback: If no contacts are explicitly marked VERIFIED, take all user contacts to ensure safety in test drills
    if (contacts.length === 0) {
      contacts = await db.query<any>(`
        SELECT * FROM trusted_contacts 
        WHERE user_id = ?
        ORDER BY priority_order ASC, is_primary DESC
      `, [userId]);
    }

    const notificationResults: Array<{
      type: string;
      recipient: string;
      status: string;
      error?: string;
      reason?: string;
      providerMessageId?: string;
    }> = [];

    // 5. Send Parallel SMS, Voice Calls, and Police Dispatch concurrently (Fault Isolated)
    const dispatchTasks: Promise<void>[] = [];

    // 5a. Contact SMS Dispatches
    for (const contact of contacts) {
      if (contact.phone) {
        dispatchTasks.push((async () => {
          try {
            const smsRes = await sendEmergencySms({
              incidentId,
              toPhone: contact.phone,
              userName,
              userPhone,
              locationName,
              latitude,
              longitude,
              trackingUrl,
              batteryLevel,
              messageType: 'EMERGENCY_SOS',
            });
            notificationResults.push({
              type: 'SMS',
              recipient: contact.phone,
              status: smsRes.status,
              error: smsRes.error,
              reason: smsRes.reason,
              providerMessageId: smsRes.providerMessageId,
            });
          } catch (err: any) {
            notificationResults.push({
              type: 'SMS',
              recipient: contact.phone,
              status: 'FAILED',
              error: err?.message || 'SMS dispatch exception',
            });
          }
        })());
      }
    }

    // 5b. Outbound Voice Call to Primary Contact with sequential failover
    if (contacts.length > 0 && contacts[0].phone) {
      const primaryContact = contacts[0];
      dispatchTasks.push((async () => {
        try {
          const voiceRes = await initiateEmergencyVoiceCall({
            incidentId,
            toPhone: primaryContact.phone,
            recipientName: primaryContact.name,
            userName,
            userPhone,
            locationName,
            language: userLang,
          });

          notificationResults.push({
            type: 'VOICE',
            recipient: primaryContact.phone,
            status: voiceRes.status,
            error: voiceRes.error,
            reason: voiceRes.reason,
            providerMessageId: voiceRes.callSid,
          });

          // If contact 1 fails or is rejected, failover to call contact 2 immediately
          if (!voiceRes.success && contacts.length > 1 && contacts[1].phone) {
            console.log(`[Emergency] Contact 1 voice call failed. Failing over to Contact 2 (${contacts[1].name})...`);
            const voiceRes2 = await initiateEmergencyVoiceCall({
              incidentId,
              toPhone: contacts[1].phone,
              recipientName: contacts[1].name,
              userName,
              userPhone,
              locationName,
              language: userLang,
            });

            notificationResults.push({
              type: 'VOICE_FAILOVER',
              recipient: contacts[1].phone,
              status: voiceRes2.status,
              error: voiceRes2.error,
              reason: voiceRes2.reason,
              providerMessageId: voiceRes2.callSid,
            });
          }
        } catch (err: any) {
          notificationResults.push({
            type: 'VOICE',
            recipient: primaryContact.phone,
            status: 'FAILED',
            error: err?.message || 'Voice dispatch exception',
          });
        }
      })());
    }

    // 5c. Police Notification (SMS + Voice to nearest station / DEMO_POLICE_NUMBER)
    if (primaryPoliceStation && primaryPoliceStation.phone) {
      dispatchTasks.push((async () => {
        try {
          const policeSmsRes = await sendEmergencySms({
            incidentId,
            toPhone: primaryPoliceStation.phone,
            userName,
            userPhone,
            locationName,
            latitude,
            longitude,
            trackingUrl,
            messageType: 'POLICE_DISPATCH',
          });

          notificationResults.push({
            type: 'POLICE_SMS',
            recipient: primaryPoliceStation.name,
            status: policeSmsRes.status,
            error: policeSmsRes.error,
            reason: policeSmsRes.reason,
            providerMessageId: policeSmsRes.providerMessageId,
          });
        } catch (err: any) {
          notificationResults.push({
            type: 'POLICE_SMS',
            recipient: primaryPoliceStation.name,
            status: 'FAILED',
            error: err?.message || 'Police SMS dispatch exception',
          });
        }
      })());

      dispatchTasks.push((async () => {
        try {
          const policeVoiceRes = await initiateEmergencyVoiceCall({
            incidentId,
            toPhone: primaryPoliceStation.phone,
            recipientName: primaryPoliceStation.name,
            userName,
            userPhone,
            locationName,
            isPoliceCall: true,
          });

          notificationResults.push({
            type: 'POLICE_VOICE',
            recipient: primaryPoliceStation.name,
            status: policeVoiceRes.status,
            error: policeVoiceRes.error,
            reason: policeVoiceRes.reason,
            providerMessageId: policeVoiceRes.callSid,
          });
        } catch (err: any) {
          notificationResults.push({
            type: 'POLICE_VOICE',
            recipient: primaryPoliceStation.name,
            status: 'FAILED',
            error: err?.message || 'Police voice dispatch exception',
          });
        }
      })());
    }

    // Wait for all parallel dispatch tasks to settle safely
    await Promise.allSettled(dispatchTasks);

    // Fetch updated incident
    const incident = await db.queryOne<EmergencyIncidentRecord>('SELECT * FROM emergency_incidents WHERE id = ?', [incidentId]);

    // Real-time broadcast to connected clients & responder command
    broadcastToAll({
      type: 'EMERGENCY_TRIGGERED',
      incident,
      trackingToken,
      nearestStations,
      notificationResults,
    });

    res.status(201).json({
      success: true,
      message: 'Emergency incident dispatched successfully.',
      incident,
      trackingToken,
      trackingUrl,
      nearestStations,
      notificationResults,
      demoMode: process.env.DEMO_MODE !== 'false',
    });
  } catch (error: any) {
    console.error('[Emergency] Error triggering SOS:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate emergency protocol.',
      error: error.message,
    });
  }
});

// POST /api/emergency/:id/cancel - User Cancels SOS with PIN & Sends False Alarm SMS
emergencyRouter.post('/:id/cancel', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { pin = '', reason = 'Cancelled by user with PIN' } = req.body;

    const incident = await db.queryOne<any>('SELECT * FROM emergency_incidents WHERE id = ?', [id]);
    if (!incident) {
      res.status(404).json({ success: false, message: 'Incident not found' });
      return;
    }

    const user = await db.queryOne<any>('SELECT * FROM users WHERE id = ?', [incident.user_id]);
    const storedPinHash = user?.pin_hash;

    // Verify PIN (default is '1234')
    let pinValid = false;
    if (storedPinHash) {
      pinValid = bcrypt.compareSync(pin.trim(), storedPinHash);
    } else if (pin.trim() === '1234') {
      pinValid = true;
    }

    if (!pinValid) {
      console.warn(`[Emergency] Invalid PIN attempt for incident ${id} (Provided: ${pin})`);
      await logIncidentEvent(id, 'CANCEL_FAILED_INVALID_PIN', 'USER', { enteredPin: '****' });
      res.status(401).json({
        success: false,
        error: 'Invalid PIN. Emergency cancellation aborted. SOS remains active.',
      });
      return;
    }

    const now = new Date().toISOString();

    // Mark incident as CANCELLED
    await db.execute(`
      UPDATE emergency_incidents
      SET status = 'CANCELLED',
          resolved_at = ?,
          updated_at = ?
      WHERE id = ?
    `, [now, now, id]);

    // Deactivate live tracking token immediately
    await db.execute(`UPDATE tracking_sessions SET status = 'EXPIRED' WHERE incident_id = ?`, [id]);
    await logIncidentEvent(id, 'INCIDENT_CANCELLED', 'USER', { reason, pinVerified: true, timestamp: now });

    // Send "False alarm, I am safe" SMS to contacts
    const contacts = await db.query<any>('SELECT * FROM trusted_contacts WHERE user_id = ?', [incident.user_id]);
    const falseAlarmResults: any[] = [];

    for (const c of contacts) {
      if (c.phone) {
        const faRes = await sendEmergencySms({
          incidentId: id,
          toPhone: c.phone,
          userName: user?.name || 'User',
          messageType: 'FALSE_ALARM',
        });
        falseAlarmResults.push({ recipient: c.phone, status: faRes.status });
      }
    }

    const updated = await db.queryOne('SELECT * FROM emergency_incidents WHERE id = ?', [id]);
    broadcastToIncident(id, { type: 'INCIDENT_CANCELLED', incidentId: id, reason, timestamp: now });
    broadcastToAll({ type: 'INCIDENT_RESOLVED', incident: updated });

    res.json({
      success: true,
      message: 'SOS successfully cancelled with PIN. False alarm SMS dispatched to contacts.',
      incident: updated,
      falseAlarmResults,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/emergency/active - Responder Active Incidents
emergencyRouter.get('/active', async (req: Request, res: Response): Promise<void> => {
  try {
    const incidents = await db.query(`
      SELECT e.*, u.name as user_name, u.phone as user_phone
      FROM emergency_incidents e
      LEFT JOIN users u ON e.user_id = u.id
      WHERE e.status NOT IN ('RESOLVED', 'CLOSED', 'CANCELLED')
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

// GET /api/emergency/:id - Single incident details
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
    const trackingSession = await db.queryOne('SELECT * FROM tracking_sessions WHERE incident_id = ? AND status = "ACTIVE"', [id]);

    let nearestStations: PoliceStationInfo[] = [];
    if (incident.nearest_stations_json) {
      try {
        nearestStations = JSON.parse(incident.nearest_stations_json);
      } catch (e) {}
    }

    res.json({
      success: true,
      incident,
      events,
      notifications,
      locationHistory: locations,
      trackingSession,
      nearestStations,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/emergency/:id/acknowledge - Responder Acknowledge
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

    res.json({ success: true, message: 'Incident acknowledged by responder.', incident: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/emergency/:id/accept - Responder Accept
emergencyRouter.post('/:id/accept', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { responderId = 'RSP-1042', responderName = 'Officer Arjun Kumar', responderBadge = 'APP-RSP-1042' } = req.body;
    const now = new Date().toISOString();

    await db.execute(`
      UPDATE emergency_incidents
      SET status = 'RESPONDER_ACCEPTED', responder_id = ?, responder_name = ?, responder_badge = ?, updated_at = ?
      WHERE id = ?
    `, [responderId, responderName, responderBadge, now, id]);

    await logIncidentEvent(id, 'RESPONDER_ACCEPTED', responderName, { responderId, responderBadge, timestamp: now });
    const updated = await db.queryOne('SELECT * FROM emergency_incidents WHERE id = ?', [id]);

    broadcastToIncident(id, { type: 'RESPONDER_ACCEPTED', incidentId: id, responderName, responderBadge, timestamp: now });
    broadcastToAll({ type: 'INCIDENT_UPDATED', incident: updated });

    res.json({ success: true, message: 'Incident accepted by responder.', incident: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/emergency/:id/resolve - Responder Resolve
emergencyRouter.post('/:id/resolve', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { resolvedBy = 'Officer Arjun Kumar', notes = 'Safety verified on-scene' } = req.body;
    const now = new Date().toISOString();

    await db.execute(`
      UPDATE emergency_incidents
      SET status = 'RESOLVED', resolved_at = ?, updated_at = ?
      WHERE id = ?
    `, [now, now, id]);

    await db.execute(`UPDATE tracking_sessions SET status = 'EXPIRED' WHERE incident_id = ?`, [id]);
    await logIncidentEvent(id, 'INCIDENT_RESOLVED', resolvedBy, { notes, timestamp: now });

    const updated = await db.queryOne('SELECT * FROM emergency_incidents WHERE id = ?', [id]);
    broadcastToIncident(id, { type: 'INCIDENT_RESOLVED', incidentId: id, resolvedBy, timestamp: now });
    broadcastToAll({ type: 'INCIDENT_RESOLVED', incident: updated });

    res.json({ success: true, message: 'Incident marked as resolved. Live tracking expired.', incident: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
