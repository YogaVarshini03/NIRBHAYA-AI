import { Contact } from '../types';
import { storageService, StorageKeys } from './storageService';
import { apiUrl, safeFetchJson } from './apiConfig';

export const DEFAULT_CONTACTS: Contact[] = [];

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

      const res = await safeFetchJson<{ contacts: any[] }>('/api/contacts', { headers });
      if (res.ok && res.data?.contacts && Array.isArray(res.data.contacts)) {
        const mapped: Contact[] = res.data.contacts.map((c: any) => ({
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
    const phoneTrimmed = contact.phone.trim().replace(/[\s\-\(\)]/g, '');

    // Validate country code
    if (!/^\+[1-9]\d{6,14}$/.test(phoneTrimmed)) {
      return {
        success: false,
        error: 'Phone number must include country code in E.164 format (e.g. +91XXXXXXXXXX).'
      };
    }

    if (list.some(c => c.phone.replace(/[\s\-\(\)]/g, '') === phoneTrimmed)) {
      return { success: false, error: 'A contact with this phone number already exists in your safety circle.' };
    }

    const activeToken = token || getStoredToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (activeToken) headers['Authorization'] = `Bearer ${activeToken}`;

    const res = await safeFetchJson<{ contact: any; consentMessage?: string; consentSent?: boolean; error?: string }>('/api/contacts', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: contact.name.trim(),
        phone: phoneTrimmed,
        relationship: contact.relationship,
        notificationPreference: contact.notificationPreference,
        priorityOrder: contact.priority_order || list.length + 1,
      }),
    });

    if (res.ok && res.data?.contact) {
      const dataContact = res.data.contact;
      const newC: Contact = {
        id: dataContact.id,
        name: dataContact.name,
        relationship: dataContact.relationship || 'Guardian',
        phone: dataContact.phone,
        online: true,
        notificationPreference: dataContact.notification_preference || 'All Channels',
        verification_status: dataContact.verification_status || 'PENDING',
        priority_order: dataContact.priority_order || list.length + 1,
      };
      this.saveContacts([...list, newC]);
      return { success: true, contact: newC, consentMessage: res.data.consentMessage };
    }

    return {
      success: false,
      error: res.error || 'Failed to save emergency contact on server.'
    };
  },

  async sendConsentSms(contactId: string): Promise<{ success: boolean; message?: string }> {
    try {
      const activeToken = getStoredToken();
      const headers: Record<string, string> = {};
      if (activeToken) headers['Authorization'] = `Bearer ${activeToken}`;

      const res = await safeFetchJson<{ success: boolean; message?: string; error?: string }>(
        `/api/contacts/${contactId}/send-consent`,
        {
          method: 'POST',
          headers,
        }
      );

      if (!res.ok) {
        if (res.status === 404) {
          return {
            success: false,
            message: 'Contact not found on backend. Please ensure the contact was saved to the server.',
          };
        }
        return { success: false, message: res.error || `Server error (${res.status})` };
      }

      return {
        success: Boolean(res.data?.success),
        message: res.data?.message || (res.data?.success ? 'Consent SMS sent' : 'Consent SMS dispatch failed')
      };
    } catch (e: any) {
      return { success: false, message: e.message || 'Network error sending consent SMS' };
    }
  },

  async verifyContact(contactId: string): Promise<{ success: boolean; message?: string }> {
    try {
      const activeToken = getStoredToken();
      const headers: Record<string, string> = {};
      if (activeToken) headers['Authorization'] = `Bearer ${activeToken}`;

      const res = await safeFetchJson<{ success: boolean; message?: string; contact?: any }>(
        `/api/contacts/${contactId}/verify`,
        {
          method: 'POST',
          headers,
        }
      );

      let message = 'Contact verified successfully (Drill mode).';
      if (res.data?.message) message = res.data.message;

      // Update local cache
      const list = this.getContacts().map(c => c.id === contactId ? { ...c, verification_status: 'VERIFIED' as const } : c);
      this.saveContacts(list);

      return { success: true, message };
    } catch (e: any) {
      const list = this.getContacts().map(c => c.id === contactId ? { ...c, verification_status: 'VERIFIED' as const } : c);
      this.saveContacts(list);
      return { success: true, message: 'Contact verified in local safety circle.' };
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

      await safeFetchJson(`/api/contacts/${id}`, {
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

      await safeFetchJson(`/api/contacts/${id}`, {
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

