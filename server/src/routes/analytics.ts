import { Router, Request, Response } from 'express';
import { db } from '../db';

export const analyticsRouter = Router();

// GET /api/analytics - Dynamic aggregation from database records
analyticsRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const totalIncidentsRow = await db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM emergency_incidents');
    const totalIncidents = totalIncidentsRow ? totalIncidentsRow.count : 0;

    const resolvedIncidentsRow = await db.queryOne<{ count: number }>("SELECT COUNT(*) as count FROM emergency_incidents WHERE status = 'RESOLVED'");
    const resolvedIncidents = resolvedIncidentsRow ? resolvedIncidentsRow.count : 0;

    const activeIncidentsRow = await db.queryOne<{ count: number }>("SELECT COUNT(*) as count FROM emergency_incidents WHERE status NOT IN ('RESOLVED', 'CLOSED')");
    const activeIncidents = activeIncidentsRow ? activeIncidentsRow.count : 0;

    const totalLocationChecksRow = await db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM location_updates');
    const totalSafetyChecks = totalLocationChecksRow ? totalLocationChecksRow.count : 0;

    const totalEvidenceRow = await db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM evidence_records');
    const totalEvidenceCount = totalEvidenceRow ? totalEvidenceRow.count : 0;

    const totalNotificationsRow = await db.queryOne<{ count: number }>("SELECT COUNT(*) as count FROM notifications WHERE status = 'SENT'");
    const totalNotificationsSent = totalNotificationsRow ? totalNotificationsRow.count : 0;

    // Risk level distribution
    const riskDistributionRows = await db.query<{ risk_level: string; count: number }>(`
      SELECT risk_level, COUNT(*) as count
      FROM emergency_incidents
      GROUP BY risk_level
    `);

    const riskDistribution: Record<string, number> = {
      CRITICAL: 0,
      HIGH: 0,
      MODERATE: 0,
      LOW: 0,
    };
    riskDistributionRows.forEach((r) => {
      if (r.risk_level) riskDistribution[r.risk_level] = r.count;
    });

    // Recent incidents
    const recentIncidents = await db.query(`
      SELECT id, status, risk_level, risk_score, location_name, created_at, resolved_at
      FROM emergency_incidents
      ORDER BY created_at DESC
      LIMIT 10
    `);

    // Average response time calculation: time between CREATED and RESPONDER_ACCEPTED
    let avgResponseTimeSeconds = null;
    let avgResponseTimeDisplay = 'N/A';

    try {
      const responseTimeRows = await db.query<{ t_create: string; t_accept: string }>(`
        SELECT 
          e_create.timestamp as t_create,
          e_acc.timestamp as t_accept
        FROM incident_events e_create
        JOIN incident_events e_acc ON e_create.incident_id = e_acc.incident_id
        WHERE e_create.event = 'INCIDENT_CREATED' AND e_acc.event = 'RESPONDER_ACCEPTED'
      `);

      if (responseTimeRows.length > 0) {
        const diffs = responseTimeRows
          .map((r) => {
            const c = new Date(r.t_create).getTime();
            const a = new Date(r.t_accept).getTime();
            return (a - c) / 1000;
          })
          .filter((d) => !isNaN(d) && d >= 0);

        if (diffs.length > 0) {
          const sum = diffs.reduce((acc, curr) => acc + curr, 0);
          avgResponseTimeSeconds = Math.round(sum / diffs.length);
          avgResponseTimeDisplay = `${Math.floor(avgResponseTimeSeconds / 60)}m ${avgResponseTimeSeconds % 60}s`;
        }
      }
    } catch (err) {
      console.warn('[Analytics] Response time calc note:', err);
    }

    const hasData = totalIncidents > 0 || totalSafetyChecks > 0;

    res.json({
      success: true,
      hasData,
      statusMessage: hasData ? 'Database metrics computed' : 'No incidents recorded yet',
      metrics: {
        totalEmergencyIncidents: totalIncidents,
        activeIncidents,
        resolvedIncidents,
        totalSafetyChecks,
        evidenceVaultItems: totalEvidenceCount,
        dispatchedAlerts: totalNotificationsSent,
        avgResponseTimeSeconds,
        avgResponseTimeDisplay: avgResponseTimeDisplay !== 'N/A' ? avgResponseTimeDisplay : 'Insufficient data',
      },
      riskDistribution,
      recentIncidents,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/analytics/heatmap - Retrieve authentic incident coordinates from database
analyticsRouter.get('/heatmap', async (req: Request, res: Response): Promise<void> => {
  try {
    const incidents = await db.query<any>(`
      SELECT id, risk_score, risk_level, latitude, longitude, location_name, status, created_at
      FROM emergency_incidents
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 100
    `);

    res.json({
      success: true,
      count: incidents.length,
      hasData: incidents.length > 0,
      message: incidents.length > 0 ? 'Authentic incident coordinates loaded' : 'NO INCIDENT DATA AVAILABLE',
      incidents: incidents.map((inc) => ({
        id: inc.id,
        lat: Number(inc.latitude),
        lng: Number(inc.longitude),
        riskScore: inc.risk_score,
        riskLevel: inc.risk_level,
        locationName: inc.location_name,
        status: inc.status,
        timestamp: inc.created_at,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

