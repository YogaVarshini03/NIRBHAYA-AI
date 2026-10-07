import React, { useState, useEffect } from 'react';
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
  Clock,
  ShieldCheck,
  ShieldAlert,
  ArrowUpDown
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
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    relationship: 'Guardian' as Contact['relationship'],
    phone: '',
    notificationPreference: 'All Channels' as Contact['notificationPreference'],
    priorityOrder: 1,
  });
  const [formError, setFormError] = useState('');

  const refreshContacts = async () => {
    const list = await contactService.fetchContactsFromBackend();
    setContacts(list);
  };

  useEffect(() => {
    refreshContacts();
  }, []);

  const handleSendConsent = async (contact: Contact) => {
    setActionLoadingId(contact.id);
    showToast(`Sending consent request SMS to ${contact.name} (${contact.phone})...`, 'info');
    try {
      const res = await contactService.sendConsentSms(contact.id);
      if (res.success) {
        showToast(`✓ Consent SMS dispatched to ${contact.name}!`, 'success');
      } else {
        showToast(`✕ SMS Gateway: ${res.message}`, 'error', 6000);
      }
    } catch (e: any) {
      showToast('✕ Error dispatching consent SMS', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleManualVerify = async (contact: Contact) => {
    setActionLoadingId(contact.id);
    try {
      const res = await contactService.verifyContact(contact.id);
      if (res.success) {
        showToast(`✓ ${contact.name} verified as emergency guardian!`, 'success');
        await refreshContacts();
      } else {
        showToast(`✕ Verification error: ${res.message}`, 'error');
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenAdd = () => {
    setEditingContact(null);
    setFormData({
      name: '',
      relationship: 'Guardian',
      phone: '+91 ',
      notificationPreference: 'All Channels',
      priorityOrder: contacts.length + 1,
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
      priorityOrder: contact.priority_order || 1,
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
        name: formData.name.trim(),
        relationship: formData.relationship,
        phone: formData.phone.trim(),
        notificationPreference: formData.notificationPreference,
        priority_order: formData.priorityOrder,
      });
      showToast('Contact updated successfully.', 'success');
      setIsAddModalOpen(false);
      refreshContacts();
    } else {
      const res = await contactService.addContact({
        name: formData.name.trim(),
        relationship: formData.relationship,
        phone: formData.phone.trim(),
        notificationPreference: formData.notificationPreference,
        online: true,
        priority_order: formData.priorityOrder,
      });

      if (!res.success) {
        setFormError(res.error || 'Failed to save contact.');
        return;
      }

      showToast(`Contact saved. ${res.consentMessage || 'Consent SMS sent.'}`, 'success', 5000);
      setIsAddModalOpen(false);
      refreshContacts();
    }
  };

  const handleDeleteConfirm = async () => {
    if (contactToDelete) {
      await contactService.deleteContact(contactToDelete);
      showToast('Emergency contact removed from safety network.', 'info');
      setContactToDelete(null);
      refreshContacts();
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/10 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-white">Trusted Guardian Circle</h2>
            <span className="text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2.5 py-0.5 rounded-full font-semibold">
              {contacts.length} Guardians
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Prioritized emergency contacts who receive instant live GPS telemetry, automated voice calls, and parallel SMS alerts during distress.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={handleOpenAdd}
          leftIcon={<Plus className="w-4 h-4" />}
          className="shadow-glow-purple shrink-0"
        >
          Add Emergency Contact
        </Button>
      </div>

      {/* Consent & Verification Info Banner */}
      <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-500/20 flex items-start gap-3 text-xs text-purple-200">
        <ShieldCheck className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-white">Guardian Consent & Sequential Voice Dispatch Protocol</p>
          <p className="text-purple-300 leading-relaxed">
            When you trigger SOS, all <span className="text-emerald-400 font-bold">VERIFIED</span> contacts receive parallel SMS alerts. Automated Twilio voice calls ring Guardian #1 first. If unanswered within 30 seconds, the system automatically rings Guardian #2 in priority order.
          </p>
        </div>
      </div>

      {/* Contacts List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {contacts.map((contact, idx) => {
          const isVerified = contact.verification_status === 'VERIFIED';
          const order = contact.priority_order || (idx + 1);

          return (
            <Card key={contact.id} variant="glass" className="p-5 flex flex-col justify-between space-y-4 relative overflow-hidden">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center font-bold text-base text-purple-300 shrink-0">
                      #{order}
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white flex items-center gap-2">
                        {contact.name}
                        {contact.isPrimary && (
                          <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-semibold">
                            Primary
                          </span>
                        )}
                      </h4>
                      <span className="text-xs text-purple-400 font-medium">{contact.relationship}</span>
                    </div>
                  </div>

                  <span className={`text-[11px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1 border shrink-0 ${
                    isVerified
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-400 border-amber-500/30 animate-pulse'
                  }`}>
                    {isVerified ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                    {isVerified ? 'VERIFIED GUARDIAN' : 'CONSENT PENDING'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-navy-950/60 border border-white/5 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <Phone className="w-3.5 h-3.5 text-purple-400" /> Phone:
                    </span>
                    <span className="font-mono font-medium text-white">{contact.phone}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" /> Call Priority:
                    </span>
                    <span className="text-slate-200">Priority #{order} (Rings {order === 1 ? 'First' : `after Guardian #${order - 1}`})</span>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/10">
                <div className="flex items-center gap-2 flex-1">
                  {!isVerified ? (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={actionLoadingId === contact.id}
                        onClick={() => handleSendConsent(contact)}
                        leftIcon={<Send className="w-3.5 h-3.5 text-purple-400" />}
                        className="text-xs flex-1"
                      >
                        Resend Consent SMS
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={actionLoadingId === contact.id}
                        onClick={() => handleManualVerify(contact)}
                        className="text-xs border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/40"
                      >
                        Verify (Drill)
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={actionLoadingId === contact.id}
                      onClick={() => handleSendConsent(contact)}
                      leftIcon={<Send className="w-3.5 h-3.5 text-emerald-400" />}
                      className="text-xs flex-1"
                    >
                      Test Alert SMS
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(contact)}
                    className="p-2 rounded-xl bg-navy-900 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white transition"
                    title="Edit Contact"
                    aria-label="Edit Contact"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setContactToDelete(contact.id)}
                    className="p-2 rounded-xl bg-navy-900 border border-white/10 hover:border-red-500/30 text-slate-400 hover:text-red-400 transition"
                    title="Delete Contact"
                    aria-label="Delete Contact"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Add / Edit Contact Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={editingContact ? 'Edit Emergency Contact' : 'Add Emergency Guardian'}
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
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Full Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Priya S"
              className="w-full px-4 py-2.5 rounded-xl bg-navy-950 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Relationship
              </label>
              <select
                value={formData.relationship}
                onChange={(e) => setFormData({ ...formData, relationship: e.target.value as any })}
                className="w-full px-4 py-2.5 rounded-xl bg-navy-950 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500"
              >
                <option value="Mother">Mother</option>
                <option value="Father">Father</option>
                <option value="Guardian">Guardian</option>
                <option value="Friend">Friend</option>
                <option value="Sibling">Sibling</option>
                <option value="Partner">Partner</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Call Priority Order
              </label>
              <select
                value={formData.priorityOrder}
                onChange={(e) => setFormData({ ...formData, priorityOrder: parseInt(e.target.value, 10) })}
                className="w-full px-4 py-2.5 rounded-xl bg-navy-950 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500"
              >
                <option value={1}>#1 (First Call Target)</option>
                <option value={2}>#2 (Second Call Target)</option>
                <option value={3}>#3 (Third Call Target)</option>
                <option value={4}>#4 (Fourth Call Target)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Phone Number (E.164 Format) *
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+91 93455 96322"
              className="w-full px-4 py-2.5 rounded-xl bg-navy-950 border border-white/10 text-white placeholder-slate-500 text-sm font-mono focus:outline-none focus:border-purple-500"
              required
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Indian 10-digit numbers default to +91. Consent SMS will be dispatched automatically upon adding.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="shadow-glow-purple"
            >
              {editingContact ? 'Save Changes' : 'Add & Send Consent SMS'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(contactToDelete)}
        onClose={() => setContactToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Remove Emergency Guardian?"
        message="Are you sure you want to remove this contact? They will no longer receive live GPS coordinates or automated emergency calls during SOS dispatch."
        confirmText="Remove Guardian"
        isDestructive={true}
      />
    </div>
  );
};
export default TrustedContactsPage;
