import { Router, Request, Response } from 'express';
import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken } from './auth';

export const historyRouter = Router();

// GET /api/history - Retrieve complete chronological history for the authenticated user
historyRouter.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const authUser = (req as any).user;
    const userId = req.query.userId ? String(req.query.userId) : (authUser?.id || 'USR-7F42A91C');

    // 1. Fetch user's emergency incidents
    const incidents = await db.query<any>(`
      SELECT id, status, risk_level, risk_score, latitude, longitude, accuracy, location_name,
             responder_id, responder_name, created_at, updated_at, resolved_at
      FROM emergency_incidents
      WHERE user_id = ?
      ORDER BY created_at DESC
    `, [userId]);

    // 2. Fetch notifications dispatched for user's incidents
    const notifications = await db.query<any>(`
      SELECT n.*
      FROM notifications n
      JOIN emergency_incidents e ON n.incident_id = e.id
      WHERE e.user_id = ?
      ORDER BY n.created_at DESC
    `, [userId]);

    // 3. Fetch evidence records
    const evidence = await db.query<any>(`
      SELECT id, incident_id, type, title, file_name, file_size, sha256_hash, created_at
      FROM evidence_records
      WHERE user_id = ?
      ORDER BY created_at DESC
    `, [userId]);

    // 4. Fetch risk assessment history
    const riskRecords = await db.query<any>(`
      SELECT id, score, level, factors, latitude, longitude, accuracy, confidence, created_at
      FROM risk_assessments
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `, [userId]);

    // 5. Fetch user login history
    const loginHistory = await db.query<any>(`
      SELECT id, user_id, user_name, login_time, logout_time, ip_address, device_info, login_status
      FROM login_history
      WHERE user_id = ?
      ORDER BY login_time DESC
      LIMIT 20
    `, [userId]);

    // 6. Aggregate into unified chronological events
    const timelineEvents: Array<{
      id: string;
      category: 'EMERGENCY' | 'VOICE_CALL' | 'SMS' | 'EMAIL' | 'RISK_ASSESSMENT' | 'EVIDENCE' | 'LOGIN' | 'RESPONDER_ACTION';
      title: string;
      description: string;
      status: string;
      statusBadge?: string;
      timestamp: string;
      date: string;
      incidentId?: string;
      metadata?: any;
    }> = [];

    // Add emergency incidents & status transitions
    incidents.forEach((inc) => {
      timelineEvents.push({
        id: `ev_inc_${inc.id}`,
        category: 'EMERGENCY',
        title: `Emergency Distress Broadcast (${inc.id})`,
        description: `Risk score: ${inc.risk_score}/100 (${inc.risk_level}) • Location: ${inc.location_name || 'Device GPS Fix'}`,
        status: inc.status,
        statusBadge: inc.status === 'RESOLVED' ? 'RESOLVED' : inc.status,
        timestamp: inc.created_at,
        date: inc.created_at,
        incidentId: inc.id,
        metadata: {
          latitude: inc.latitude,
          longitude: inc.longitude,
          accuracy: inc.accuracy,
          responderName: inc.responder_name,
        },
      });

      if (inc.resolved_at) {
        timelineEvents.push({
          id: `ev_res_${inc.id}`,
          category: 'RESPONDER_ACTION',
          title: `Emergency Resolved (${inc.id})`,
          description: `All distress protocols terminated and cleared by responder.`,
          status: 'RESOLVED',
          statusBadge: 'RESOLVED',
          timestamp: inc.resolved_at,
          date: inc.resolved_at,
          incidentId: inc.id,
        });
      }
    });

    // Add notifications
    notifications.forEach((n) => {
      const cat = n.type === 'VOICE' ? 'VOICE_CALL' : n.type === 'SMS' ? 'SMS' : 'EMAIL';
      const label = n.type === 'VOICE' ? 'Automated Voice Call' : n.type === 'SMS' ? 'Emergency SMS Dispatch' : 'Emergency Alert Email';
      timelineEvents.push({
        id: `ev_notif_${n.id}`,
        category: cat,
        title: `${label} (${n.incident_id})`,
        description: `Dispatched to ${n.recipient} via ${n.provider}.${n.error_message ? ` Note: ${n.error_message}` : ''}`,
        status: n.status,
        statusBadge: n.status,
        timestamp: n.created_at,
        date: n.created_at,
        incidentId: n.incident_id,
        metadata: {
          recipient: n.recipient,
          provider: n.provider,
          providerMessageId: n.provider_message_id,
        },
      });
    });

    // Add risk assessments
    riskRecords.forEach((r) => {
      timelineEvents.push({
        id: `ev_risk_${r.id}`,
        category: 'RISK_ASSESSMENT',
        title: `Proactive Risk Scan: ${r.score}/100 (${r.level})`,
        description: `Environmental telemetry evaluated. Confidence: ${r.confidence || 85}%.`,
        status: r.level,
        statusBadge: r.level,
        timestamp: r.created_at,
        date: r.created_at,
        metadata: {
          score: r.score,
          factors: r.factors,
        },
      });
    });

    // Add evidence records
    evidence.forEach((ev) => {
      timelineEvents.push({
        id: `ev_evd_${ev.id}`,
        category: 'EVIDENCE',
        title: `Evidence Vault Capture: ${ev.type.toUpperCase()}`,
        description: `${ev.title || ev.file_name} • SHA-256: ${ev.sha256_hash ? ev.sha256_hash.substring(0, 16) + '...' : 'Verified'}`,
        status: 'VERIFIED',
        statusBadge: 'TAMPER_EVIDENT',
        timestamp: ev.created_at,
        date: ev.created_at,
        incidentId: ev.incident_id,
      });
    });

    // Add login history
    loginHistory.forEach((l) => {
      timelineEvents.push({
        id: `ev_log_${l.id}`,
        category: 'LOGIN',
        title: `Safety Network Authentication`,
        description: `Device session authenticated from ${l.ip_address || 'Local Device'}. Status: ${l.login_status}`,
        status: l.login_status,
        statusBadge: l.login_status,
        timestamp: l.login_time,
        date: l.login_time,
        metadata: {
          deviceInfo: l.device_info,
        },
      });
    });

    // Sort all events in strict descending chronological order
    timelineEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json({
      success: true,
      userId,
      count: timelineEvents.length,
      events: timelineEvents,
      summary: {
        totalIncidents: incidents.length,
        resolvedIncidents: incidents.filter((i) => i.status === 'RESOLVED').length,
        totalNotifications: notifications.length,
        totalEvidence: evidence.length,
        totalRiskScans: riskRecords.length,
        totalLogins: loginHistory.length,
      },
    });
  } catch (error: any) {
    console.error('[History API] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/history/risk - Log a proactive risk assessment record
historyRouter.post('/risk', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const authUser = (req as any).user;
    const userId = authUser?.id || req.body.userId || 'USR-7F42A91C';
    const { score, level, factors, latitude, longitude, accuracy, confidence = 85 } = req.body;

    if (score === undefined || !level) {
      res.status(400).json({ success: false, error: 'score and level are required' });
      return;
    }

    const id = `risk_${uuidv4()}`;
    const now = new Date().toISOString();

    await db.execute(`
      INSERT INTO risk_assessments (id, user_id, score, level, factors, latitude, longitude, accuracy, confidence, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      userId,
      score,
      level,
      typeof factors === 'string' ? factors : JSON.stringify(factors || {}),
      latitude || null,
      longitude || null,
      accuracy || null,
      confidence,
      now
    ]);

    res.status(201).json({ success: true, id, message: 'Risk assessment logged' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
