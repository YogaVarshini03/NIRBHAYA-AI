import { Router, Request, Response } from 'express';
import { db } from '../db';
import { authenticateToken } from './auth';
import { sendEmergencySms, formatE164Phone } from '../services/smsService';
import { v4 as uuidv4 } from 'uuid';

export const contactsRouter = Router();

// GET /api/contacts - List all contacts for user
contactsRouter.get('/', authenticateToken, async (req: Request, res: Response) => {
  const user = (req as any).user;
  try {
    const contacts = await db.query(`
      SELECT id, user_id, name, phone, email, relationship, is_primary, notification_preference,
             verification_status, priority_order, consent_token, created_at, updated_at
      FROM trusted_contacts
      WHERE user_id = ?
      ORDER BY priority_order ASC, is_primary DESC, created_at DESC
    `, [user.id]);

    return res.json({ success: true, contacts });
  } catch (err: any) {
    console.error('[Contacts API] Error fetching contacts:', err);
    return res.status(500).json({ success: false, error: 'Database error reading contacts.' });
  }
});

// POST /api/contacts - Add new contact & trigger consent SMS
contactsRouter.post('/', authenticateToken, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { name, phone, email, relationship, notificationPreference, priorityOrder } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ success: false, error: 'Name and phone number are required.' });
  }

  const cleanPhone = phone.trim().replace(/\D/g, '');
  if (cleanPhone.length < 10) {
    return res.status(400).json({ success: false, error: 'Please enter a valid 10-digit phone number.' });
  }

  const formattedPhone = formatE164Phone(phone);

  try {
    // Check duplicate
    const existing = await db.queryOne('SELECT id FROM trusted_contacts WHERE user_id = ? AND phone LIKE ?', [user.id, `%${cleanPhone.slice(-10)}`]);
    if (existing) {
      return res.status(409).json({ success: false, error: 'A contact with this phone number already exists in your safety circle.' });
    }

    const contactId = `cnt_${uuidv4()}`;
    const consentToken = `cns_${uuidv4().substring(0, 8)}`;
    const now = new Date().toISOString();
    const order = priorityOrder ? parseInt(priorityOrder, 10) : 1;

    await db.execute(`
      INSERT INTO trusted_contacts (
        id, user_id, name, phone, email, relationship, is_primary,
        notification_preference, verification_status, priority_order, consent_token, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?, ?)
    `, [
      contactId,
      user.id,
      name.trim(),
      formattedPhone,
      email ? email.trim().toLowerCase() : 'guardian@nirbhaya.ai',
      relationship || 'Guardian',
      0,
      notificationPreference || 'SMS & App',
      order,
      consentToken,
      now,
      now
    ]);

    // Send Consent SMS via Twilio
    const userRecord = await db.queryOne<any>('SELECT name FROM users WHERE id = ?', [user.id]);
    const senderName = userRecord?.name || 'A family member';

    const consentResult = await sendEmergencySms({
      incidentId: `consent_${contactId}`,
      toPhone: formattedPhone,
      userName: senderName,
      messageType: 'CONSENT_REQUEST',
    });

    const newContact = await db.queryOne('SELECT * FROM trusted_contacts WHERE id = ?', [contactId]);
    return res.status(201).json({
      success: true,
      contact: newContact,
      consentSent: consentResult.success,
      consentStatus: consentResult.status,
      consentMessage: consentResult.success
        ? 'Consent SMS dispatched to contact'
        : (consentResult.reason || consentResult.error || 'Failed to dispatch consent SMS')
    });
  } catch (err: any) {
    console.error('[Contacts API] Error creating contact:', err);
    return res.status(500).json({ success: false, error: 'Failed to save contact to database.' });
  }
});

// POST /api/contacts/:id/send-consent - Resend consent request SMS
contactsRouter.post('/:id/send-consent', authenticateToken, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;

  try {
    const contact = await db.queryOne<any>('SELECT * FROM trusted_contacts WHERE id = ? AND user_id = ?', [id, user.id]);
    if (!contact) {
      return res.status(404).json({ success: false, error: 'Contact not found.' });
    }

    const userRecord = await db.queryOne<any>('SELECT name FROM users WHERE id = ?', [user.id]);
    const senderName = userRecord?.name || 'A family member';

    const consentResult = await sendEmergencySms({
      incidentId: `consent_${contact.id}`,
      toPhone: contact.phone,
      userName: senderName,
      messageType: 'CONSENT_REQUEST',
    });

    return res.json({
      success: consentResult.success,
      status: consentResult.status,
      message: consentResult.success
        ? `Consent SMS sent to ${contact.name}`
        : (consentResult.reason || consentResult.error || 'Failed to dispatch SMS')
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/contacts/:id/verify - Confirm verification (testing / manual confirmation)
contactsRouter.post('/:id/verify', authenticateToken, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;

  try {
    const contact = await db.queryOne<any>('SELECT * FROM trusted_contacts WHERE id = ? AND user_id = ?', [id, user.id]);
    if (!contact) {
      return res.status(404).json({ success: false, error: 'Contact not found.' });
    }

    const now = new Date().toISOString();
    await db.execute("UPDATE trusted_contacts SET verification_status = 'VERIFIED', updated_at = ? WHERE id = ?", [now, id]);

    const updated = await db.queryOne('SELECT * FROM trusted_contacts WHERE id = ?', [id]);
    return res.json({ success: true, message: `${contact.name} verified successfully.`, contact: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/contacts/:id - Update contact details / priority order
contactsRouter.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, phone, email, relationship, notificationPreference, isPrimary, verificationStatus, priorityOrder } = req.body;

  try {
    const existing = await db.queryOne('SELECT id FROM trusted_contacts WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Contact not found.' });
    }

    const formattedPhone = phone ? formatE164Phone(phone) : null;

    await db.execute(`
      UPDATE trusted_contacts
      SET name = COALESCE(?, name),
          phone = COALESCE(?, phone),
          email = COALESCE(?, email),
          relationship = COALESCE(?, relationship),
          notification_preference = COALESCE(?, notification_preference),
          is_primary = COALESCE(?, is_primary),
          verification_status = COALESCE(?, verification_status),
          priority_order = COALESCE(?, priority_order),
          updated_at = ?
      WHERE id = ?
    `, [
      name || null,
      formattedPhone,
      email || null,
      relationship || null,
      notificationPreference || null,
      isPrimary !== undefined ? (isPrimary ? 1 : 0) : null,
      verificationStatus || null,
      priorityOrder !== undefined ? parseInt(priorityOrder, 10) : null,
      new Date().toISOString(),
      id
    ]);

    const updated = await db.queryOne('SELECT * FROM trusted_contacts WHERE id = ?', [id]);
    return res.json({ success: true, contact: updated });
  } catch (err: any) {
    console.error('[Contacts API] Error updating contact:', err);
    return res.status(500).json({ success: false, error: 'Failed to update contact.' });
  }
});

// DELETE /api/contacts/:id - Remove contact
contactsRouter.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await db.execute('DELETE FROM trusted_contacts WHERE id = ?', [id]);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Contact not found.' });
    }
    return res.json({ success: true, message: 'Contact removed from safety network.' });
  } catch (err: any) {
    console.error('[Contacts API] Error deleting contact:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete contact.' });
  }
});
