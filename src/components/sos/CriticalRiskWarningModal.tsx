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
  Info
} from 'lucide-react';
import { RiskAssessment } from '../../types';
import { useEmergency } from '../../context/EmergencyContext';
import { locationService } from '../../services/locationService';
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

  // Reset countdown whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setCountdown(10);
      setIsGpsLost(!locationService.getCurrentLocation());
    }
  }, [isOpen]);

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

    // If an incident is already active, close warning immediately (Rule 6: Prevent Duplicate SOS)
    if (
      activeIncident.id !== 'NG-STANDBY' &&
      activeIncident.status !== 'RESOLVED'
    ) {
      onCancel();
      return;
    }

    if (countdown <= 0) {
      // Countdown expired: Auto-trigger SOS
      onConfirmSos();
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [isOpen, countdown, isGpsLost, activeIncident.status]);

  if (!isOpen || !assessment) return null;

  const factors = assessment.factors;
  const descriptions = assessment.factorDescriptions || {};
  const confidence = assessment.confidence || 85;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/90 backdrop-blur-2xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-navy-950 border border-red-500/50 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(239,68,68,0.25)] z-10 text-white space-y-6">
        {/* Top Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-red-500/10 border border-red-500/40 text-red-400 mb-1 animate-pulse">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide uppercase">
            ⚠️ CRITICAL SAFETY RISK DETECTED
          </h2>
          <p className="text-xs text-slate-300">
            Your current environment has exceeded verified safety thresholds.
          </p>
        </div>

        {/* Central Score Card & Countdown Ring */}
        <div className="p-5 rounded-2xl bg-navy-900/80 border border-white/10 flex flex-col items-center justify-center text-center space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-4xl font-extrabold text-red-400 font-mono tracking-tight">
              {assessment.score}
              <span className="text-lg text-slate-400 font-normal"> / 100</span>
            </span>
            <Badge variant="critical" size="md">
              CRITICAL THREAT
            </Badge>
          </div>

          {/* Large Countdown */}
          {!isGpsLost ? (
            <div className="space-y-1">
              <span className="text-xs text-slate-400 block">
                Automatic emergency protection will activate in:
              </span>
              <div className="text-4xl sm:text-5xl font-black text-amber-400 font-mono tracking-widest animate-pulse">
                00:{countdown.toString().padStart(2, '0')}
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
              <span className="font-semibold block">GPS signal lost. Automatic SOS paused.</span>
              <span className="text-[11px] text-slate-400">
                You may still trigger SOS manually below.
              </span>
            </div>
          )}

          {/* Data Confidence Indicator (Rule 1 & 8) */}
          <div className="pt-2 flex items-center gap-2 text-[11px] text-slate-400 font-mono">
            <span>Data Confidence:</span>
            <span className="text-cyan-400 font-bold">{confidence}%</span>
            <span className="text-slate-500">•</span>
            <span>Real-time Multi-factor Analysis</span>
          </div>
        </div>

        {/* Transparent Factor Breakdown (Rule 8) */}
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-400 font-semibold uppercase text-[10px] tracking-wider px-1">
            <span>Safety Factor Breakdown</span>
            <span>Weighted Score</span>
          </div>

          <div className="grid grid-cols-1 gap-1.5">
            <div className="p-2.5 rounded-xl bg-navy-900/60 border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <div>
                  <span className="text-white font-medium block">Location Profile (30%)</span>
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
                  <span className="text-white font-medium block">Time Window (15%)</span>
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
                  <span className="text-white font-medium block">Pedestrian Density (15%)</span>
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
                  <span className="text-white font-medium block">Street Lighting (15%)</span>
                  <span className="text-[10px] text-slate-400">
                    {descriptions.lighting || 'Solar Day Illumination'}
                  </span>
                </div>
              </div>
              <span className="font-mono font-bold text-amber-300">{factors.lighting}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-navy-900/60 border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <div>
                  <span className="text-white font-medium block">Historical Crime Index (25%)</span>
                  <span className="text-[10px] text-slate-400">
                    {descriptions.historical || 'Precinct Records Baseline'}
                  </span>
                </div>
              </div>
              <span className="font-mono font-bold text-red-300">{factors.historicalDensity}</span>
            </div>
          </div>
        </div>

        {/* Disclaimer (Rule 17) */}
        <p className="text-[10px] text-slate-400 text-center italic leading-tight">
          Risk score is an experimental AI safety indicator calculated from available environmental signals and does not guarantee safety or danger.
        </p>

        {/* Action Buttons: CANCEL vs TRIGGER SOS NOW */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button
            variant="secondary"
            size="lg"
            onClick={onCancel}
            leftIcon={<XCircle className="w-5 h-5 text-slate-400" />}
            className="w-full text-slate-200 border-white/20 hover:bg-white/10"
          >
            CANCEL
          </Button>

          <Button
            variant="danger"
            size="lg"
            onClick={onConfirmSos}
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
