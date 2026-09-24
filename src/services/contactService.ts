import { Contact } from '../types';
import { storageService, StorageKeys } from './storageService';
import { apiUrl } from './apiConfig';

// Default contacts including the requested test recipient (9345596322 & saranyarajendran2612@gmail.com)
export const DEFAULT_CONTACTS: Contact[] = [
  {
    id: 'cnt_test_primary_01',
    name: 'Saranya R (Primary Test Guardian)',
    relationship: 'Guardian',
    phone: '9345596322',
    online: true,
    notificationPreference: 'All Channels',
  },
  {
    id: 'cnt_1',
    name: 'Sunita Sharma',
    relationship: 'Mother',
    phone: '+91 98765 11223',
    online: true,
    notificationPreference: 'SMS & App',
  },
  {
    id: 'cnt_2',
    name: 'Rajesh Sharma',
    relationship: 'Father',
    phone: '+91 98765 22334',
    online: true,
    notificationPreference: 'Call Priority',
  },
];

export const contactService = {
  getContacts(): Contact[] {
    return storageService.getItem<Contact[]>(StorageKeys.CONTACTS, DEFAULT_CONTACTS);
  },

  async fetchContactsFromBackend(token?: string): Promise<Contact[]> {
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(apiUrl('/api/contacts'), { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.contacts && data.contacts.length > 0) {
          const mapped: Contact[] = data.contacts.map((c: any) => ({
            id: c.id,
            name: c.name,
            relationship: c.relationship || 'Guardian',
            phone: c.phone,
            online: true,
            notificationPreference: c.notification_preference || 'All Channels',
          }));
          this.saveContacts(mapped);
          return mapped;
        }
      }
    } catch (err) {
      console.warn('[contactService] Backend unavailable, using local cache:', err);
    }
    return this.getContacts();
  },

  saveContacts(contacts: Contact[]): void {
    storageService.setItem(StorageKeys.CONTACTS, contacts);
  },

  async addContact(contact: Omit<Contact, 'id'>, token?: string): Promise<{ success: boolean; contact?: Contact; error?: string }> {
    const list = this.getContacts();
    const phoneTrimmed = contact.phone.trim();
    if (list.some(c => c.phone.replace(/\D/g, '') === phoneTrimmed.replace(/\D/g, ''))) {
      return { success: false, error: 'A contact with this phone number already exists.' };
    }

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(apiUrl('/api/contacts'), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: contact.name,
          phone: contact.phone,
          relationship: contact.relationship,
          notificationPreference: contact.notificationPreference,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const newContact: Contact = {
          id: data.contact.id,
          name: data.contact.name,
          relationship: data.contact.relationship,
          phone: data.contact.phone,
          online: true,
          notificationPreference: data.contact.notification_preference,
        };
        const updated = [newContact, ...list];
        this.saveContacts(updated);
        return { success: true, contact: newContact };
      }
    } catch (err) {
      console.warn('[contactService] Adding locally as fallback');
    }

    // Fallback local creation
    const newContact: Contact = {
      ...contact,
      id: `cnt_${Date.now()}`,
    };
    const updated = [newContact, ...list];
    this.saveContacts(updated);
    return { success: true, contact: newContact };
  },

  async updateContact(id: string, updates: Partial<Contact>, token?: string): Promise<boolean> {
    const list = this.getContacts();
    const index = list.findIndex(c => c.id === id);
    if (index === -1) return false;
    list[index] = { ...list[index], ...updates };
    this.saveContacts(list);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      await fetch(apiUrl(`/api/contacts/${id}`), {
        method: 'PUT',
        headers,
        body: JSON.stringify(updates),
      });
    } catch (err) {
      console.warn('[contactService] Remote update failed:', err);
    }

    return true;
  },

  async deleteContact(id: string, token?: string): Promise<boolean> {
    const list = this.getContacts();
    const filtered = list.filter(c => c.id !== id);
    this.saveContacts(filtered);

    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      await fetch(apiUrl(`/api/contacts/${id}`), {
        method: 'DELETE',
        headers,
      });
    } catch (err) {
      console.warn('[contactService] Remote delete failed:', err);
    }

    return true;
  },

  async sendTestAlert(contactId: string, token?: string): Promise<{ success: boolean; smsStatus: string; emailStatus: string; message: string }> {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(apiUrl(`/api/contacts/${contactId}/test-alert`), {
        method: 'POST',
        headers,
      });

      if (res.ok) {
        const data = await res.json();
        return {
          success: data.sms?.success || data.email?.success || false,
          smsStatus: data.sms?.success ? 'Delivered' : (data.sms?.error ? `Failed (${data.sms.error})` : 'Unconfigured'),
          emailStatus: data.email?.success ? 'Delivered' : (data.email?.error ? `Failed (${data.email.error})` : 'Unconfigured'),
          message: data.message || 'Test alert dispatched to gateway',
        };
      }
    } catch (err: any) {
      console.error('[contactService] Test alert network error:', err);
    }

    return {
      success: false,
      smsStatus: 'Failed (Backend connection offline)',
      emailStatus: 'Failed (Backend connection offline)',
      message: 'Failed to reach alert server',
    };
  }
};
