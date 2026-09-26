import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';

export interface OutboundVoiceParams {
  incidentId: string;
  toPhone: string;
  recipientName?: string;
  userName?: string;
  locationName?: string;
  trackingUrl?: string;
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
}

/**
 * Format phone number to international E.164 format.
 * Defaults 10-digit Indian numbers to +91.
 */
export function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/[\s\-\(\)]/g, '').trim();
  if (/^\d{10}$/.test(cleaned)) {
    return `+91${cleaned}`;
  }
  if (!cleaned.startsWith('+')) {
    return `+${cleaned}`;
  }
  return cleaned;
}

/**
 * Initiates a real outbound voice call via Twilio Voice API.
 * Includes automatic retry (maximum 2 attempts) on transient failure.
 * Honestly logs the provider response and error message.
 */
export async function initiateEmergencyVoiceCall(params: OutboundVoiceParams): Promise<VoiceCallResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID || process.env.SMS_PROVIDER_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN || process.env.SMS_PROVIDER_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER || process.env.SMS_FROM_NUMBER;

  const formattedTo = formatPhoneNumber(params.toPhone);
  const notificationId = `notif_voice_${uuidv4()}`;
  const now = new Date().toISOString();

  // Validate E.164 phone format
  const isValidPhone = /^\+[1-9]\d{9,14}$/.test(formattedTo);
  if (!isValidPhone) {
    const errorMsg = `Invalid recipient phone number format (${params.toPhone}). Must be a valid 10-digit or E.164 phone number.`;
    await db.execute(`
      INSERT INTO notifications (id, incident_id, recipient, type, status, provider, provider_message_id, error_message, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [notificationId, params.incidentId, formattedTo, 'VOICE', 'FAILED', 'Twilio Voice (Validation)', null, errorMsg, now]);

    return {
      success: false,
      status: 'FAILED',
      provider: 'Twilio Voice',
      error: errorMsg,
      attempts: 1,
    };
  }

  // Check if Twilio Voice API credentials are configured
  if (!accountSid || !authToken || !fromNumber) {
    const errorMsg = 'Twilio Voice credentials not configured in environment (SMS_PROVIDER_ACCOUNT_SID / TWILIO_ACCOUNT_SID, AUTH_TOKEN, FROM_NUMBER).';
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
    };
  }

  const callerName = params.userName || 'Registered User';
  const locationInfo = params.locationName ? ` near ${params.locationName}` : '';
  
  // High-clarity TwiML emergency message strictly conforming to section 8
  const twimlMessage = `
    <Response>
      <Pause length="1"/>
      <Say voice="alice" language="en-IN">
        Emergency alert from Nirbhaya A.I. An emergency has been detected for the registered user ${callerName}${locationInfo}. Please check the user's current live location immediately.
      </Say>
      <Pause length="2"/>
      <Say voice="alice" language="en-IN">
        Repeating. Emergency alert from Nirbhaya A.I. An emergency has been detected for ${callerName}. Please check the user's current location immediately.
      </Say>
      <Pause length="1"/>
    </Response>
  `.trim();

  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`;
  const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  // Configurable retry logic: max 2 attempts (Rule 9)
  let lastError = '';
  let isBlocked = false;
  let blockReason = '';

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      console.log(`[Voice Service] Initiating real outbound call to ${formattedTo} via Twilio Voice (Attempt ${attempt}/2)...`);

      const formParams = new URLSearchParams();
      formParams.append('To', formattedTo);
      formParams.append('From', fromNumber);
      formParams.append('Twiml', twimlMessage);

      const response = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formParams.toString(),
        signal: AbortSignal.timeout(12000), // 12s timeout
      });

      const data = await response.json() as any;

      if (!response.ok) {
        const errMsg = data.message || `Twilio error code: ${data.code}`;
        console.warn(`[Voice Service] Attempt ${attempt} failed: ${errMsg}`);

        // Check for trial account caller ID restriction (e.g. 21215: unverified caller ID in trial)
        if (
          errMsg.toLowerCase().includes('trial') ||
          errMsg.toLowerCase().includes('unverified') ||
          data.code === 21215 ||
          data.code === 21608
        ) {
          isBlocked = true;
          blockReason = `Twilio Trial account restriction: Recipient ${formattedTo} is unverified. Upgrade Twilio account or verify caller ID in Twilio Console.`;
          lastError = blockReason;
          break; // Don't retry if account restriction is permanent
        }

        lastError = errMsg;
        if (attempt === 1) {
          // Wait 1 second before retry
          await new Promise((res) => setTimeout(res, 1000));
          continue;
        }
      } else {
        // Successful call initiation
        console.log(`[Voice Service] Outbound call successfully queued/initiated! Call SID: ${data.sid}, Status: ${data.status}`);

        const callStatus = (data.status || 'INITIATED').toUpperCase();

        await db.execute(`
          INSERT INTO notifications (id, incident_id, recipient, type, status, provider, provider_message_id, error_message, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          notificationId,
          params.incidentId,
          formattedTo,
          'VOICE',
          'INITIATED',
          'Twilio Voice',
          data.sid,
          null,
          now
        ]);

        return {
          success: true,
          status: 'INITIATED',
          callSid: data.sid,
          provider: 'Twilio Voice',
          attempts: attempt,
        };
      }
    } catch (err: any) {
      lastError = err?.name === 'TimeoutError'
        ? 'Twilio Voice API connection timed out after 12s'
        : (err?.message || 'Network error communicating with Twilio Voice gateway');
      console.error(`[Voice Service] Attempt ${attempt} exception:`, err);

      if (attempt === 1) {
        await new Promise((res) => setTimeout(res, 1000));
      }
    }
  }

  // If we reach here, both attempts failed or trial blocked
  const finalStatus = isBlocked ? 'BLOCKED' : 'FAILED';
  console.warn(`[Voice Service] Voice call dispatch concluded with status: ${finalStatus}. Error: ${lastError}`);

  await db.execute(`
    INSERT INTO notifications (id, incident_id, recipient, type, status, provider, provider_message_id, error_message, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    notificationId,
    params.incidentId,
    formattedTo,
    'VOICE',
    finalStatus,
    'Twilio Voice',
    null,
    lastError,
    now
  ]);

  return {
    success: false,
    status: finalStatus,
    provider: 'Twilio Voice',
    error: lastError,
    reason: isBlocked ? blockReason : undefined,
    attempts: 2,
  };
}

/**
 * Checks call status from Twilio REST API if callSid is known.
 */
export async function checkCallStatus(callSid: string): Promise<{ status: string; duration?: number; error?: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID || process.env.SMS_PROVIDER_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN || process.env.SMS_PROVIDER_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    return { status: 'NOT CONFIGURED', error: 'Twilio credentials not configured' };
  }

  try {
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls/${callSid}.json`;
    const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    const res = await fetch(twilioUrl, {
      headers: {
        'Authorization': `Basic ${basicAuth}`,
      },
    });

    if (!res.ok) {
      return { status: 'UNKNOWN', error: 'Failed to retrieve call status' };
    }

    const data = await res.json() as any;
    return {
      status: (data.status || 'UNKNOWN').toUpperCase(),
      duration: data.duration ? parseInt(data.duration, 10) : undefined,
    };
  } catch (err: any) {
    return { status: 'UNKNOWN', error: err.message };
  }
}
