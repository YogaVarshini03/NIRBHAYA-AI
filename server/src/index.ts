import express from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables from .env if present
dotenv.config();

import { initDatabase, db } from './db';
import { setupWebSocket } from './websocket';
import { authRouter } from './routes/auth';
import { contactsRouter } from './routes/contacts';
import { emergencyRouter } from './routes/emergency';
import { evidenceRouter } from './routes/evidence';
import { trackingRouter } from './routes/tracking';
import { routesRouter } from './routes/routes';
import { riskRouter } from './routes/risk';
import { analyticsRouter } from './routes/analytics';
import { notificationsRouter } from './routes/notifications';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Database schema and seeds
initDatabase();

// Middleware
app.use(cors({
  origin: '*', // Allow all origins for dev/tunnel access
  credentials: true,
}));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Static uploads directory for media evidence
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/contacts', contactsRouter);
app.use('/api/emergency', emergencyRouter);
app.use('/api/evidence', evidenceRouter);
app.use('/api/tracking', trackingRouter);
app.use('/api/routes', routesRouter);
app.use('/api/risk', riskRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/notifications', notificationsRouter);

// Health check endpoint (Rule 17)
app.get('/api/health', (req, res) => {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as any;
  const incidentCount = db.prepare('SELECT COUNT(*) as count FROM emergency_incidents').get() as any;

  const smsConfigured = Boolean(
    process.env.SMS_PROVIDER_ACCOUNT_SID &&
    process.env.SMS_PROVIDER_AUTH_TOKEN &&
    process.env.SMS_FROM_NUMBER
  );

  const emailConfigured = Boolean(
    process.env.EMAIL_API_KEY ||
    process.env.RESEND_API_KEY ||
    ((process.env.SMTP_HOST || process.env.EMAIL_SMTP_HOST) &&
     (process.env.SMTP_USER || process.env.EMAIL_SMTP_USER) &&
     (process.env.SMTP_PASS || process.env.EMAIL_SMTP_PASS))
  );

  res.json({
    status: 'ONLINE',
    system: 'NIRBHAYA AI Proactive Safety Backend & Telemetry Server',
    appMode: process.env.APP_MODE || 'production',
    timestamp: new Date().toISOString(),
    services: {
      database: 'CONNECTED',
      websocket: 'READY',
      routing: 'AVAILABLE',
      sms: smsConfigured ? 'CONFIGURED' : 'NOT CONFIGURED',
      email: emailConfigured ? 'CONFIGURED' : 'NOT CONFIGURED',
      evidenceStorage: 'READY',
    },
    databaseMetrics: {
      users: userCount ? userCount.count : 0,
      incidents: incidentCount ? incidentCount.count : 0,
    },
    mapProvider: 'Leaflet (OpenStreetMap) / Google Maps Ready',
  });
});

// Create HTTP server and mount WebSocket
const server = http.createServer(app);
setupWebSocket(server);

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🛡️  NIRBHAYA AI Backend Server Running on Port ${PORT}`);
  console.log(`📡 WebSocket Real-time Telemetry Gateway at ws://localhost:${PORT}/ws`);
  console.log(`📁 Evidence Vault Uploads at ${uploadsDir}`);
  console.log(`=======================================================`);
});
