import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  Clock,
  MapPin,
  Users,
  Sun,
  History,
  XCircle,
  Zap,
  Info,
  Volume2,
  VolumeX,
  Radio
} from 'lucide-react';
import { RiskAssessment } from '../../types';
import { useEmergency } from '../../context/EmergencyContext';
import { locationService } from '../../services/locationService';
import { audioService } from '../../services/audioService';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';

interface CriticalRiskWarningModalProps {
  isOpen: boolean;
  assessment: RiskAssessment | null;
  onCancel: () => void;
  onConfirmSos: () => void;
}

export const CriticalRiskWarningModal: React.FC<CriticalRiskWarningModalProps> = ({
  isOpen,
  assessment,
  onCancel,
  onConfirmSos,
}) => {
  const { activeIncident } = useEmergency();
  const [countdown, setCountdown] = useState<number>(10);
  const [isGpsLost, setIsGpsLost] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(audioService.isMuted());
  const [isAudioBlocked, setIsAudioBlocked] = useState<boolean>(false);

  // Start emergency warning audio & reset countdown whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setCountdown(10);
      setIsGpsLost(!locationService.getCurrentLocation());
      audioService.startCriticalRiskWarning(isMuted).then((res) => {
        setIsAudioBlocked(res.audioBlocked);
      });
    } else {
      audioService.stopCriticalRiskWarning();
      setIsAudioBlocked(false);
    }

    return () => {
      audioService.stopCriticalRiskWarning();
    };
  }, [isOpen]);

  const handleEnableAudio = async () => {
    await audioService.ensureAudioReady();
    const res = await audioService.startCriticalRiskWarning(false);
    setIsAudioBlocked(res.audioBlocked);
    setIsMuted(false);
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    audioService.setMuted(nextMuted);
    if (!nextMuted && isOpen) {
      audioService.startCriticalRiskWarning(false).then((res) => {
        setIsAudioBlocked(res.audioBlocked);
      });
    }
  };

  const handleCancel = () => {
    audioService.stopCriticalRiskWarning();
    onCancel();
  };

  const handleConfirmSos = () => {
    audioService.stopCriticalRiskWarning();
    audioService.playSosActivatedSound();
    onConfirmSos();
  };

  // Monitor live GPS during countdown (Rule 7: False Alarm Protection)
  useEffect(() => {
    if (!isOpen) return;

    const unsub = locationService.subscribe((loc, status) => {
      if (!loc || status === 'POSITION_UNAVAILABLE' || status === 'PERMISSION_DENIED') {
        setIsGpsLost(true);
      } else {
        setIsGpsLost(false);
      }
    });

    return unsub;
  }, [isOpen]);

  // Countdown timer: 10s -> 0
  useEffect(() => {
    if (!isOpen || isGpsLost) return;

    // If an incident is already active, close warning immediately
    if (
      activeIncident.id !== 'NG-STANDBY' &&
      activeIncident.status !== 'RESOLVED'
    ) {
      handleCancel();
      return;
    }

    if (countdown <= 0) {
      // Countdown expired: Auto-trigger SOS
      handleConfirmSos();
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [isOpen, countdown, isGpsLost, activeIncident.status]);

  if (!isOpen || !assessment) return null;

  const currentGps = locationService.getCurrentLocation();
  const gpsLabel = currentGps ? `GPS VERIFIED (±${Math.round(currentGps.accuracy)}m)` : 'GPS SEARCHING';

  const factors = assessment.factors;
  const descriptions = assessment.factorDescriptions || {};
  const confidence = assessment.confidence || 85;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/90 backdrop-blur-2xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-navy-950 border border-red-500/50 rounded-3xl p-6 sm:p-8 shadow-[0_0_60px_rgba(239,68,68,0.35)] z-10 text-white space-y-6">
        
        {/* Top Status & Audio Control Bar */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </span>
            <span className="text-xs font-bold tracking-wider uppercase text-red-400">
              {gpsLabel}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isAudioBlocked && (
              <button
                onClick={handleEnableAudio}
                className="px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-300 text-[11px] font-bold animate-pulse hover:bg-amber-500/30 transition-all"
              >
                AUDIO BLOCKED — TAP TO ENABLE WARNING
              </button>
            )}
            <button
              onClick={toggleMute}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 transition-colors"
              title={isMuted ? 'Unmute Emergency Siren' : 'Mute Emergency Siren'}
            >
              {isMuted ? (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-amber-400" />
                  <span>MUTED</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                  <span className="text-red-400">SIREN ON</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Top Header & Visual Badge */}
        <div className="text-center space-y-2">
          <div className="relative inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-red-600/30 to-red-950/80 border border-red-500/50 text-red-400 mb-1 shadow-glow-red">
            <ShieldAlert className="w-10 h-10 animate-pulse" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide uppercase">
            CRITICAL RISK DETECTED
          </h2>
          <p className="text-xs text-slate-300">
            Elevated environmental threat factors detected. Automatic emergency dispatch armed.
          </p>
        </div>

        {/* Central Score Card & Countdown Ring */}
        <div className="p-5 rounded-2xl bg-navy-900/80 border border-red-500/20 flex flex-col items-center justify-center text-center space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-4xl font-extrabold text-red-400 font-mono tracking-tight">
              {assessment.score}
              <span className="text-lg text-slate-400 font-normal"> / 100</span>
            </span>
            <Badge variant="critical" size="md">
              CRITICAL SAFETY STATE
            </Badge>
          </div>

          {/* Large Countdown */}
          {!isGpsLost ? (
            <div className="space-y-1">
              <span className="text-xs text-slate-400 block font-medium">
                Automatic emergency SOS dispatch in:
              </span>
              <div className="text-4xl sm:text-5xl font-black text-amber-400 font-mono tracking-widest animate-pulse">
                {countdown}s
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
              <span className="font-semibold block">GPS acquiring. Automatic countdown paused.</span>
              <span className="text-[11px] text-slate-400">
                You may still trigger SOS manually below.
              </span>
            </div>
          )}

          {/* Data Confidence Indicator */}
          <div className="pt-1 flex items-center gap-2 text-[11px] text-slate-400 font-mono">
            <span>Confidence:</span>
            <span className="text-cyan-400 font-bold">{confidence}%</span>
            <span className="text-slate-500">•</span>
            <span>Live Multi-factor Analysis</span>
          </div>
        </div>

        {/* Transparent Factor Breakdown with Truthful Badges */}
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-400 font-semibold uppercase text-[10px] tracking-wider px-1">
            <span>Safety Factor Breakdown</span>
            <span>Weight & Score</span>
          </div>

          <div className="grid grid-cols-1 gap-1.5">
            <div className="p-2.5 rounded-xl bg-navy-900/60 border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-white font-medium">Location Profile (30%)</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono font-semibold">MODEL-BASED</span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {descriptions.location || 'Data unavailable'}
                  </span>
                </div>
              </div>
              <span className="font-mono font-bold text-red-300">{factors.locationRisk}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-navy-900/60 border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-white font-medium">Time Window (15%)</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-mono font-semibold">CALCULATED</span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {descriptions.time || 'Daytime Window'}
                  </span>
                </div>
              </div>
              <span className="font-mono font-bold text-amber-300">{factors.timeRisk}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-navy-900/60 border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-white font-medium">Crowd Density (15%)</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono font-semibold">ESTIMATED</span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {descriptions.crowd || 'Data unavailable'}
                  </span>
                </div>
              </div>
              <span className="font-mono font-bold text-amber-300">{factors.crowdDensity}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-navy-900/60 border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-white font-medium">Street Lighting (15%)</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono font-semibold">ESTIMATED</span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {descriptions.lighting || 'Solar Illumination Model'}
                  </span>
                </div>
              </div>
              <span className="font-mono font-bold text-amber-300">{factors.lighting}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-navy-900/60 border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-white font-medium">Historical Risk (25%)</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono font-semibold">BASELINE</span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {descriptions.historical || 'Precinct Records Baseline'}
                  </span>
                </div>
              </div>
              <span className="font-mono font-bold text-red-300">{factors.historicalDensity}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons: CANCEL vs TRIGGER SOS NOW */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button
            variant="secondary"
            size="lg"
            onClick={handleCancel}
            leftIcon={<XCircle className="w-5 h-5 text-slate-400" />}
            className="w-full text-slate-200 border-white/20 hover:bg-white/10"
          >
            CANCEL
          </Button>

          <Button
            variant="danger"
            size="lg"
            onClick={handleConfirmSos}
            leftIcon={<Zap className="w-5 h-5 text-white" />}
            className="w-full bg-red-600 hover:bg-red-500 font-black shadow-glow-red text-white"
          >
            TRIGGER SOS NOW
          </Button>
        </div>
      </div>
    </div>
  );
};
