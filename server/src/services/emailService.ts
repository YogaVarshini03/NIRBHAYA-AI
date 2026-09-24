import nodemailer from 'nodemailer';
import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';

export interface SendEmailParams {
  incidentId: string;
  toEmail: string;
  incidentCode?: string;
  locationName?: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  emergencyStatus?: string;
  trackingUrl?: string;
  contactInstructions?: string;
  isDemo?: boolean;
  subject?: string;
  customBody?: string;
}

export interface EmailResult {
  success: boolean;
  providerMessageId?: string;
  error?: string;
  provider: string;
  response?: string;
}

export async function sendEmergencyEmail(params: SendEmailParams): Promise<EmailResult> {
  const host = process.env.SMTP_HOST || process.env.EMAIL_SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || process.env.EMAIL_SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER || process.env.EMAIL_SMTP_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_SMTP_PASS;
  const resendApiKey = process.env.EMAIL_API_KEY || process.env.RESEND_API_KEY;
  const configuredFrom = process.env.EMAIL_FROM_ADDRESS || 'emergency-alerts@nirbhaya.ai';

  const notificationId = `notif_email_${uuidv4()}`;
  const subject = params.subject || `NIRBHAYA AI — EMERGENCY ALERT`;
  const accuracyStr = params.accuracy ? `±${params.accuracy.toFixed(1)}m` : '±10m';
  const statusStr = params.emergencyStatus || 'ACTIVE DISTRESS';
  const timestampStr = new Date().toISOString();
  const humanTimeStr = new Date().toLocaleString();
  const isDemo = params.isDemo || process.env.APP_MODE === 'demo';

  const defaultInstructions = 
    '1. Attempt to contact the user immediately via phone call.\n' +
    '2. Open the real-time tracking link below to monitor live location.\n' +
    '3. If the user cannot be reached and remains in danger, contact emergency services (112) and provide the incident ID and GPS coordinates.';

  const instructions = params.contactInstructions || defaultInstructions;
  const modeBadgeText = isDemo ? '[DEMO / SIMULATED DRILL ALERT]' : '[REAL EMERGENCY BROADCAST]';

  let textBody: string;
  let htmlBody: string;

  if (params.customBody) {
    textBody = params.customBody;
    htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0B0F19; color: #FFFFFF; padding: 28px; border-radius: 12px; border: 2px solid #3B82F6; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #60A5FA; margin-top: 0; font-size: 20px;">🛡️ ${subject}</h2>
        <div style="background: #1E293B; border-radius: 8px; padding: 18px; color: #E2E8F0; font-size: 15px; line-height: 1.6; white-space: pre-wrap; margin: 16px 0;">
${params.customBody}
        </div>
        <p style="font-size: 12px; color: #64748B; margin-top: 20px; border-top: 1px solid #1E293B; padding-top: 12px;">
          Dispatched securely by NIRBHAYA AI Emergency Response Network to: <strong>${params.toEmail}</strong>
        </p>
      </div>
    `;
  } else {
    textBody = 
`NIRBHAYA AI — EMERGENCY ALERT
${modeBadgeText}

An emergency SOS has been activated.

Incident ID: ${params.incidentCode || 'INC-UNKNOWN'}
User Emergency Status: ${statusStr}
Current Location: ${params.locationName || 'Location benchmark'}
Latitude: ${params.latitude ? params.latitude.toFixed(6) : 'N/A'}
Longitude: ${params.longitude ? params.longitude.toFixed(6) : 'N/A'}
GPS Accuracy: ${accuracyStr}
Timestamp: ${humanTimeStr} (${timestampStr})

Live GPS Tracking Link:
${params.trackingUrl || 'N/A'}

Google Maps Navigation:
https://www.google.com/maps?q=${params.latitude || 0},${params.longitude || 0}

TRUSTED CONTACT INSTRUCTIONS:
${instructions}

---
Dispatched securely by NIRBHAYA AI Emergency Response Network.`;

    htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0B0F19; color: #FFFFFF; padding: 28px; border-radius: 12px; border: 2px solid #EF4444; max-width: 620px; margin: 0 auto;">
        <div style="background: #EF4444; color: white; padding: 6px 14px; border-radius: 6px; font-weight: bold; font-size: 13px; display: inline-block; margin-bottom: 16px; letter-spacing: 0.5px;">
          ${modeBadgeText}
        </div>
        <h1 style="color: #EF4444; margin-top: 0; font-size: 22px; letter-spacing: -0.5px;">🚨 NIRBHAYA AI — EMERGENCY ALERT</h1>
        <p style="font-size: 15px; color: #E2E8F0; line-height: 1.5;">
          An emergency SOS has been activated. A user who listed you as a verified emergency contact requires immediate assistance.
        </p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; background: #131B2E; border-radius: 8px; overflow: hidden; border: 1px solid #1E293B;">
          <tr style="border-bottom: 1px solid #1E293B;"><td style="padding: 10px 14px; color: #94A3B8; width: 38%;">Incident ID</td><td style="padding: 10px 14px; font-weight: bold; color: #F87171; font-family: monospace; font-size: 15px;">${params.incidentCode || 'INC-UNKNOWN'}</td></tr>
          <tr style="border-bottom: 1px solid #1E293B;"><td style="padding: 10px 14px; color: #94A3B8;">Emergency Status</td><td style="padding: 10px 14px; color: #EF4444; font-weight: bold;">${statusStr}</td></tr>
          <tr style="border-bottom: 1px solid #1E293B;"><td style="padding: 10px 14px; color: #94A3B8;">Timestamp</td><td style="padding: 10px 14px;">${humanTimeStr}</td></tr>
          <tr style="border-bottom: 1px solid #1E293B;"><td style="padding: 10px 14px; color: #94A3B8;">Location Benchmark</td><td style="padding: 10px 14px;">${params.locationName || 'User coordinates'}</td></tr>
          <tr style="border-bottom: 1px solid #1E293B;"><td style="padding: 10px 14px; color: #94A3B8;">Latitude / Longitude</td><td style="padding: 10px 14px; font-family: monospace; color: #38BDF8;">${params.latitude ? params.latitude.toFixed(6) : '0'}, ${params.longitude ? params.longitude.toFixed(6) : '0'}</td></tr>
          <tr><td style="padding: 10px 14px; color: #94A3B8;">GPS Accuracy</td><td style="padding: 10px 14px; color: #10B981; font-weight: 500;">${accuracyStr}</td></tr>
        </table>

        <div style="margin: 24px 0;">
          <a href="${params.trackingUrl || '#'}" style="background: #DC2626; color: white; padding: 14px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; display: inline-block; margin-right: 12px; margin-bottom: 10px; box-shadow: 0 4px 14px rgba(220, 38, 38, 0.4);">
            🔴 Open Live GPS Tracking
          </a>
          <a href="https://www.google.com/maps?q=${params.latitude || 0},${params.longitude || 0}" style="background: #1E293B; color: #E2E8F0; padding: 14px 20px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block; border: 1px solid #334155;">
            📍 Google Maps Navigation
          </a>
        </div>

        <div style="background: #1E293B; border-left: 4px solid #F59E0B; padding: 14px; border-radius: 6px; margin: 20px 0;">
          <h4 style="margin: 0 0 8px 0; color: #F59E0B; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Trusted Contact Instructions</h4>
          <ol style="margin: 0; padding-left: 18px; color: #CBD5E1; font-size: 13px; line-height: 1.6;">
            <li>Attempt to contact the user immediately via direct voice call.</li>
            <li>Open the live GPS tracking link above to follow real-time breadcrumbs.</li>
            <li>If the user cannot be reached or indicates danger, notify emergency services (Police: 112) with the coordinates above.</li>
          </ol>
        </div>

        <p style="font-size: 12px; color: #64748B; margin-top: 24px; border-top: 1px solid #1E293B; padding-top: 14px; line-height: 1.5;">
          This alert was generated automatically by the NIRBHAYA AI Emergency Response Network. Notification dispatched to verified contact: <strong>${params.toEmail}</strong>.
        </p>
      </div>
    `;
  }

  // PRIORITY 1: SMTP Relay (Gmail, Outlook, Custom SMTP)
  if (host && user && pass) {
    try {
      console.log(`[Email Service] Dispatching email via SMTP (${host}:${port}) to ${params.toEmail}...`);
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });

      const smtpSender = host.includes('gmail.com') && user ? user : configuredFrom;

      const info = await transporter.sendMail({
        from: `NIRBHAYA AI <${smtpSender}>`,
        to: params.toEmail,
        subject,
        text: textBody,
        html: htmlBody,
      });

      console.log(`[Email Service] SMTP email accepted! MessageId: ${info.messageId}`);

      await db.execute(`
        INSERT INTO notifications (id, incident_id, recipient, type, status, provider, provider_message_id, error_message, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [notificationId, params.incidentId, params.toEmail, 'EMAIL', 'SENT', 'Gmail SMTP', info.messageId, null, timestampStr]);

      return {
        success: true,
        providerMessageId: info.messageId,
        provider: 'Gmail SMTP',
        response: info.response,
      };
    } catch (err: any) {
      const errMsg = err?.message || 'SMTP dispatch error';
      console.error('[Email Service] SMTP exception:', errMsg);

      await db.execute(`
        INSERT INTO notifications (id, incident_id, recipient, type, status, provider, provider_message_id, error_message, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [notificationId, params.incidentId, params.toEmail, 'EMAIL', 'FAILED', 'Gmail SMTP', null, errMsg, timestampStr]);

      return { success: false, error: errMsg, provider: 'Gmail SMTP' };
    }
  }

  // PRIORITY 2: Resend HTTP API (if SMTP is unconfigured)
  if (resendApiKey) {
    try {
      console.log(`[Email Service] Dispatching email via Resend to ${params.toEmail}...`);
      
      let fromAddress = configuredFrom;
      let res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [params.toEmail],
          subject,
          html: htmlBody,
          text: textBody,
        }),
      });

      let resData = await res.json() as any;

      if (!res.ok && resData.message && (resData.message.includes('domain') || resData.message.includes('verify')) && fromAddress !== 'NIRBHAYA AI <onboarding@resend.dev>') {
        console.warn(`[Email Service] Configured sender (${fromAddress}) not verified on Resend. Falling back to onboarding@resend.dev...`);
        fromAddress = 'NIRBHAYA AI <onboarding@resend.dev>';
        res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromAddress,
            to: [params.toEmail],
            subject,
            html: htmlBody,
            text: textBody,
          }),
        });
        resData = await res.json() as any;
      }

      if (!res.ok) {
        const errorMsg = resData.message || `Resend HTTP error ${res.status}`;
        console.error('[Email Service] Resend dispatch rejected:', errorMsg);

        await db.execute(`
          INSERT INTO notifications (id, incident_id, recipient, type, status, provider, provider_message_id, error_message, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [notificationId, params.incidentId, params.toEmail, 'EMAIL', 'FAILED', 'Resend', null, errorMsg, timestampStr]);

        return { success: false, error: errorMsg, provider: 'Resend' };
      }

      console.log(`[Email Service] Resend email accepted! ID: ${resData.id}`);

      await db.execute(`
        INSERT INTO notifications (id, incident_id, recipient, type, status, provider, provider_message_id, error_message, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [notificationId, params.incidentId, params.toEmail, 'EMAIL', 'SENT', 'Resend', resData.id, null, timestampStr]);

      return { success: true, providerMessageId: resData.id, provider: 'Resend' };
    } catch (err: any) {
      const errMsg = err?.message || 'Failed connecting to Resend API';
      console.error('[Email Service] Resend exception:', errMsg);

      await db.execute(`
        INSERT INTO notifications (id, incident_id, recipient, type, status, provider, provider_message_id, error_message, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [notificationId, params.incidentId, params.toEmail, 'EMAIL', 'FAILED', 'Resend', null, errMsg, timestampStr]);

      return { success: false, error: errMsg, provider: 'Resend' };
    }
  }

  // If no email provider is configured, fail honestly
  const unconfiguredMsg = 'Email credentials not configured in environment (SMTP_HOST, SMTP_USER, SMTP_PASS, or EMAIL_API_KEY).';
  console.warn(`[Email Service] Warning: ${unconfiguredMsg}`);

  await db.execute(`
    INSERT INTO notifications (id, incident_id, recipient, type, status, provider, provider_message_id, error_message, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [notificationId, params.incidentId, params.toEmail, 'EMAIL', 'FAILED', 'Email Gateway (Unconfigured)', null, unconfiguredMsg, timestampStr]);

  return {
    success: false,
    error: unconfiguredMsg,
    provider: 'Email Gateway (Unconfigured)',
  };
}
