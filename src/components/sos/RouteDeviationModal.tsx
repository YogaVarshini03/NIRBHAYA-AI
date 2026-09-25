import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Compass,
  Navigation,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Zap,
  ArrowRight,
  RotateCcw
} from 'lucide-react';
import { RouteDeviationState } from '../../types';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';

interface RouteDeviationModalProps {
  isOpen: boolean;
  state: RouteDeviationState;
  onReturnToRoute: () => void;
  onUpdateRoute: () => void;
  onImSafe: () => void;
  onTriggerSos: () => void;
}

export const RouteDeviationModal: React.FC<RouteDeviationModalProps> = ({
  isOpen,
  state,
  onReturnToRoute,
  onUpdateRoute,
  onImSafe,
  onTriggerSos,
}) => {
  const [countdown, setCountdown] = useState<number>(10);
  const isCritical = state.deviationLevel === 'CRITICAL_DEVIATION';

  useEffect(() => {
    if (isOpen && isCritical) {
      setCountdown(10);
    }
  }, [isOpen, isCritical]);

  // If critical, count down to auto-SOS
  useEffect(() => {
    if (!isOpen || !isCritical) return;

    if (countdown <= 0) {
      onTriggerSos();
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [isOpen, isCritical, countdown]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/85 backdrop-blur-2xl animate-in fade-in duration-200">
      <div className={`relative w-full max-w-md bg-navy-950 border rounded-3xl p-6 sm:p-8 shadow-2xl z-10 text-white space-y-6 ${
        isCritical ? 'border-red-500 shadow-glow-red' : 'border-amber-500/60 shadow-glow-amber'
      }`}>
        {/* Header */}
        <div className="text-center space-y-2">
          <div className={`inline-flex p-3 rounded-2xl border mb-1 animate-pulse ${
            isCritical
              ? 'bg-red-500/20 border-red-500 text-red-400'
              : 'bg-amber-500/20 border-amber-500 text-amber-400'
          }`}>
            <Compass className="w-8 h-8" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide uppercase">
            {isCritical ? 'CRITICAL ROUTE DEVIATION' : 'ROUTE DEVIATION DETECTED'}
          </h2>
          <p className="text-xs text-slate-300">
            {isCritical
              ? 'You have significantly drifted away from your safe transit corridor.'
              : 'You have moved away from your selected safe route.'}
          </p>
        </div>

        {/* Metrics card */}
        <div className="p-4 rounded-2xl bg-navy-900/80 border border-white/10 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Deviation Distance:</span>
            <span className="font-mono font-bold text-amber-300 text-sm">
              +{state.deviationDistanceMeters} meters
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Designated Corridor:</span>
            <span className="font-semibold text-slate-200 truncate max-w-[180px]">
              {state.plannedRoute?.name || 'Safe Corridor'}
            </span>
          </div>

          {state.destination && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Destination:</span>
              <span className="font-semibold text-cyan-300 truncate max-w-[180px]">
                {state.destination.name}
              </span>
            </div>
          )}

          {isCritical && (
            <div className="pt-2 border-t border-red-500/30 text-center space-y-1">
              <span className="text-xs text-red-300 block font-semibold">
                Automatic Emergency SOS will activate in:
              </span>
              <div className="text-4xl font-black text-red-400 font-mono tracking-widest animate-pulse">
                00:{countdown.toString().padStart(2, '0')}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-2.5 pt-1">
          <Button
            variant="primary"
            size="md"
            onClick={onReturnToRoute}
            leftIcon={<Navigation className="w-4 h-4" />}
            className="w-full"
          >
            RETURN TO ROUTE
          </Button>

          <Button
            variant="secondary"
            size="md"
            onClick={onUpdateRoute}
            leftIcon={<RotateCcw className="w-4 h-4" />}
            className="w-full"
          >
            UPDATE ROUTE
          </Button>

          <Button
            variant="ghost"
            size="md"
            onClick={onImSafe}
            leftIcon={<ShieldCheck className="w-4 h-4 text-emerald-400" />}
            className="w-full text-slate-300 hover:text-white border border-white/10"
          >
            I'M SAFE (Acknowledge)
          </Button>

          {isCritical && (
            <Button
              variant="danger"
              size="md"
              onClick={onTriggerSos}
              leftIcon={<Zap className="w-4 h-4" />}
              className="w-full bg-red-600 hover:bg-red-500 text-white font-bold"
            >
              TRIGGER SOS NOW
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
