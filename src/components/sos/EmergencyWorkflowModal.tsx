import React, { useState, useEffect, useRef } from 'react';
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
  PhoneCall,
  Share2,
  Copy,
  Volume2,
  VolumeX,
  Flashlight,
  Sparkles,
  Lock,
  Phone
} from 'lucide-react';
import { useEmergency } from '../../context/EmergencyContext';
import { Button } from '../common/Button';
import { locationService } from '../../services/locationService';
import { contactService } from '../../services/contactService';
import { hardwareSafetyService } from '../../services/hardwareSafetyService';
import { useToast } from '../../context/ToastContext';
import { apiUrl, getAppBaseUrl } from '../../services/apiConfig';

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

  // 10-Second Countdown & PIN Cancel State
  const [countdown, setCountdown] = useState<number>(10);
  const [isCountingDown, setIsCountingDown] = useState<boolean>(true);
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const countdownTimerRef = useRef<number | null>(null);

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

  // 10-second countdown with haptic vibration upon SOS trigger
  useEffect(() => {
    if (isEmergencyModalOpen) {
      setCountdown(10);
      setIsCountingDown(true);
      setEnteredPin('');
      setPinError(null);

      // Trigger initial haptic vibration
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([300, 200, 300]);
        } catch (e) {}
      }

      countdownTimerRef.current = window.setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownTimerRef.current!);
            countdownTimerRef.current = null;
            setIsCountingDown(false);
            return 0;
          }
          // Periodic pulse vibration during countdown
          if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            try {
              navigator.vibrate([100]);
            } catch (e) {}
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    };
  }, [isEmergencyModalOpen]);

  if (!isEmergencyModalOpen) return null;

  const handleCancelWithPin = async () => {
    if (!enteredPin.trim()) {
      setPinError('Please enter your 4-digit safety PIN.');
      return;
    }

    setIsCancelling(true);
    setPinError(null);

    try {
      if (isCountingDown) {
        // Cancelled before dispatch timeout
        if (countdownTimerRef.current) {
          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
        }

        if (enteredPin.trim() === '1234') {
          showToast('SOS cancelled before dispatch with verified PIN.', 'info');
          closeEmergencyModal();
        } else {
          setPinError('Incorrect PIN. Dispatch proceeding.');
        }
      } else {
        // Dispatched: Call backend cancellation route with PIN
        const res = await fetch(apiUrl(`/api/emergency/${activeIncident.id}/cancel`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: enteredPin.trim(), reason: 'User entered cancellation PIN' }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          showToast('✓ SOS cancelled. False-alarm SMS sent to guardians.', 'success', 5000);
          closeEmergencyModal();
        } else {
          setPinError(data.error || 'Incorrect Emergency PIN. Cancellation denied.');
        }
      }
    } catch (e: any) {
      setPinError('Network error verifying PIN. Please try again.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleOpenTracking = () => {
    closeEmergencyModal();
    navigate('/live-tracking');
  };

  const gps = locationService.getCurrentLocation();
  const lat = gps?.latitude || activeIncident.coordinates?.lat || 11.0168;
  const lng = gps?.longitude || activeIncident.coordinates?.lng || 76.9558;
  const appBase = getAppBaseUrl();
  const trackingUrl = `${appBase}/track/trk_${activeIncident.id}`;

  const primaryContact = contactService.getContacts().find(c => c.isEmergencyContact) || contactService.getContacts()[0];
  const rawGuardianPhone = primaryContact?.phone || '';
  const primaryPhone = (rawGuardianPhone && !rawGuardianPhone.includes('X')) ? rawGuardianPhone.replace(/[^\d+]/g, '') : '';

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
      {/* Screen strobe flash */}
      {hardwareState.isScreenStrobeActive && (
        <div className="fixed inset-0 z-[60] pointer-events-none bg-red-600/30 mix-blend-screen animate-ping" />
      )}

      <div className="relative w-full max-w-2xl bg-neutral-900 border-2 border-red-500/60 rounded-3xl p-6 sm:p-8 shadow-2xl z-10 text-white space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-red-500/20 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-600/20 border border-red-500 rounded-2xl animate-pulse">
              <ShieldAlert className="w-8 h-8 text-red-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40">
                  {isCountingDown ? 'CANCEL COUNTDOWN ACTIVE' : 'LIVE SOS DISPATCHED'}
                </span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                  DEMO MODE: POLICE REDIRECTED
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
                EMERGENCY TELEMETRY NETWORK
              </h2>
            </div>
          </div>
          <div className="text-left sm:text-right font-mono text-xs text-red-300 bg-red-950/60 p-2.5 rounded-xl border border-red-500/30">
            <div>Incident: {activeIncident.id}</div>
            <div className="text-slate-400">
              Duration: {Math.floor(activeIncident.elapsedSeconds / 60)}m {activeIncident.elapsedSeconds % 60}s
            </div>
          </div>
        </div>

        {/* 10-Second Cancel Countdown Ring & PIN input */}
        {isCountingDown && (
          <div className="p-5 rounded-2xl bg-gradient-to-br from-red-950/60 to-neutral-900 border-2 border-red-500/50 space-y-4 text-center">
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-full border-4 border-red-500 flex items-center justify-center text-3xl font-black text-red-400 animate-pulse shadow-glow-red">
                {countdown}s
              </div>
              <h3 className="text-base font-bold text-white mt-3">
                Emergency Dispatch in {countdown} Seconds
              </h3>
              <p className="text-xs text-neutral-400 max-w-md">
                Parallel SMS, automated voice calls (Tamil/English), and police notifications will dispatch when timer expires. Enter PIN below to cancel.
              </p>
            </div>

            <div className="max-w-xs mx-auto flex items-center gap-2">
              <input
                type="password"
                maxLength={6}
                value={enteredPin}
                onChange={(e) => setEnteredPin(e.target.value)}
                placeholder="Enter 4-digit PIN (1234)"
                className="flex-1 px-3 py-2 rounded-xl bg-neutral-950 border border-red-500/40 text-center font-mono text-lg text-white placeholder-neutral-600 focus:outline-none focus:border-red-400"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelWithPin}
                disabled={isCancelling}
                className="border-red-500 text-red-300 hover:bg-red-950"
              >
                Cancel SOS
              </Button>
            </div>
            {pinError && (
              <p className="text-xs text-red-400 font-semibold">{pinError}</p>
            )}
          </div>
        )}

        {/* Real Address Strip */}
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-red-950/40 border border-red-500/30 text-xs">
          <MapPin className="w-4 h-4 text-red-400 shrink-0 animate-bounce" />
          <div className="flex-1 truncate">
            <span className="text-slate-400">Live GPS: </span>
            <span className="text-white font-medium">{currentAddress || 'Acquiring GPS location...'}</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
            ±{gps?.accuracy || 5}m LOCK
          </span>
        </div>

        {/* Delivery Status Screen for Recipients (Twilio Realtime Webhook / Dispatch Status) */}
        {!isCountingDown && (
          <div className="p-4 rounded-2xl bg-neutral-950/80 border border-red-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                Live Multi-Channel Delivery Status
              </span>
              <span className="text-[10px] text-neutral-400">Twilio Telemetry Stream</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {notificationResults.length > 0 ? (
                notificationResults.map((n, idx) => {
                  const isSuccess = n.status === 'SENT' || n.status === 'INITIATED' || n.status === 'CONNECTED';
                  const is573003 = n.error?.includes('573003') || n.reason?.includes('573003') || (n.type?.includes('VOICE') && n.status === 'BLOCKED' && !n.reason?.includes('disabled'));
                  const isVoiceDisabled = n.reason?.includes('Voice disabled') || n.error?.includes('Voice disabled');
                  const isBlocked = n.status === 'BLOCKED' || is573003 || isVoiceDisabled;

                  let badgeText = n.status;
                  let messageText = n.reason || n.error || (isSuccess ? 'Dispatched via Gateway' : 'Failed to dispatch');

                  if (is573003) {
                    badgeText = 'BLOCKED (573003)';
                    messageText = 'Blocked by Twilio trial (573003)';
                  } else if (isVoiceDisabled) {
                    badgeText = 'DISABLED';
                    messageText = 'Voice disabled (trial limitation)';
                  }

                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                        isSuccess
                          ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                          : isBlocked
                          ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
                          : 'bg-red-950/30 border-red-500/40 text-red-300'
                      }`}
                    >
                      {isSuccess ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : isBlocked ? (
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between font-bold gap-2">
                          <span className="truncate">{n.type} → {n.recipient}</span>
                          {is573003 ? (
                            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0 font-bold">
                              Blocked by Twilio trial (573003)
                            </span>
                          ) : isVoiceDisabled ? (
                            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0 font-bold">
                              Voice disabled (trial limitation)
                            </span>
                          ) : (
                            <span className="text-[10px] uppercase font-mono">{badgeText}</span>
                          )}
                        </div>
                        <p className="text-[11px] text-neutral-300 mt-0.5 truncate">
                          {messageText}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-2 p-3 rounded-xl bg-neutral-900 text-center text-xs text-neutral-400">
                  Initializing parallel SMS and voice calls to verified guardians...
                </div>
              )}
            </div>
          </div>
        )}

        {/* Immediate Direct Emergency Call & Safety Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {/* Call 112 */}
          <a
            href="tel:112"
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-red-600 hover:bg-red-700 transition text-white text-xs font-bold gap-1.5 shadow-lg shadow-red-600/30"
          >
            <PhoneCall className="w-5 h-5 text-white animate-pulse" />
            <span>Call 112 Now</span>
          </a>

          {/* Call Guardian */}
          <a
            href={primaryPhone ? `tel:${primaryPhone}` : '#'}
            onClick={(e) => {
              if (!primaryPhone) {
                e.preventDefault();
                showToast('No verified guardian phone number configured.', 'warning');
              }
            }}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-amber-600 hover:bg-amber-700 transition text-white text-xs font-bold gap-1.5 shadow-lg shadow-amber-600/30"
            title={primaryPhone ? `Call Guardian: ${primaryPhone}` : 'No guardian number configured'}
          >
            <Phone className="w-5 h-5 text-white" />
            <span>Call Guardian</span>
          </a>

          {/* Call Nearest Police Station */}
          <a
            href="tel:100"
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 transition text-neutral-200 text-xs font-semibold gap-1.5"
          >
            <Phone className="w-5 h-5 text-blue-400" />
            <span>Call Police (100)</span>
          </a>

          {/* Audio Siren */}
          <button
            onClick={() => hardwareSafetyService.toggleSiren()}
            className={`flex flex-col items-center justify-center p-3 rounded-xl border transition text-xs font-semibold gap-1.5 ${
              hardwareState.isSirenActive
                ? 'bg-red-600 text-white border-red-400 shadow-glow-red animate-pulse'
                : 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:border-neutral-500'
            }`}
          >
            {hardwareState.isSirenActive ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            <span>{hardwareState.isSirenActive ? 'Siren ON' : 'Audio Siren'}</span>
          </button>

          {/* Copy Live Tracking Link */}
          <button
            onClick={handleCopyTrackingLink}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 transition text-purple-300 text-xs font-semibold gap-1.5"
          >
            <Copy className="w-5 h-5 text-purple-400" />
            <span>{copiedLink ? 'Copied!' : 'Copy Track Link'}</span>
          </button>
        </div>

        {/* PIN Cancel Bar (When Already Dispatched) */}
        {!isCountingDown && (
          <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-neutral-400">
              <Lock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Enter PIN to cancel SOS & send false alarm SMS:</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="password"
                maxLength={6}
                value={enteredPin}
                onChange={(e) => setEnteredPin(e.target.value)}
                placeholder="PIN"
                className="w-20 px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-center font-mono text-sm text-white focus:outline-none focus:border-purple-500"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelWithPin}
                disabled={isCancelling}
                className="border-amber-500/50 text-amber-300 hover:bg-amber-950"
              >
                End SOS
              </Button>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-2 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            onClick={closeEmergencyModal}
            className="text-neutral-400 hover:text-white text-xs sm:text-sm"
          >
            Minimize Dialog
          </Button>

          <Button
            variant="danger"
            onClick={handleOpenTracking}
            className="shadow-glow-red flex items-center gap-2 text-xs sm:text-sm"
          >
            <span>Open Live GPS Telemetry</span>
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
export default EmergencyWorkflowModal;
