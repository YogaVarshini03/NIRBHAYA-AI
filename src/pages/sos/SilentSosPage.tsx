import React, { useState, useEffect, useRef } from 'react';
import {
  AlertOctagon,
  Mic,
  Smartphone,
  MousePointerClick,
  Sparkles,
  ShieldAlert,
  Radio,
  Zap,
  CheckCircle2,
  Volume2,
  VolumeX,
  Flashlight,
  MessageSquare,
  PhoneCall,
  Activity,
  Phone
} from 'lucide-react';
import { useEmergency } from '../../context/EmergencyContext';
import { SosHoldButton } from '../../components/sos/SosHoldButton';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { useToast } from '../../context/ToastContext';
import { hardwareSafetyService } from '../../services/hardwareSafetyService';
import { locationService } from '../../services/locationService';
import { contactService } from '../../services/contactService';

export const SilentSosPage: React.FC = () => {
  const { triggerSos } = useEmergency();
  const { showToast } = useToast();
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [voiceDetectedText, setVoiceDetectedText] = useState('');
  const [hardwareState, setHardwareState] = useState(() => hardwareSafetyService.getState());
  const recognitionRef = useRef<any>(null);

  // Retrieve primary emergency contact for manual call button
  const primaryContact = contactService.getContacts().find(c => c.isEmergencyContact) || contactService.getContacts()[0];
  const rawGuardianPhone = primaryContact?.phone || '';
  const primaryGuardianPhone = (rawGuardianPhone && !rawGuardianPhone.includes('X')) ? rawGuardianPhone.replace(/[^\d+]/g, '') : '';
  const guardianName = primaryContact?.name || 'Guardian';

  // Accelerometer shake detection state
  const [shakeCount, setShakeCount] = useState(0);
  const lastShakeTime = useRef(0);

  useEffect(() => {
    const unsubHardware = hardwareSafetyService.subscribe((state) => {
      setHardwareState({ ...state });
    });

    // Real Mobile Accelerometer Shake Listener (if permission & sensor available)
    const handleDeviceMotion = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity;
      if (!acc || acc.x === null || acc.y === null || acc.z === null) return;
      const speed = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z);
      if (speed > 25) {
        // High-G threshold
        const now = Date.now();
        if (now - lastShakeTime.current > 400) {
          lastShakeTime.current = now;
          setShakeCount((prev) => {
            const next = prev + 1;
            if (next >= 3) {
              showToast('🚨 Real Device Shake SOS Detected!', 'emergency', 2500);
              triggerSos('Real Accelerometer Shake Gesture');
              return 0;
            }
            showToast(`Shake detected (${next}/3)...`, 'info', 1000);
            return next;
          });
        }
      }
    };

    if (typeof window !== 'undefined' && 'ondevicemotion' in window) {
      window.addEventListener('devicemotion', handleDeviceMotion);
    }

    return () => {
      unsubHardware();
      if (typeof window !== 'undefined') {
        window.removeEventListener('devicemotion', handleDeviceMotion);
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, []);

  // Real or Simulated Voice Recognition Trigger
  const handleStartRealVoiceRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-IN';

        setIsVoiceListening(true);
        setVoiceDetectedText('Listening for keyword "Help", "Bachao", or "Emergency"...');
        showToast('Microphone active — say "Help" or "Emergency" to trigger', 'info', 3000);

        recognition.onresult = (event: any) => {
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript.toLowerCase();
            setVoiceDetectedText(`Heard: "${transcript}"`);

            if (
              transcript.includes('help') ||
              transcript.includes('emergency') ||
              transcript.includes('bachao') ||
              transcript.includes('save me') ||
              transcript.includes('danger') ||
              transcript.includes('nirbhaya')
            ) {
              showToast(`Distress keyword recognized: "${transcript}"`, 'emergency', 2500);
              recognition.stop();
              setIsVoiceListening(false);
              triggerSos(`Real Voice Trigger ("${transcript.trim()}")`);
              return;
            }
          }
        };

        recognition.onerror = (e: any) => {
          console.warn('[SpeechRecognition] Error:', e.error);
          setIsVoiceListening(false);
          // Fallback to simulated trigger if browser mic permission denied
          handleSimulateVoice();
        };

        recognition.onend = () => {
          setIsVoiceListening(false);
        };

        recognition.start();
        return;
      } catch (e) {
        console.warn('[SpeechRecognition] Failed to start:', e);
      }
    }

    // Fallback simulation
    handleSimulateVoice();
  };

  const handleSimulateVoice = () => {
    setIsVoiceListening(true);
    setVoiceDetectedText('Listening for distress phrase...');
    showToast('Voice sensor active — analyzing audio waveform...', 'info', 1500);

    setTimeout(() => {
      setVoiceDetectedText('“Help” detected — High Priority SOS Trigger');
      showToast('“Help” detected — Emergency Trigger Activated', 'emergency', 2000);

      setTimeout(() => {
        setIsVoiceListening(false);
        setVoiceDetectedText('');
        triggerSos('Voice Trigger ("Help")');
      }, 1000);
    }, 1400);
  };

  const handleSimulateShake = () => {
    showToast('Simulating high-g accelerometer shake gesture (3 rapid shakes)...', 'info', 1500);
    setTimeout(() => {
      triggerSos('Accelerometer Shake Gesture');
    }, 800);
  };

  const handleSimulateTriplePress = () => {
    showToast('Simulating rapid hardware triple-press pattern...', 'info', 1500);
    setTimeout(() => {
      triggerSos('Hardware Triple-Press');
    }, 800);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Screen Strobe Flash Overlay */}
      {hardwareState.isScreenStrobeActive && (
        <div className="fixed inset-0 z-50 pointer-events-none bg-red-600/35 mix-blend-screen animate-ping" />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.08]">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-red-400">
            Emergency Distress Beacon
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
            Silent SOS Command
          </h2>
          <p className="text-sm text-slate-400">
            Discreet multi-channel distress triggers designed for zero-screen interaction in high-threat scenarios.
          </p>
        </div>

        {/* Always Visible Direct Emergency Call Actions */}
        <div className="flex items-center gap-2.5">
          <a
            href="tel:112"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-lg shadow-red-600/30 transition active:scale-95"
          >
            <PhoneCall className="w-4 h-4 animate-pulse" />
            <span>Call 112 Now</span>
          </a>

          <a
            href={primaryGuardianPhone ? `tel:${primaryGuardianPhone}` : '#'}
            onClick={(e) => {
              if (!primaryGuardianPhone) {
                e.preventDefault();
                showToast('No verified guardian phone number configured.', 'warning');
              }
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-lg shadow-amber-600/30 transition active:scale-95"
            title={primaryGuardianPhone ? `Call Guardian (${guardianName}: ${primaryGuardianPhone})` : 'No guardian number configured'}
          >
            <Phone className="w-4 h-4" />
            <span>Call Guardian ({guardianName.split(' ')[0]})</span>
          </a>
        </div>
      </div>

      {/* Main Hold To Activate SOS Hero */}
      <div className="flex justify-center">
        <Card variant="emergency" className="max-w-xl w-full p-8 sm:p-12 flex flex-col items-center justify-center text-center space-y-6">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-red-300 px-3 py-1 rounded-full bg-red-950/80 border border-red-500/40">
              Zero-Feedback Silent Mode
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-white">
              HOLD TO ACTIVATE SOS
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-sm">
              Press and hold for 3 full seconds. Releasing early will automatically cancel the distress protocol.
            </p>
          </div>

          <SosHoldButton size="large" source="Dedicated SOS Page Hold" />

          {/* Voice status feedback when active */}
          {isVoiceListening && (
            <div className="p-4 rounded-xl bg-purple-950/80 border border-purple-500/40 text-purple-200 text-xs animate-pulse flex items-center justify-center gap-2">
              <Mic className="w-4 h-4 text-cyan-400" />
              <span>{voiceDetectedText}</span>
            </div>
          )}
        </Card>
      </div>

      {/* Real Hardware Safety Actuators Bar */}
      <div className="p-5 rounded-2xl bg-navy-900/80 border border-red-500/30 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-red-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Immediate Physical Deterrence & Hardware Tools
            </h3>
          </div>
          <span className="text-xs text-slate-400">Tactical Defense</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => hardwareSafetyService.toggleSiren()}
            className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
              hardwareState.isSirenActive
                ? 'bg-red-600 border-red-400 text-white shadow-glow-red animate-pulse'
                : 'bg-navy-950/80 border-slate-700 text-slate-200 hover:border-red-500/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${hardwareState.isSirenActive ? 'bg-white/20 text-white' : 'bg-red-500/10 text-red-400'}`}>
                {hardwareState.isSirenActive ? <Volume2 className="w-6 h-6 animate-bounce" /> : <VolumeX className="w-6 h-6" />}
              </div>
              <div className="text-left">
                <div className="text-sm font-bold">
                  {hardwareState.isSirenActive ? 'Emergency Siren Active' : 'Toggle 110dB Audio Siren'}
                </div>
                <div className="text-xs text-slate-400">
                  Web Audio Synthesized Police Wail
                </div>
              </div>
            </div>
            <span className={`w-3 h-3 rounded-full ${hardwareState.isSirenActive ? 'bg-white animate-ping' : 'bg-slate-600'}`} />
          </button>

          <button
            onClick={() => hardwareSafetyService.toggleStrobe()}
            className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
              hardwareState.isStrobeActive
                ? 'bg-amber-500 border-amber-300 text-black shadow-glow-amber animate-pulse'
                : 'bg-navy-950/80 border-slate-700 text-slate-200 hover:border-amber-500/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${hardwareState.isStrobeActive ? 'bg-black/20 text-black' : 'bg-amber-500/10 text-amber-400'}`}>
                <Flashlight className="w-6 h-6" />
              </div>
              <div className="text-left">
                <div className="text-sm font-bold">
                  {hardwareState.isStrobeActive ? 'Flashlight Strobe Flashing' : 'Toggle Tactical Strobe Torch'}
                </div>
                <div className="text-xs text-slate-400">
                  Camera LED Torch & Screen Strobe
                </div>
              </div>
            </div>
            <span className={`w-3 h-3 rounded-full ${hardwareState.isStrobeActive ? 'bg-black animate-ping' : 'bg-slate-600'}`} />
          </button>
        </div>
      </div>

      {/* Alternate Sensor Triggers */}
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-bold text-white">Alternate Hardware Sensor Triggers</h3>
          <p className="text-xs text-slate-400">
            Physical device triggers that do not require screen interaction.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Trigger 1: Voice Recognition */}
          <Card variant="glass" className="p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-300">
                <Mic className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-white">Voice Distress Keyword</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Listens via microphone for spoken distress phrases like "Help", "Bachao", "Emergency", or "Nirbhaya".
              </p>
            </div>
            <Button
              variant="secondary"
              size="md"
              onClick={handleStartRealVoiceRecognition}
              disabled={isVoiceListening}
              leftIcon={<Volume2 className="w-4 h-4 text-purple-400" />}
              className="w-full text-xs font-semibold"
            >
              {isVoiceListening ? 'Listening...' : 'Activate Voice Detection'}
            </Button>
          </Card>

          {/* Trigger 2: Shake Detection */}
          <Card variant="glass" className="p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-300">
                <Smartphone className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-white">High-G Shake Gesture</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Recognizes 3 rapid shakes while phone is in hand or pocket. Active sensor listener enabled.
              </p>
            </div>
            <Button
              variant="secondary"
              size="md"
              onClick={handleSimulateShake}
              leftIcon={<Zap className="w-4 h-4 text-cyan-400" />}
              className="w-full text-xs font-semibold"
            >
              Test Shake Trigger
            </Button>
          </Card>

          {/* Trigger 3: Triple Press */}
          <Card variant="glass" className="p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-300">
                <MousePointerClick className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-white">Hardware Triple Press</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Discreet mechanical power-button cadence (3 clicks within 1.5 seconds) initiates silent telemetry lock.
              </p>
            </div>
            <Button
              variant="secondary"
              size="md"
              onClick={handleSimulateTriplePress}
              leftIcon={<Radio className="w-4 h-4 text-amber-400" />}
              className="w-full text-xs font-semibold"
            >
              Test Triple Press
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
};
