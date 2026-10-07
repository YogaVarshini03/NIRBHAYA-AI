import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { formatE164Phone } from './smsService';

export interface OutboundVoiceParams {
  incidentId: string;
  toPhone: string;
  recipientName?: string;
  userName?: string;
  userPhone?: string;
  locationName?: string;
  language?: 'en' | 'ta';
  isPoliceCall?: boolean;
  isTestCall?: boolean;
}

export interface VoiceCallResult {
  success: boolean;
  status: 'INITIATED' | 'RINGING' | 'ANSWERED' | 'COMPLETED' | 'FAILED' | 'BLOCKED' | 'NOT CONFIGURED';
  callSid?: string;
  provider: string;
  error?: string;
  reason?: string;
  attempts: number;
  recipient: string;
}

/**
 * Initiates an automated outbound emergency voice call via Twilio Voice API
 * with multi-language TTS (Tamil `ta-IN` / English `en-IN`).
 */
export async function initiateEmergencyVoiceCall(params: OutboundVoiceParams): Promise<VoiceCallResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID || process.env.SMS_PROVIDER_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN || process.env.SMS_PROVIDER_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER || process.env.TWILIO_PHONE_NUMBER || process.env.SMS_FROM_NUMBER;

  let targetPhone = params.toPhone;
  let isRedirected = false;

  const isDemoMode = process.env.DEMO_MODE !== 'false';
  if (params.isPoliceCall && isDemoMode) {
    const demoNumber = process.env.DEMO_POLICE_NUMBER || process.env.DEMO_PHONE_NUMBER;
    if (demoNumber) {
      targetPhone = demoNumber;
      isRedirected = true;
    }
  }

  if (!targetPhone || targetPhone.trim() === '') {
    const errorMsg = 'No recipient phone number provided for voice call. Skipping call.';
    console.warn(`[Voice Service] ${errorMsg}`);
    return {
      success: false,
      status: 'FAILED',
      provider: 'Twilio Voice',
      error: errorMsg,
      attempts: 0,
      recipient: 'UNCONFIGURED',
    };
  }

  const formattedTo = formatE164Phone(targetPhone);
  const notificationId = `notif_voice_${uuidv4()}`;
  const now = new Date().toISOString();

  // Validate E.164 phone format
  const isValidPhone = /^\+[1-9]\d{9,14}$/.test(formattedTo);
  if (!isValidPhone) {
    const errorMsg = `Invalid recipient phone number (${params.toPhone}). Must be valid 10-digit or E.164 international format.`;
    await db.execute(`
      INSERT INTO notifications (id, incident_id, recipient, type, status, provider, provider_message_id, error_message, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [notificationId, params.incidentId, formattedTo, 'VOICE', 'FAILED', 'Twilio Voice', null, errorMsg, now]);

    return {
      success: false,
      status: 'FAILED',
      provider: 'Twilio Voice',
      error: errorMsg,
      attempts: 1,
      recipient: formattedTo,
    };
  }

  // 1. Check if voice is enabled via environment variable
  const isVoiceEnabled = process.env.TWILIO_VOICE_ENABLED !== 'false';
  if (!isVoiceEnabled) {
    const disabledReason = 'Voice disabled (trial limitation)';
    console.log(`[Voice Service] Voice calls disabled via TWILIO_VOICE_ENABLED=false. Skipping call to ${formattedTo}.`);

    await db.execute(`
      INSERT INTO notifications (id, incident_id, recipient, type, status, provider, provider_message_id, error_message, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [notificationId, params.incidentId, formattedTo, 'VOICE', 'BLOCKED', 'Twilio Voice (Disabled)', null, disabledReason, now]);

    return {
      success: false,
      status: 'BLOCKED',
      provider: 'Twilio Voice (Disabled)',
      error: disabledReason,
      reason: disabledReason,
      attempts: 0,
      recipient: formattedTo,
    };
  }

  const twimlUrl = process.env.TWILIO_VOICE_TWIML_URL;

  // Check credentials & TwiML configuration
  if (!accountSid || !authToken || !fromNumber) {
    const errorMsg = 'Twilio Voice credentials not configured in environment (.env).';
    console.warn(`[Voice Service] ${errorMsg}`);

    await db.execute(`
      INSERT INTO notifications (id, incident_id, recipient, type, status, provider, provider_message_id, error_message, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [notificationId, params.incidentId, formattedTo, 'VOICE', 'NOT CONFIGURED', 'Twilio Voice (Unconfigured)', null, errorMsg, now]);

    return {
      success: false,
      status: 'NOT CONFIGURED',
      provider: 'Twilio Voice (Unconfigured)',
      error: errorMsg,
      attempts: 0,
      recipient: formattedTo,
    };
  }

  if (!twimlUrl || twimlUrl.trim() === '') {
    const errorMsg = 'Twilio Voice TwiML URL not configured (TWILIO_VOICE_TWIML_URL is missing in .env). Please create a TwiML Bin in your Twilio Console and add TWILIO_VOICE_TWIML_URL to your .env file.';
    console.error(`[Voice Service] ${errorMsg}`);

    await db.execute(`
      INSERT INTO notifications (id, incident_id, recipient, type, status, provider, provider_message_id, error_message, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [notificationId, params.incidentId, formattedTo, 'VOICE', 'NOT CONFIGURED', 'Twilio Voice (No TwiML URL)', null, errorMsg, now]);

    return {
      success: false,
      status: 'NOT CONFIGURED',
      provider: 'Twilio Voice (No TwiML URL)',
      error: errorMsg,
      attempts: 0,
      recipient: formattedTo,
    };
  }

  try {
    console.log(`[Voice Service] Initiating Twilio Voice Call to ${formattedTo} using Url: ${twimlUrl}...`);

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`;
    const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    const formParams = new URLSearchParams();
    formParams.append('To', formattedTo);
    formParams.append('From', fromNumber);
    formParams.append('Url', twimlUrl.trim());

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formParams.toString(),
      signal: AbortSignal.timeout(12000),
    });

    const data = (await response.json()) as any;

    if (!response.ok) {
      const errMsg = data.message || `Twilio error code: ${data.code}`;
      const is573003 = data.code === 573003 || String(data.code) === '573003' || errMsg.includes('573003');
      const isTrialRestriction =
        is573003 ||
        errMsg.toLowerCase().includes('trial') ||
        errMsg.toLowerCase().includes('verified') ||
        data.code === 21210 ||
        data.code === 21214;

      const finalStatus: 'BLOCKED' | 'FAILED' = isTrialRestriction ? 'BLOCKED' : 'FAILED';
      let reason = errMsg;
      if (is573003) {
        reason = 'Blocked by Twilio trial (573003)';
      } else if (isTrialRestriction) {
        reason = 'Twilio Trial restriction: Voice calls can only be placed to verified phone numbers in your Twilio Console';
      }

      console.warn(`[Voice Service] Twilio call to ${formattedTo} rejected [${finalStatus}]:`, errMsg);

      await db.execute(`
        INSERT INTO notifications (id, incident_id, recipient, type, status, provider, provider_message_id, error_message, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [notificationId, params.incidentId, formattedTo, 'VOICE', finalStatus, 'Twilio Voice', null, errMsg, now]);

      return {
        success: false,
        status: finalStatus,
        error: errMsg,
        reason,
        provider: 'Twilio Voice',
        attempts: 1,
        recipient: formattedTo,
      };
    }

    console.log(`[Voice Service] Twilio Voice call initiated successfully! Call SID: ${data.sid}`);

    await db.execute(`
      INSERT INTO notifications (id, incident_id, recipient, type, status, provider, provider_message_id, error_message, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [notificationId, params.incidentId, formattedTo, 'VOICE', 'INITIATED', 'Twilio Voice', data.sid, null, now]);

    return {
      success: true,
      status: 'INITIATED',
      callSid: data.sid,
      provider: 'Twilio Voice',
      attempts: 1,
      recipient: formattedTo,
    };
  } catch (err: any) {
    const errMsg = err?.name === 'TimeoutError'
      ? 'Twilio Voice API connection timed out'
      : (err?.message || 'Network error initiating voice call');
    console.error(`[Voice Service] Error placing voice call to ${formattedTo}:`, err);

    await db.execute(`
      INSERT INTO notifications (id, incident_id, recipient, type, status, provider, provider_message_id, error_message, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [notificationId, params.incidentId, formattedTo, 'VOICE', 'FAILED', 'Twilio Voice', null, errMsg, now]);

    return {
      success: false,
      status: 'FAILED',
      provider: 'Twilio Voice',
      error: errMsg,
      attempts: 1,
      recipient: formattedTo,
    };
  }
}
