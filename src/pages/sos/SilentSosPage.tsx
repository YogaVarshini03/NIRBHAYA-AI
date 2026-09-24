import React, { useState } from 'react';
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
  Volume2
} from 'lucide-react';
import { useEmergency } from '../../context/EmergencyContext';
import { SosHoldButton } from '../../components/sos/SosHoldButton';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { useToast } from '../../context/ToastContext';

export const SilentSosPage: React.FC = () => {
  const { triggerSos } = useEmergency();
  const { showToast } = useToast();
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [voiceDetectedText, setVoiceDetectedText] = useState('');

  // Voice Trigger Simulation (Rule 24)
  const handleSimulateVoice = () => {
    setIsVoiceListening(true);
    setVoiceDetectedText('Listening...');
    showToast('Listening...', 'info', 1500);

    setTimeout(() => {
      setVoiceDetectedText('“Help” detected — DEMO');
      showToast('“Help” detected — DEMO', 'emergency', 2000);

      setTimeout(() => {
        setIsVoiceListening(false);
        setVoiceDetectedText('');
        triggerSos('Voice Trigger ("Help")');
      }, 1000);
    }, 1400);
  };

  // Shake Trigger Simulation
  const handleSimulateShake = () => {
    showToast('Simulating high-g accelerometer shake gesture...', 'info', 1500);
    setTimeout(() => {
      triggerSos('Accelerometer Shake Gesture');
    }, 800);
  };

  // Triple Press Simulation
  const handleSimulateTriplePress = () => {
    showToast('Simulating rapid hardware triple-press pattern...', 'info', 1500);
    setTimeout(() => {
      triggerSos('Hardware Triple-Press');
    }, 800);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
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

      {/* Hardware Trigger Simulations (Rule 23 & 24) */}
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-bold text-white">Alternate Hardware Sensor Triggers</h3>
          <p className="text-xs text-slate-400">
            Simulate physical device triggers that do not require turning on the phone screen.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Trigger 1: Voice Simulation */}
          <Card variant="glass" className="p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-300">
                <Mic className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-white">Secret Voice Passcode</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Background neural keyword engine trained to detect whispered distress phrases like "Help" or "Bachao".
              </p>
            </div>
            <Button
              variant="secondary"
              size="md"
              onClick={handleSimulateVoice}
              disabled={isVoiceListening}
              leftIcon={<Volume2 className="w-4 h-4 text-purple-400" />}
              className="w-full text-xs font-semibold"
            >
              Simulate Voice Trigger
            </Button>
          </Card>

          {/* Trigger 2: Shake Detection */}
          <Card variant="glass" className="p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-300">
                <Smartphone className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-white">High-G Shake Detection</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Accelerometer profile recognizing 3 consecutive rapid lateral shakes while the handset is locked in pocket.
              </p>
            </div>
            <Button
              variant="secondary"
              size="md"
              onClick={handleSimulateShake}
              leftIcon={<Zap className="w-4 h-4 text-cyan-400" />}
              className="w-full text-xs font-semibold"
            >
              Simulate Shake Trigger
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
              Simulate Triple Press
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
};
