import { Router, Request, Response } from 'express';
import { sendEmergencySms } from '../services/smsService';
import { sendEmergencyEmail } from '../services/emailService';

export const notificationsRouter = Router();

// Rate limiting safeguard: Ensure test alerts are never sent in automated loops (Rule 4)
let lastTestAlertTimestamp = 0;
const TEST_ALERT_COOLDOWN_MS = 15000; // 15 seconds cooldown

// POST /api/notifications/test - Safe provider test function (Rule 4)
notificationsRouter.post('/test', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      sendTestMessage = false,
      target = 'BOTH', // 'SMS' | 'EMAIL' | 'BOTH'
      testPhone = '9345596322',
      testEmail = 'saranyarajendran2612@gmail.com',
    } = req.body;

    const accountSid = process.env.SMS_PROVIDER_ACCOUNT_SID;
    const authToken = process.env.SMS_PROVIDER_AUTH_TOKEN;
    const fromNumber = process.env.SMS_FROM_NUMBER;

    const resendApiKey = process.env.EMAIL_API_KEY || process.env.RESEND_API_KEY;
    const smtpHost = process.env.SMTP_HOST || process.env.EMAIL_SMTP_HOST;
    const smtpUser = process.env.SMTP_USER || process.env.EMAIL_SMTP_USER;
    const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_SMTP_PASS;

    const smsConfigured = Boolean(accountSid && authToken && fromNumber);
    const emailConfigured = Boolean(resendApiKey || (smtpHost && smtpUser && smtpPass));

    const statusReport = {
      timestamp: new Date().toISOString(),
      smsProvider: {
        gateway: 'Twilio REST API',
        configured: smsConfigured,
        targetPhone: testPhone,
        accountSidConfigured: Boolean(accountSid),
        authTokenConfigured: Boolean(authToken),
        fromNumberConfigured: Boolean(fromNumber),
      },
      emailProvider: {
        gateway: resendApiKey ? 'Resend HTTP API' : smtpHost ? 'SMTP Relay' : 'None',
        configured: emailConfigured,
        targetEmail: testEmail,
        resendKeyConfigured: Boolean(resendApiKey),
        smtpConfigured: Boolean(smtpHost && smtpUser && smtpPass),
      },
    };

    // If caller only requested credential status inspection (safe check)
    if (!sendTestMessage) {
      res.json({
        success: true,
        mode: 'CREDENTIAL_AUDIT_ONLY',
        message: 'Notification providers inspected. No outbound messages sent.',
        report: statusReport,
      });
      return;
    }

    // Safeguard check against rapid repeated triggers / automated loops (Rule 4)
    const now = Date.now();
    if (now - lastTestAlertTimestamp < TEST_ALERT_COOLDOWN_MS) {
      const waitSec = Math.ceil((TEST_ALERT_COOLDOWN_MS - (now - lastTestAlertTimestamp)) / 1000);
      res.status(429).json({
        success: false,
        message: `Rate limit safeguard active: Please wait ${waitSec}s before dispatching another live test alert.`,
        report: statusReport,
      });
      return;
    }
    lastTestAlertTimestamp = now;

    const results: { sms?: any; email?: any } = {};
    const testIncidentCode = `TEST-${Math.floor(1000 + Math.random() * 9000)}`;

    const testLat = typeof req.body.latitude === 'number' ? req.body.latitude : 0;
    const testLng = typeof req.body.longitude === 'number' ? req.body.longitude : 0;
    const testLocName = req.body.locationName || 'Controlled Notification Verification Drill';

    // Dispatch ONE test SMS if requested
    if ((target === 'SMS' || target === 'BOTH') && testPhone) {
      results.sms = await sendEmergencySms({
        incidentId: 'manual_provider_test',
        toPhone: testPhone,
        incidentCode: testIncidentCode,
        locationName: testLocName,
        latitude: testLat,
        longitude: testLng,
        trackingUrl: 'https://nirbhaya.ai/tracking/test_drill',
      });
    }

    // Dispatch ONE test Email if requested
    if ((target === 'EMAIL' || target === 'BOTH') && testEmail) {
      results.email = await sendEmergencyEmail({
        incidentId: 'manual_provider_test',
        toEmail: testEmail,
        incidentCode: testIncidentCode,
        locationName: testLocName,
        latitude: testLat,
        longitude: testLng,
        accuracy: 8,
        emergencyStatus: 'TEST DRILL ALERT',
        trackingUrl: 'https://nirbhaya.ai/tracking/test_drill',
        isDemo: true,
      });
    }

    res.json({
      success: true,
      mode: 'EXPLICIT_TEST_ALERT_DISPATCHED',
      message: 'Explicit live notification test completed.',
      report: statusReport,
      results,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
