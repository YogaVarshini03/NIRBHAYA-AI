import { Contact } from '../types';
import { storageService, StorageKeys } from './storageService';
import { apiUrl } from './apiConfig';

export const DEFAULT_CONTACTS: Contact[] = [
  {
    id: 'cnt_test_primary_01',
    name: 'Primary Emergency Guardian',
    relationship: 'Guardian',
    phone: '+91XXXXXXXXXX',
    online: true,
    notificationPreference: 'All Channels',
    verification_status: 'VERIFIED',
    priority_order: 1,
    isPrimary: true,
  },
  {
    id: 'cnt_1',
    name: 'Sunita Sharma',
    relationship: 'Mother',
    phone: '+91XXXXXXXXXX',
    online: true,
    notificationPreference: 'SMS & App',
    verification_status: 'PENDING',
    priority_order: 2,
  },
  {
    id: 'cnt_2',
    name: 'Rajesh Sharma',
    relationship: 'Father',
    phone: '+91XXXXXXXXXX',
    online: true,
    notificationPreference: 'Call Priority',
    verification_status: 'PENDING',
    priority_order: 3,
  },
];

function getStoredToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('nirbhaya_auth_token') || localStorage.getItem('nirbhaya_token');
  }
  return null;
}

export const contactService = {
  getContacts(): Contact[] {
    return storageService.getItem<Contact[]>(StorageKeys.CONTACTS, DEFAULT_CONTACTS);
  },

  async fetchContactsFromBackend(token?: string): Promise<Contact[]> {
    try {
      const activeToken = token || getStoredToken();
      const headers: Record<string, string> = {};
      if (activeToken) headers['Authorization'] = `Bearer ${activeToken}`;

      const res = await fetch(apiUrl('/api/contacts'), { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.contacts && Array.isArray(data.contacts)) {
          const mapped: Contact[] = data.contacts.map((c: any) => ({
            id: c.id,
            name: c.name,
            relationship: c.relationship || 'Guardian',
            phone: c.phone,
            online: true,
            notificationPreference: c.notification_preference || 'All Channels',
            verification_status: c.verification_status || 'PENDING',
            priority_order: c.priority_order || 1,
            isPrimary: Boolean(c.is_primary),
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

  async addContact(contact: Omit<Contact, 'id'>, token?: string): Promise<{ success: boolean; contact?: Contact; error?: string; consentMessage?: string }> {
    const list = this.getContacts();
    const phoneTrimmed = contact.phone.trim();
    if (list.some(c => c.phone.replace(/\D/g, '') === phoneTrimmed.replace(/\D/g, ''))) {
      return { success: false, error: 'A contact with this phone number already exists in your safety circle.' };
    }

    try {
      const activeToken = token || getStoredToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (activeToken) headers['Authorization'] = `Bearer ${activeToken}`;

      const res = await fetch(apiUrl('/api/contacts'), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: contact.name,
          phone: contact.phone,
          relationship: contact.relationship,
          notificationPreference: contact.notificationPreference,
          priorityOrder: contact.priority_order || list.length + 1,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.contact) {
          const newC: Contact = {
            id: data.contact.id,
            name: data.contact.name,
            relationship: data.contact.relationship || 'Guardian',
            phone: data.contact.phone,
            online: true,
            notificationPreference: data.contact.notification_preference || 'All Channels',
            verification_status: data.contact.verification_status || 'PENDING',
            priority_order: data.contact.priority_order || list.length + 1,
          };
          this.saveContacts([...list, newC]);
          return { success: true, contact: newC, consentMessage: data.consentMessage };
        }
      }
    } catch (err) {
      console.warn('[contactService] Backend error on addContact, saving locally:', err);
    }

    const newContact: Contact = {
      ...contact,
      id: `cnt_${Date.now()}`,
      online: true,
      verification_status: 'PENDING',
      priority_order: list.length + 1,
    };
    this.saveContacts([...list, newContact]);
    return { success: true, contact: newContact, consentMessage: 'Saved to local safety circle' };
  },

  async sendConsentSms(contactId: string): Promise<{ success: boolean; message?: string }> {
    try {
      const activeToken = getStoredToken();
      const headers: Record<string, string> = {};
      if (activeToken) headers['Authorization'] = `Bearer ${activeToken}`;

      const res = await fetch(apiUrl(`/api/contacts/${contactId}/send-consent`), {
        method: 'POST',
        headers,
      });
      const data = await res.json();
      return { success: data.success, message: data.message };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  },

  async verifyContact(contactId: string): Promise<{ success: boolean; message?: string }> {
    try {
      const activeToken = getStoredToken();
      const headers: Record<string, string> = {};
      if (activeToken) headers['Authorization'] = `Bearer ${activeToken}`;

      const res = await fetch(apiUrl(`/api/contacts/${contactId}/verify`), {
        method: 'POST',
        headers,
      });
      const data = await res.json();
      if (data.success) {
        const list = this.getContacts().map(c => c.id === contactId ? { ...c, verification_status: 'VERIFIED' as const } : c);
        this.saveContacts(list);
      }
      return { success: data.success, message: data.message };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  },

  async updateContact(id: string, updates: Partial<Contact>): Promise<boolean> {
    const list = this.getContacts();
    const idx = list.findIndex(c => c.id === id);
    if (idx === -1) return false;

    list[idx] = { ...list[idx], ...updates };
    this.saveContacts(list);

    try {
      const activeToken = getStoredToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (activeToken) headers['Authorization'] = `Bearer ${activeToken}`;

      await fetch(apiUrl(`/api/contacts/${id}`), {
        method: 'PUT',
        headers,
        body: JSON.stringify(updates),
      });
    } catch (err) {
      console.warn('[contactService] Backend error on updateContact:', err);
    }
    return true;
  },

  async deleteContact(id: string): Promise<boolean> {
    const list = this.getContacts().filter(c => c.id !== id);
    this.saveContacts(list);

    try {
      const activeToken = getStoredToken();
      const headers: Record<string, string> = {};
      if (activeToken) headers['Authorization'] = `Bearer ${activeToken}`;

      await fetch(apiUrl(`/api/contacts/${id}`), {
        method: 'DELETE',
        headers,
      });
    } catch (err) {
      console.warn('[contactService] Backend error on deleteContact:', err);
    }
    return true;
  },

  async sendTestAlert(contactId: string): Promise<{ success: boolean; smsStatus?: string }> {
    const contact = this.getContacts().find(c => c.id === contactId);
    if (!contact) return { success: false };
    return this.sendConsentSms(contactId);
  }
};
