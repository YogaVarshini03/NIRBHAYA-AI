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
import { historyRouter } from './routes/history';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Database schema and seeds
await initDatabase();

// CORS configuration (Rule 6: Production CORS with Vercel and LAN support)
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.CORS_ORIGIN,
  'http://localhost:3000',
  'https://localhost:3000',
  'http://127.0.0.1:3000',
  'https://127.0.0.1:3000',
  'http://localhost:5173',
  'https://localhost:5173',
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (mobile app, curl, server-to-server)
    if (!origin) return callback(null, true);

    // Explicitly allowed frontend origins
    if (allowedOrigins.includes(origin)) return callback(null, true);

    // Allow all Vercel deployments (*.vercel.app)
    if (/^https:\/\/[a-zA-Z0-9_-]+\.vercel\.app$/.test(origin)) {
      return callback(null, true);
    }

    // Allow local network and phone testing IPs
    if (/^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }

    // Allow Railway's own origin
    if (origin.includes('railway.app')) {
      return callback(null, true);
    }

    if (process.env.NODE_ENV === 'production' && process.env.APP_MODE === 'production') {
      console.warn(`[CORS] Rejected origin: ${origin}`);
      return callback(new Error(`CORS blocked request from: ${origin}`));
    }

    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
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
app.use('/api/history', historyRouter);

// Health check endpoint (Rule 17, Phase 3)
app.get('/api/health', async (req, res) => {
  let userCount: any = { count: 0 };
  let incidentCount: any = { count: 0 };
  try {
    userCount = (await db.queryOne('SELECT COUNT(*) as count FROM users')) || { count: 0 };
    incidentCount = (await db.queryOne('SELECT COUNT(*) as count FROM emergency_incidents')) || { count: 0 };
  } catch (err: any) {
    console.error('[HealthCheck] DB query error:', err.message);
  }

  const voiceConfigured = Boolean(
    (process.env.TWILIO_ACCOUNT_SID || process.env.SMS_PROVIDER_ACCOUNT_SID) &&
    (process.env.TWILIO_AUTH_TOKEN || process.env.SMS_PROVIDER_AUTH_TOKEN) &&
    (process.env.TWILIO_PHONE_NUMBER || process.env.SMS_FROM_NUMBER)
  );

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
    system: 'NIRBHAYA AI Real-time Production Safety Platform',
    appMode: process.env.APP_MODE || 'production',
    environment: process.env.NODE_ENV || 'production',
    timestamp: new Date().toISOString(),
    services: {
      database: `CONNECTED (${db.getEngine()})`,
      websocket: 'READY',
      routing: 'AVAILABLE (OSRM)',
      voiceCall: voiceConfigured ? 'CONFIGURED' : 'NOT CONFIGURED',
      sms: smsConfigured ? 'CONFIGURED' : 'NOT CONFIGURED',
      email: emailConfigured ? 'CONFIGURED' : 'NOT CONFIGURED',
      policeIntegration: 'Police API integration not configured (Application Responder Network Active)',
      evidenceStorage: 'READY',
    },
    databaseMetrics: {
      users: userCount ? userCount.count : 0,
      incidents: incidentCount ? incidentCount.count : 0,
    },
    mapProvider: 'Leaflet (OpenStreetMap / Esri World Dark Gray)',
  });
});

// Serve frontend static build if dist/ exists (fallback for direct Railway web access)
const distDir = path.join(__dirname, '..', '..', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/ws')) {
      return next();
    }
    if (req.method === 'GET') {
      return res.sendFile(path.join(distDir, 'index.html'));
    }
    next();
  });
}

// Create HTTP server and mount WebSocket
const server = http.createServer(app);
setupWebSocket(server);

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🛡️  NIRBHAYA AI Backend Server Running on Port ${PORT}`);
  console.log(`📡 WebSocket Real-time Telemetry Gateway active on /ws`);
  console.log(`📁 Evidence Vault Uploads at ${uploadsDir}`);
  console.log(`=======================================================`);
});
