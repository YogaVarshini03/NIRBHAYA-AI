import { Router, Request, Response } from 'express';
import { db } from '../db';
import { authenticateToken } from './auth';
import { sendEmergencySms } from '../services/smsService';
import { sendEmergencyEmail } from '../services/emailService';
import { v4 as uuidv4 } from 'uuid';

export const contactsRouter = Router();

// GET /api/contacts
contactsRouter.get('/', authenticateToken, (req: Request, res: Response) => {
  const user = (req as any).user;
  try {
    const contacts = db.prepare(`
      SELECT id, name, phone, email, relationship, is_primary, notification_preference, created_at, updated_at
      FROM trusted_contacts
      WHERE user_id = ?
      ORDER BY is_primary DESC, created_at DESC
    `).all(user.id);

    return res.json({ success: true, contacts });
  } catch (err: any) {
    console.error('[Contacts API] Error fetching contacts:', err);
    return res.status(500).json({ success: false, error: 'Database error reading contacts.' });
  }
});

// POST /api/contacts
contactsRouter.post('/', authenticateToken, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { name, phone, email, relationship, notificationPreference } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ success: false, error: 'Name and phone number are required.' });
  }

  const cleanPhone = phone.trim().replace(/\D/g, '');
  if (cleanPhone.length < 10) {
    return res.status(400).json({ success: false, error: 'Please enter a valid 10-digit phone number.' });
  }

  try {
    // Check duplicate
    const existing = db.prepare('SELECT id FROM trusted_contacts WHERE user_id = ? AND phone LIKE ?').get(user.id, `%${cleanPhone.slice(-10)}`);
    if (existing) {
      return res.status(409).json({ success: false, error: 'A contact with this phone number already exists.' });
    }

    const contactId = `cnt_${uuidv4()}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO trusted_contacts (id, user_id, name, phone, email, relationship, is_primary, notification_preference, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      contactId,
      user.id,
      name.trim(),
      phone.trim(),
      email ? email.trim().toLowerCase() : 'contact@family.com',
      relationship || 'Guardian',
      0,
      notificationPreference || 'SMS & App',
      now,
      now
    );

    const newContact = db.prepare('SELECT * FROM trusted_contacts WHERE id = ?').get(contactId);
    return res.status(201).json({ success: true, contact: newContact });
  } catch (err: any) {
    console.error('[Contacts API] Error creating contact:', err);
    return res.status(500).json({ success: false, error: 'Failed to save contact to database.' });
  }
});

// PUT /api/contacts/:id
contactsRouter.put('/:id', authenticateToken, (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, phone, email, relationship, notificationPreference, isPrimary } = req.body;

  try {
    const existing = db.prepare('SELECT id FROM trusted_contacts WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Contact not found.' });
    }

    db.prepare(`
      UPDATE trusted_contacts
      SET name = COALESCE(?, name),
          phone = COALESCE(?, phone),
          email = COALESCE(?, email),
          relationship = COALESCE(?, relationship),
          notification_preference = COALESCE(?, notification_preference),
          is_primary = COALESCE(?, is_primary),
          updated_at = ?
      WHERE id = ?
    `).run(
      name || null,
      phone || null,
      email || null,
      relationship || null,
      notificationPreference || null,
      isPrimary !== undefined ? (isPrimary ? 1 : 0) : null,
      new Date().toISOString(),
      id
    );

    const updated = db.prepare('SELECT * FROM trusted_contacts WHERE id = ?').get(id);
    return res.json({ success: true, contact: updated });
  } catch (err: any) {
    console.error('[Contacts API] Error updating contact:', err);
    return res.status(500).json({ success: false, error: 'Failed to update contact.' });
  }
});

// DELETE /api/contacts/:id
contactsRouter.delete('/:id', authenticateToken, (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = db.prepare('DELETE FROM trusted_contacts WHERE id = ?').run(id);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Contact not found.' });
    }
    return res.json({ success: true, message: 'Contact successfully deleted.' });
  } catch (err: any) {
    console.error('[Contacts API] Error deleting contact:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete contact.' });
  }
});

// POST /api/contacts/:id/test-alert
contactsRouter.post('/:id/test-alert', authenticateToken, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const contact = db.prepare('SELECT * FROM trusted_contacts WHERE id = ?').get(id) as any;
    if (!contact) {
      return res.status(404).json({ success: false, error: 'Contact not found.' });
    }

    const testIncidentCode = `TEST-${Math.floor(1000 + Math.random() * 9000)}`;

    // Try real SMS
    const smsResult = await sendEmergencySms({
      incidentId: 'test_drill',
      toPhone: contact.phone,
      incidentCode: testIncidentCode,
      locationName: 'Simulated User Location (Test Alert Drill)',
      latitude: 28.6315,
      longitude: 77.2167,
      trackingUrl: `${req.protocol}://${req.get('host')}/live-tracking?drill=true`
    });

    // Try real Email if email exists
    let emailResult = { success: false, error: 'No email specified' };
    if (contact.email) {
      emailResult = await sendEmergencyEmail({
        incidentId: 'test_drill',
        toEmail: contact.email,
        incidentCode: testIncidentCode,
        locationName: 'Designated Test Location (Manual Contact Drill)',
        latitude: 28.6315,
        longitude: 77.2167,
        accuracy: 12,
        emergencyStatus: 'TEST DRILL ALERT',
        trackingUrl: `${req.protocol}://${req.get('host')}/live-tracking?drill=true`,
        isDemo: true,
      });
    }

    return res.json({
      success: true,
      message: 'Test alert initiated.',
      contactName: contact.name,
      sms: smsResult,
      email: emailResult,
    });
  } catch (err: any) {
    console.error('[Contacts API] Test alert error:', err);
    return res.status(500).json({ success: false, error: 'Failed to execute test alert.' });
  }
});
