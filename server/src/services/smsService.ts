import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';

export interface SendSmsParams {
  incidentId: string;
  toPhone: string;
  incidentCode?: string;
  userName?: string;
  userPhone?: string;
  locationName?: string;
  latitude?: number;
  longitude?: number;
  trackingUrl?: string;
  batteryLevel?: number;
  messageType?: 'EMERGENCY_SOS' | 'CONSENT_REQUEST' | 'FALSE_ALARM' | 'POLICE_DISPATCH';
  customBody?: string;
  isDemoPoliceRedirect?: boolean;
}

export interface SmsResult {
  success: boolean;
  status: 'SENT' | 'BLOCKED' | 'FAILED';
  providerMessageId?: string;
  error?: string;
  reason?: string;
  provider: string;
  recipient: string;
}

export function formatE164Phone(phone: string): string {
  let cleaned = phone.replace(/[\s\-\(\)]/g, '').trim();
  if (/^\d{10}$/.test(cleaned)) {
    return `+91${cleaned}`;
  }
  if (!cleaned.startsWith('+')) {
    return `+${cleaned}`;
  }
  return cleaned;
}

export async function sendEmergencySms(params: SendSmsParams): Promise<SmsResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID || process.env.SMS_PROVIDER_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN || process.env.SMS_PROVIDER_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER || process.env.TWILIO_PHONE_NUMBER || process.env.SMS_FROM_NUMBER;

  let targetPhone = params.toPhone;
  let isRedirected = false;

  const isDemoMode = process.env.DEMO_MODE !== 'false';
  if (params.messageType === 'POLICE_DISPATCH' && isDemoMode) {
    const demoNumber = process.env.DEMO_POLICE_NUMBER || process.env.DEMO_PHONE_NUMBER;
    if (demoNumber) {
      targetPhone = demoNumber;
      isRedirected = true;
    }
  }

  if (!targetPhone || targetPhone.trim() === '') {
    const errorMsg = 'No recipient phone number provided for SMS. Skipping SMS delivery.';
    console.warn(`[SMS Service] ${errorMsg}`);
    return {
      success: false,
      status: 'FAILED',
      provider: 'Twilio SMS',
      error: errorMsg,
      attempts: 0,
      recipient: 'UNCONFIGURED',
    };
  }

  const formattedTo = formatE164Phone(targetPhone);
  const notificationId = `notif_sms_${uuidv4()}`;
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const userName = params.userName || 'NIRBHAYA AI User';
  const batteryStr = params.batteryLevel !== undefined ? `${params.batteryLevel}%` : '85%';
  const trackingLink = params.trackingUrl
    ? (params.trackingUrl.startsWith('http') ? params.trackingUrl : `${process.env.APP_BASE_URL || 'http://localhost:5173'}${params.trackingUrl}`)
    : `${process.env.APP_BASE_URL || 'http://localhost:5173'}/track/trk_${params.incidentId}`;

  // Build message text based on messageType
  let messageBody = '';
  if (params.customBody) {
    messageBody = params.customBody;
  } else if (params.messageType === 'CONSENT_REQUEST') {
    messageBody = `${userName} added you as an emergency contact on NIRBHAYA AI. Reply YES to accept or verify in app.`;
  } else if (params.messageType === 'FALSE_ALARM') {
    messageBody = `NIRBHAYA AI: SOS Alert from ${userName} was CANCELLED with security PIN. User is safe. No further emergency action required.`;
  } else if (params.messageType === 'POLICE_DISPATCH') {
    const prefix = isRedirected ? '[DEMO MODE: Police Alert Redirected]\n' : '';
    const loc = params.locationName || `${params.latitude?.toFixed(4)}, ${params.longitude?.toFixed(4)}`;
    messageBody = `${prefix}Emergency alert via NIRBHAYA AI. A woman named ${userName}, phone ${params.userPhone || 'Registered User'}, has triggered SOS at ${loc}. Live location: ${trackingLink}. Please respond.`;
  } else {
    // Default Phase 1 Emergency Contact SOS SMS format
    messageBody = `EMERGENCY! ${userName} needs help. Live location: ${trackingLink}. Time: ${timeStr}. Battery: ${batteryStr}.`;
  }

  // Validate E.164 phone format
  const isValidPhone = /^\+[1-9]\d{9,14}$/.test(formattedTo);
  if (!isValidPhone) {
    const errorMsg = `Invalid phone number (${params.toPhone}). Must be valid 10-digit or E.164 international format.`;
    return {
      success: false,
      status: 'FAILED',
      error: errorMsg,
      provider: 'Twilio (Validation Error)',
      recipient: formattedTo,
    };
  }

  // Check if real provider credentials are configured
  if (!accountSid || !authToken || !fromNumber) {
    const errorMsg = 'Twilio credentials not configured in environment (.env).';
    console.warn(`[SMS Service] ${errorMsg}`);

    await db.execute(`
      INSERT INTO notifications (id, incident_id, recipient, type, status, provider, provider_message_id, error_message, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      notificationId,
      params.incidentId,
      formattedTo,
      'SMS',
      'FAILED',
      'Twilio-Gateway',
      null,
      errorMsg,
      now.toISOString()
    ]);

    return {
      success: false,
      status: 'FAILED',
      error: errorMsg,
      provider: 'Twilio (Unconfigured)',
      recipient: formattedTo,
    };
  }

  try {
    console.log(`[SMS Service] Dispatching real SMS via Twilio to ${formattedTo}...`);

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    const formParams = new URLSearchParams();
    formParams.append('To', formattedTo);
    formParams.append('From', fromNumber);
    formParams.append('Body', messageBody);

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formParams.toString(),
      signal: AbortSignal.timeout(10000),
    });

    const data = (await response.json()) as any;

    if (!response.ok) {
      const errMsg = data.message || `Twilio error code: ${data.code}`;
      const isTrialRestriction =
        errMsg.toLowerCase().includes('trial') ||
        errMsg.toLowerCase().includes('verified') ||
        errMsg.toLowerCase().includes('template') ||
        data.code === 21614 ||
        data.code === 21608;

      const finalStatus: 'BLOCKED' | 'FAILED' = isTrialRestriction ? 'BLOCKED' : 'FAILED';
      const reason = isTrialRestriction
        ? 'Twilio Trial limitation: Recipient number must be verified in Twilio Console (Verified Caller IDs)'
        : errMsg;

      console.warn(`[SMS Service] Twilio rejected SMS to ${formattedTo} [${finalStatus}]:`, errMsg);

      await db.execute(`
        INSERT INTO notifications (id, incident_id, recipient, type, status, provider, provider_message_id, error_message, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        notificationId,
        params.incidentId,
        formattedTo,
        'SMS',
        finalStatus,
        'Twilio',
        null,
        errMsg,
        now.toISOString()
      ]);

      return {
        success: false,
        status: finalStatus,
        error: errMsg,
        reason,
        provider: 'Twilio',
        recipient: formattedTo,
      };
    }

    console.log(`[SMS Service] Twilio SMS successfully accepted! SID: ${data.sid}`);

    await db.execute(`
      INSERT INTO notifications (id, incident_id, recipient, type, status, provider, provider_message_id, error_message, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      notificationId,
      params.incidentId,
      formattedTo,
      'SMS',
      'SENT',
      'Twilio',
      data.sid,
      null,
      now.toISOString()
    ]);

    return {
      success: true,
      status: 'SENT',
      providerMessageId: data.sid,
      provider: 'Twilio',
      recipient: formattedTo,
    };
  } catch (err: any) {
    const errMsg = err?.name === 'TimeoutError'
      ? 'Twilio API request timed out after 10s'
      : (err?.message || 'Network error communicating with SMS gateway');
    console.error(`[SMS Service] Exception sending SMS to ${formattedTo}:`, err);

    await db.execute(`
      INSERT INTO notifications (id, incident_id, recipient, type, status, provider, provider_message_id, error_message, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      notificationId,
      params.incidentId,
      formattedTo,
      'SMS',
      'FAILED',
      'Twilio',
      null,
      errMsg,
      now.toISOString()
    ]);

    return {
      success: false,
      status: 'FAILED',
      error: errMsg,
      provider: 'Twilio',
      recipient: formattedTo,
    };
  }
}
