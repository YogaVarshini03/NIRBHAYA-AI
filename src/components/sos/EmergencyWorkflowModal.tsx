import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  MapPin,
  Users,
  Mic,
  Car,
  Radio,
  CheckCircle2,
  Clock,
  ExternalLink,
  XCircle,
  AlertTriangle,
  Mail,
  MessageSquare,
  PhoneCall,
  Share2,
  Copy,
  Volume2,
  VolumeX,
  Flashlight,
  Sparkles
} from 'lucide-react';
import { useEmergency } from '../../context/EmergencyContext';
import { Button } from '../common/Button';
import { locationService } from '../../services/locationService';
import { contactService } from '../../services/contactService';
import { hardwareSafetyService } from '../../services/hardwareSafetyService';
import { useToast } from '../../context/ToastContext';

export const EmergencyWorkflowModal: React.FC = () => {
  const {
    isEmergencyModalOpen,
    closeEmergencyModal,
    activeIncident,
    workflowSteps,
    notificationResults,
    workflowError,
  } = useEmergency();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [hardwareState, setHardwareState] = useState(() => hardwareSafetyService.getState());
  const [copiedLink, setCopiedLink] = useState(false);
  const [currentAddress, setCurrentAddress] = useState<string>(() => locationService.getCachedAddress());

  useEffect(() => {
    const unsubHardware = hardwareSafetyService.subscribe((state) => {
      setHardwareState({ ...state });
    });

    const unsubLoc = locationService.subscribe((loc) => {
      if (loc?.address) {
        setCurrentAddress(loc.address);
      }
    });

    return () => {
      unsubHardware();
      unsubLoc();
    };
  }, []);

  if (!isEmergencyModalOpen) return null;

  const handleOpenTracking = () => {
    closeEmergencyModal();
    navigate('/live-tracking');
  };

  const handleViewIncident = () => {
    closeEmergencyModal();
    navigate('/responder/active');
  };

  const stepIcons = [ShieldAlert, MapPin, Radio, Users, Mic, Car];

  const smsResult = notificationResults.find((n: any) => n.type === 'SMS');
  const emailResult = notificationResults.find((n: any) => n.type === 'EMAIL');

  const gps = locationService.getCurrentLocation();
  const lat = gps?.latitude || activeIncident.coordinates?.lat || 0;
  const lng = gps?.longitude || activeIncident.coordinates?.lng || 0;
  const mapsUrl = `https://maps.google.com/?q=${lat},${lng}`;
  const trackingUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/live-tracking?incident=${activeIncident.id}`
    : `https://nirbhaya.ai/live-tracking?incident=${activeIncident.id}`;

  const primaryContact = contactService.getContacts().find(c => c.isEmergencyContact) || contactService.getContacts()[0];
  const primaryPhone = primaryContact?.phone?.replace(/\D/g, '') || '9345596322';

  const sosMessageText = `🚨 EMERGENCY ALERT FROM NIRBHAYA AI! 🚨\n\nI am in immediate distress and need help!\n📍 Location: ${currentAddress}\n📌 Google Maps: ${mapsUrl}\n🔴 Live Radar Tracking: ${trackingUrl}\n\nPlease dispatch emergency response immediately!`;

  const handleWhatsAppShare = () => {
    const waUrl = `https://wa.me/${primaryPhone ? primaryPhone : ''}?text=${encodeURIComponent(sosMessageText)}`;
    window.open(waUrl, '_blank');
    showToast('Opening WhatsApp with live GPS coordinates and emergency dispatch...', 'info');
  };

  const handleNativeSms = () => {
    // RFC 5724 native SMS launcher
    const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
    const separator = isIOS ? '&' : '?';
    const smsUrl = `sms:${primaryPhone}${separator}body=${encodeURIComponent(sosMessageText)}`;
    window.open(smsUrl, '_blank');
    showToast('Opening native SMS with pre-filled SOS coordinates...', 'info');
  };

  const handleDirectCall = () => {
    window.open(`tel:${primaryPhone || '112'}`, '_self');
  };

  const handleCopyTrackingLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(trackingUrl);
      setCopiedLink(true);
      showToast('Live tracking link copied to clipboard!', 'success');
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/90 backdrop-blur-xl animate-in fade-in">
      {/* Full screen strobe flash if hardware screen strobe is active */}
      {hardwareState.isScreenStrobeActive && (
        <div className="fixed inset-0 z-[60] pointer-events-none bg-red-600/30 mix-blend-screen animate-ping" />
      )}

      <div className="relative w-full max-w-2xl bg-navy-900 border-2 border-red-500/50 rounded-3xl p-6 sm:p-8 shadow-glow-red z-10 text-white space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-red-500/20 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-600/20 border border-red-500 rounded-2xl animate-pulse">
              <ShieldAlert className="w-8 h-8 text-red-400" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40">
                ACTIVE SOS DISPATCH
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
                EMERGENCY TELEMETRY NETWORK
              </h2>
            </div>
          </div>
          <div className="text-left sm:text-right font-mono text-xs text-red-300 bg-red-950/60 p-2.5 rounded-xl border border-red-500/30">
            <div>Incident ID: {activeIncident.id}</div>
            <div className="text-slate-400">
              Duration: {Math.floor(activeIncident.elapsedSeconds / 60)}m {activeIncident.elapsedSeconds % 60}s
            </div>
          </div>
        </div>

        {/* Real Address Strip */}
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-red-950/40 border border-red-500/30 text-xs">
          <MapPin className="w-4 h-4 text-red-400 shrink-0 animate-bounce" />
          <div className="flex-1 truncate">
            <span className="text-slate-400">Real Location: </span>
            <span className="text-white font-medium">{currentAddress || 'Acquiring GPS street address...'}</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
            GPS LOCK ±{gps?.accuracy || 5}m
          </span>
        </div>

        {/* Immediate 1-Tap Emergency Actions (WhatsApp / SMS / Call / Hardware Siren & Torch) */}
        <div className="p-4 rounded-2xl bg-navy-850/80 border border-red-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              1-Tap Direct Emergency Actions
            </span>
            <span className="text-[11px] text-slate-400">Native device actuation</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* WhatsApp */}
            <button
              onClick={handleWhatsAppShare}
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 hover:bg-emerald-900/60 transition text-emerald-300 text-xs font-semibold gap-1.5 shadow-sm group"
            >
              <MessageSquare className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span>WhatsApp SOS</span>
            </button>

            {/* Native SMS */}
            <button
              onClick={handleNativeSms}
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-blue-950/40 border border-blue-500/40 hover:bg-blue-900/60 transition text-blue-300 text-xs font-semibold gap-1.5 shadow-sm group"
            >
              <Share2 className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />
              <span>Native SMS</span>
            </button>

            {/* Direct Call 112 */}
            <button
              onClick={handleDirectCall}
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-red-950/60 border border-red-500/60 hover:bg-red-900/70 transition text-red-200 text-xs font-semibold gap-1.5 shadow-sm group"
            >
              <PhoneCall className="w-5 h-5 text-red-400 group-hover:scale-110 transition-transform animate-pulse" />
              <span>Call {primaryContact?.name?.split(' ')[0] || '112'}</span>
            </button>

            {/* Siren Toggle */}
            <button
              onClick={() => hardwareSafetyService.toggleSiren()}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border transition text-xs font-semibold gap-1.5 shadow-sm group ${
                hardwareState.isSirenActive
                  ? 'bg-red-600 text-white border-red-400 shadow-glow-red animate-pulse'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:border-slate-500'
              }`}
            >
              {hardwareState.isSirenActive ? (
                <Volume2 className="w-5 h-5 text-white" />
              ) : (
                <VolumeX className="w-5 h-5 text-slate-400" />
              )}
              <span>{hardwareState.isSirenActive ? 'Siren ON' : 'Audio Siren'}</span>
            </button>
          </div>

          <div className="flex items-center justify-between pt-1 text-xs">
            <button
              onClick={() => hardwareSafetyService.toggleStrobe()}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition ${
                hardwareState.isStrobeActive
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 animate-pulse'
                  : 'bg-navy-900/60 text-slate-300 border-white/10 hover:border-white/20'
              }`}
            >
              <Flashlight className="w-3.5 h-3.5 text-amber-400" />
              <span>{hardwareState.isStrobeActive ? 'Flashlight Strobe Active' : 'Enable Torch Strobe'}</span>
            </button>

            <button
              onClick={handleCopyTrackingLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy-900/60 border border-white/10 hover:border-cyan-500/40 text-cyan-300 text-xs transition"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copiedLink ? 'Link Copied!' : 'Copy Live Tracking Link'}</span>
            </button>
          </div>
        </div>

        {/* Global Error Banner if any step failed */}
        {workflowError && (
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/40 text-red-300 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
            <div>
              <strong className="block font-semibold">Workflow Notice:</strong>
              <span>{workflowError}</span>
            </div>
          </div>
        )}

        {/* Step Progress List Driven by Real States */}
        <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
          {workflowSteps.map((step, idx) => {
            const Icon = stepIcons[idx] || ShieldAlert;

            let borderStyle = 'border-white/5 bg-navy-850/40 text-slate-400';
            let iconBox = 'bg-slate-800 text-slate-400';
            let badgeIcon = <Clock className="w-4 h-4 text-slate-500" />;

            if (step.status === 'SUCCESS') {
              borderStyle = 'border-emerald-500/30 bg-emerald-950/20 text-slate-200';
              iconBox = 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40';
              badgeIcon = <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
            } else if (step.status === 'RUNNING') {
              borderStyle = 'border-amber-500/50 bg-amber-950/20 text-white shadow-glow-amber';
              iconBox = 'bg-amber-500/30 text-amber-300 border border-amber-500/50 animate-pulse';
              badgeIcon = <Clock className="w-4 h-4 text-amber-400 animate-spin" />;
            } else if (step.status === 'FAILED') {
              borderStyle = 'border-red-500/50 bg-red-950/30 text-white shadow-glow-red';
              iconBox = 'bg-red-500/30 text-red-300 border border-red-500/50';
              badgeIcon = <XCircle className="w-4 h-4 text-red-400" />;
            }

            return (
              <div
                key={step.number}
                className={`flex items-start gap-4 p-3.5 sm:p-4 rounded-2xl border transition-all duration-300 ${borderStyle}`}
              >
                <div className={`p-2.5 rounded-xl shrink-0 ${iconBox}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>Step {step.number}: {step.title}</span>
                    </h4>
                    {badgeIcon}
                  </div>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed break-words">
                    {step.detail}
                  </p>

                  {/* Independent SMS / Email Status Badges for Step 4 */}
                  {step.number === 4 && (
                    <div className="mt-3 space-y-2 pt-2.5 border-t border-white/10">
                      <div className="flex flex-wrap gap-2.5">
                        {smsResult && (
                          <div
                            className={`flex flex-col gap-0.5 px-3 py-1.5 rounded-lg text-xs font-mono border ${
                              smsResult.status === 'SENT'
                                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/40'
                                : smsResult.status === 'BLOCKED'
                                ? 'bg-amber-500/10 text-amber-300 border-amber-500/40'
                                : 'bg-red-500/10 text-red-300 border-red-500/40'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 font-bold">
                              {smsResult.status === 'SENT' ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              ) : smsResult.status === 'BLOCKED' ? (
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5 text-red-400" />
                              )}
                              <span>SMS: {smsResult.status}</span>
                            </div>
                            <span className="text-[10px] text-slate-300 font-sans">
                              {smsResult.status === 'SENT'
                                ? `Delivered to ${smsResult.recipient}`
                                : smsResult.status === 'BLOCKED'
                                ? (smsResult.reason || 'Twilio Trial account restriction')
                                : (smsResult.error || 'Provider rejected request')}
                            </span>
                          </div>
                        )}

                        {emailResult && (
                          <div
                            className={`flex flex-col gap-0.5 px-3 py-1.5 rounded-lg text-xs font-mono border ${
                              emailResult.status === 'SENT'
                                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/40'
                                : 'bg-red-500/10 text-red-300 border-red-500/40'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 font-bold">
                              {emailResult.status === 'SENT' ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5 text-red-400" />
                              )}
                              <span>Email: {emailResult.status}</span>
                            </div>
                            <span className="text-[10px] text-slate-300 font-sans">
                              {emailResult.status === 'SENT'
                                ? `Delivered through Resend API to ${emailResult.recipient}`
                                : (emailResult.error || 'Dispatch error')}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-400 italic pt-1 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0"></span>
                        <span>Emergency tracking remains active even if an individual notification channel is unavailable.</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
          <Button
            variant="ghost"
            onClick={closeEmergencyModal}
            className="w-full sm:w-auto text-slate-400 hover:text-white"
          >
            Close Dialog
          </Button>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={handleViewIncident}
              className="flex-1 sm:flex-none border-slate-700 hover:border-slate-500 text-xs sm:text-sm"
            >
              Responder View
            </Button>
            <Button
              variant="danger"
              onClick={handleOpenTracking}
              className="flex-1 sm:flex-none shadow-glow-red flex items-center justify-center gap-2 text-xs sm:text-sm"
            >
              <span>Live GPS Tracking</span>
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
