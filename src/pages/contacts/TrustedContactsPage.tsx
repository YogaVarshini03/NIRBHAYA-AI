import React, { useState } from 'react';
import {
  Users,
  Plus,
  Phone,
  Bell,
  CheckCircle2,
  Trash2,
  Edit2,
  Send,
  AlertCircle,
  Radio,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { contactService } from '../../services/contactService';
import { Contact } from '../../types';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useToast } from '../../context/ToastContext';

export const TrustedContactsPage: React.FC = () => {
  const { showToast } = useToast();
  const [contacts, setContacts] = useState<Contact[]>(() => contactService.getContacts());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [contactToDelete, setContactToDelete] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    relationship: 'Mother' as Contact['relationship'],
    phone: '',
    notificationPreference: 'SMS & App' as Contact['notificationPreference'],
  });
  const [formError, setFormError] = useState('');

  const [isAlerting, setIsAlerting] = useState<string | null>(null);

  React.useEffect(() => {
    contactService.fetchContactsFromBackend().then((list) => {
      setContacts(list);
    });
  }, []);

  // Real Test Alert dispatching to real SMS and Email gateways
  const handleTestAlert = async (contact: Contact) => {
    setIsAlerting(contact.id);
    showToast(`Dispatching live test alert to ${contact.name}...`, 'info');

    try {
      const result = await contactService.sendTestAlert(contact.id);
      if (result.success) {
        showToast(`✓ Test alert delivered to ${contact.name}! (SMS: ${result.smsStatus})`, 'success');
      } else {
        showToast(`✕ SMS Gateway: ${result.smsStatus}`, 'error', 5000);
      }
    } catch (err: any) {
      showToast('✕ Network error sending test alert to gateway.', 'error');
    } finally {
      setIsAlerting(null);
    }
  };

  const handleOpenAdd = () => {
    setEditingContact(null);
    setFormData({
      name: '',
      relationship: 'Mother',
      phone: '',
      notificationPreference: 'SMS & App',
    });
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (contact: Contact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      relationship: contact.relationship,
      phone: contact.phone,
      notificationPreference: contact.notificationPreference,
    });
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('Name is required.');
      return;
    }
    const cleanPhone = formData.phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setFormError('Please enter a valid 10-digit phone number.');
      return;
    }

    if (editingContact) {
      await contactService.updateContact(editingContact.id, {
        name: formData.name,
        relationship: formData.relationship,
        phone: formData.phone,
        notificationPreference: formData.notificationPreference,
      });
      showToast('Contact updated successfully.', 'success');
    } else {
      const res = await contactService.addContact({
        name: formData.name,
        relationship: formData.relationship,
        phone: formData.phone,
        online: true,
        notificationPreference: formData.notificationPreference,
      });
      if (!res.success) {
        setFormError(res.error || 'Failed to add contact.');
        return;
      }
      showToast('Contact added successfully.', 'success');
    }

    setContacts(contactService.getContacts());
    setIsAddModalOpen(false);
  };

  const handleDelete = async () => {
    if (!contactToDelete) return;
    await contactService.deleteContact(contactToDelete);
    setContacts(contactService.getContacts());
    setContactToDelete(null);
    showToast('Contact removed from emergency circle.', 'info');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.08]">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
            Immediate Response Circle
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
            Trusted Emergency Contacts
          </h2>
          <p className="text-sm text-slate-400">
            Prioritized family and friends who receive instant simulated alerts during distress escalation.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={handleOpenAdd}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Add Emergency Contact
        </Button>
      </div>

      {/* Contacts List Grid (Rule 29) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {contacts.map((contact) => (
          <Card key={contact.id} variant="glass" className="p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center font-bold text-base text-indigo-300">
                    {contact.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white">{contact.name}</h4>
                    <span className="text-xs text-purple-400 font-semibold">{contact.relationship}</span>
                  </div>
                </div>

                <Badge variant={contact.online ? 'low' : 'neutral'} size="sm" dot>
                  {contact.online ? 'Online' : 'Offline'}
                </Badge>
              </div>

              <div className="p-3 rounded-xl bg-navy-950/60 border border-white/5 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <Phone className="w-3.5 h-3.5 text-indigo-400" /> Phone:
                  </span>
                  <span className="font-mono font-medium">{contact.phone}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <Bell className="w-3.5 h-3.5 text-cyan-400" /> Priority:
                  </span>
                  <span className="text-slate-200">{contact.notificationPreference}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons: Edit, Remove, Test Alert (Rule 29) */}
            <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/10">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleTestAlert(contact)}
                leftIcon={<Send className="w-3.5 h-3.5 text-indigo-400" />}
                className="flex-1 text-xs"
              >
                Test Alert — DEMO
              </Button>

              <button
                onClick={() => handleOpenEdit(contact)}
                className="p-2 rounded-xl bg-navy-900 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white"
                title="Edit Contact"
                aria-label="Edit Contact"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setContactToDelete(contact.id)}
                className="p-2 rounded-xl bg-navy-900 border border-white/10 hover:border-red-500/30 text-slate-400 hover:text-red-400"
                title="Delete Contact"
                aria-label="Delete Contact"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </Card>
        ))}
      </div>

      {/* Add / Edit Contact Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={editingContact ? 'Edit Emergency Contact' : 'Add Trusted Contact'}
        maxWidth="md"
      >
        <form onSubmit={handleSaveContact} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Sunita Sharma"
              className="w-full px-3.5 py-2.5 rounded-xl bg-navy-950 border border-white/10 text-white text-sm focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Relationship</label>
              <select
                value={formData.relationship}
                onChange={(e) => setFormData({ ...formData, relationship: e.target.value as any })}
                className="w-full px-3 py-2.5 rounded-xl bg-navy-950 border border-white/10 text-white text-sm focus:border-purple-500 focus:outline-none"
              >
                <option value="Mother">Mother</option>
                <option value="Father">Father</option>
                <option value="Friend">Friend</option>
                <option value="Guardian">Guardian</option>
                <option value="Sibling">Sibling</option>
                <option value="Partner">Partner</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Notification Priority</label>
              <select
                value={formData.notificationPreference}
                onChange={(e) => setFormData({ ...formData, notificationPreference: e.target.value as any })}
                className="w-full px-3 py-2.5 rounded-xl bg-navy-950 border border-white/10 text-white text-sm focus:border-purple-500 focus:outline-none"
              >
                <option value="SMS & App">SMS & App</option>
                <option value="Push Only">Push Only</option>
                <option value="Call Priority">Call Priority</option>
                <option value="All Channels">All Channels</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number</label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+91 98765 11223"
              className="w-full px-3.5 py-2.5 rounded-xl bg-navy-950 border border-white/10 text-white text-sm focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
            <Button variant="ghost" size="sm" type="button" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              {editingContact ? 'Save Changes' : 'Add Contact'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={!!contactToDelete}
        onClose={() => setContactToDelete(null)}
        onConfirm={handleDelete}
        title="Remove Emergency Contact"
        message="Are you sure you want to remove this person from your rapid response circle?"
        confirmText="Remove Contact"
        isDestructive
      />
    </div>
  );
};
