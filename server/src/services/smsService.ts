import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';

export interface SendSmsParams {
  incidentId: string;
  toPhone: string;
  incidentCode: string;
  locationName: string;
  latitude: number;
  longitude: number;
  trackingUrl: string;
}

export interface SmsResult {
  success: boolean;
  providerMessageId?: string;
  error?: string;
  provider: string;
}

export async function sendEmergencySms(params: SendSmsParams): Promise<SmsResult> {
  const accountSid = process.env.SMS_PROVIDER_ACCOUNT_SID;
  const authToken = process.env.SMS_PROVIDER_AUTH_TOKEN;
  const fromNumber = process.env.SMS_FROM_NUMBER;

  // Format recipient number (default to +91 if Indian 10-digit number)
  let formattedTo = params.toPhone.trim();
  if (/^\d{10}$/.test(formattedTo)) {
    formattedTo = `+91${formattedTo}`;
  } else if (!formattedTo.startsWith('+')) {
    formattedTo = `+${formattedTo}`;
  }

  // Validate E.164 phone format
  const isValidPhone = /^\+[1-9]\d{9,14}$/.test(formattedTo);
  if (!isValidPhone) {
    const errorMsg = `Invalid phone number format (${params.toPhone}). Must be a valid 10-digit or E.164 international phone number.`;
    return {
      success: false,
      error: errorMsg,
      provider: 'Twilio (Validation Error)',
    };
  }

  // Concise message format strictly conforming to Rule 8
  const messageBody = 
`NIRBHAYA AI Emergency Alert
SOS activated.
Incident: ${params.incidentCode}
Time: ${new Date().toLocaleTimeString()}
Location: ${params.locationName}
Live tracking: ${params.trackingUrl}`;

  const notificationId = `notif_sms_${uuidv4()}`;

  // Check if real provider credentials are configured
  if (!accountSid || !authToken || !fromNumber) {
    const errorMsg = 'Twilio SMS credentials not set in environment (SMS_PROVIDER_ACCOUNT_SID, SMS_PROVIDER_AUTH_TOKEN, SMS_FROM_NUMBER).';
    console.warn(`[SMS Service] Warning: ${errorMsg}`);

    // Persist as FAILED in database (Rule 39: Never pretend success)
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
      new Date().toISOString()
    ]);

    return {
      success: false,
      error: errorMsg,
      provider: 'Twilio (Unconfigured)',
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
    });

    const data = await response.json() as any;

    if (!response.ok) {
      const errMsg = data.message || `Twilio error code: ${data.code}`;
      console.error(`[SMS Service] Twilio request rejected:`, errMsg);

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
        new Date().toISOString()
      ]);

      return {
        success: false,
        error: errMsg,
        provider: 'Twilio',
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
      new Date().toISOString()
    ]);

    return {
      success: true,
      providerMessageId: data.sid,
      provider: 'Twilio',
    };
  } catch (err: any) {
    const errMsg = err?.message || 'Network error communicating with SMS gateway';
    console.error(`[SMS Service] Exception sending SMS:`, err);

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
      new Date().toISOString()
    ]);

    return {
      success: false,
      error: errMsg,
      provider: 'Twilio',
    };
  }
}
