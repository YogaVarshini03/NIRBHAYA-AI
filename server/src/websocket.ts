import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage, Server } from 'http';
import { db } from './db';
import { v4 as uuidv4 } from 'uuid';

interface ClientConnection {
  ws: WebSocket;
  incidentId?: string;
  userId?: string;
  role?: string;
}

const clients: Map<WebSocket, ClientConnection> = new Map();

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    console.log('[WebSocket] New client connected from', req.socket.remoteAddress);
    clients.set(ws, { ws });

    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        handleWsMessage(ws, data);
      } catch (e) {
        console.error('[WebSocket] Error parsing message:', e);
      }
    });

    ws.on('close', () => {
      console.log('[WebSocket] Client disconnected');
      clients.delete(ws);
    });

    ws.on('error', (err) => {
      console.error('[WebSocket] Client socket error:', err);
      clients.delete(ws);
    });

    // Send initial handshake
    ws.send(JSON.stringify({
      type: 'CONNECTED',
      timestamp: new Date().toISOString(),
      message: 'NIRBHAYA AI Real-time Telemetry Gateway Connected'
    }));
  });

  console.log('[WebSocket] Real-time tracking server mounted on /ws');
  return wss;
}

async function handleWsMessage(ws: WebSocket, data: any) {
  const client = clients.get(ws);
  if (!client) return;

  switch (data.type) {
    case 'SUBSCRIBE_INCIDENT': {
      client.incidentId = data.incidentId;
      client.role = data.role || 'VIEWER';
      console.log(`[WebSocket] Client subscribed to incident: ${data.incidentId} as ${client.role}`);
      ws.send(JSON.stringify({
        type: 'SUBSCRIBED',
        incidentId: data.incidentId,
        status: 'ACTIVE'
      }));
      break;
    }

    case 'SUBSCRIBE_RESPONDER':
    case 'SUBSCRIBE_ALL': {
      client.incidentId = 'ALL';
      client.role = 'RESPONDER';
      console.log(`[WebSocket] Responder connected and subscribed to live network dispatches`);
      ws.send(JSON.stringify({
        type: 'SUBSCRIBED_ALL',
        role: 'RESPONDER',
        status: 'ACTIVE'
      }));
      break;
    }

    case 'LOCATION_UPDATE': {
      // User or Responder broadcasting live coordinates
      const { incidentId, latitude, longitude, accuracy, speed, heading, altitude, senderRole } = data;
      if (!latitude || !longitude) return;

      const updateId = `loc_${uuidv4()}`;
      const now = new Date().toISOString();

      // Persist location update in database
      try {
        await db.execute(`
          INSERT INTO location_updates (id, incident_id, user_id, latitude, longitude, accuracy, speed, heading, altitude, timestamp)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          updateId,
          incidentId || null,
          data.userId || 'anonymous',
          latitude,
          longitude,
          accuracy || 5,
          speed || null,
          heading || null,
          altitude || null,
          now
        ]);

        // If this is an incident, update the incident's latest coordinates
        if (incidentId && senderRole !== 'RESPONDER') {
          await db.execute(`
            UPDATE emergency_incidents
            SET latitude = ?, longitude = ?, accuracy = ?, updated_at = ?
            WHERE id = ?
          `, [latitude, longitude, accuracy || 5, now, incidentId]);
        } else if (incidentId && senderRole === 'RESPONDER') {
          await db.execute(`
            UPDATE emergency_incidents
            SET responder_latitude = ?, responder_longitude = ?, updated_at = ?
            WHERE id = ?
          `, [latitude, longitude, now, incidentId]);
        }
      } catch (err) {
        console.error('[WebSocket] Failed to save location update to DB:', err);
      }

      // Broadcast to all viewers subscribed to this incident and all active responders
      broadcastToIncident(incidentId, {
        type: senderRole === 'RESPONDER' ? 'RESPONDER_LOCATION' : 'USER_LOCATION',
        incidentId,
        latitude,
        longitude,
        accuracy,
        speed,
        heading,
        altitude,
        timestamp: now,
      }, ws);
      break;
    }

    case 'INCIDENT_STATUS_CHANGE': {
      const { incidentId, status, actor } = data;
      broadcastToIncident(incidentId, {
        type: 'STATUS_CHANGED',
        incidentId,
        status,
        actor: actor || 'SYSTEM',
        timestamp: new Date().toISOString(),
      });
      break;
    }

    default:
      console.log('[WebSocket] Unknown message type:', data.type);
  }
}

export function broadcastToIncident(incidentId: string | undefined, payload: any, excludeWs?: WebSocket) {
  if (!incidentId) return;
  const messageStr = JSON.stringify(payload);

  clients.forEach((client, ws) => {
    // Deliver to client if subscribed directly, or if client is a responder monitoring all incidents
    const isTarget = client.incidentId === incidentId || client.incidentId === 'ALL' || client.role === 'RESPONDER';
    if (isTarget && ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
      ws.send(messageStr);
    }
  });
}

export function broadcastToAll(payload: any, excludeWs?: WebSocket) {
  const messageStr = JSON.stringify(payload);
  clients.forEach((client, ws) => {
    if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
      ws.send(messageStr);
    }
  });
}

