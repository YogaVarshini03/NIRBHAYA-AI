import React, { useState, useRef, useEffect } from 'react';
import { ShieldAlert, AlertOctagon, Zap } from 'lucide-react';
import { useEmergency } from '../../context/EmergencyContext';
import { useToast } from '../../context/ToastContext';
import { audioService } from '../../services/audioService';

interface SosHoldButtonProps {
  size?: 'normal' | 'large';
  className?: string;
  source?: string;
}

export const SosHoldButton: React.FC<SosHoldButtonProps> = ({
  size = 'normal',
  className = '',
  source = 'Manual SOS Hold Button',
}) => {
  const { triggerSos } = useEmergency();
  const { showToast } = useToast();
  const [holding, setHolding] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [isActivated, setIsActivated] = useState<boolean>(false);

  const holdIntervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const beepsTriggeredRef = useRef<{ 1: boolean; 2: boolean }>({ 1: false, 2: false });
  const HOLD_DURATION_MS = 3000;

  const handlePointerDown = async (e: React.PointerEvent) => {
    // Only primary pointer button (left click or touch)
    if (e.button !== 0) return;

    // Prevent default touch/click delays
    e.preventDefault();

    setHolding(true);
    setIsActivated(false);
    setProgress(0);
    startTimeRef.current = Date.now();
    beepsTriggeredRef.current = { 1: false, 2: false };

    // 0.0s: Start continuous audible warning drone directly within pointerdown gesture
    audioService.startSosHoldFeedback();

    const interval = window.setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min(100, (elapsed / HOLD_DURATION_MS) * 100);
      setProgress(pct);

      // 1.0 sec (~33%): Audible confirmation beep 1
      if (elapsed >= 1000 && !beepsTriggeredRef.current[1]) {
        beepsTriggeredRef.current[1] = true;
        audioService.playHoldBeep(1);
      }

      // 2.0 sec (~66%): Audible confirmation beep 2
      if (elapsed >= 2000 && !beepsTriggeredRef.current[2]) {
        beepsTriggeredRef.current[2] = true;
        audioService.playHoldBeep(2);
      }

      // 3.0 sec (100%): Full activation
      if (elapsed >= HOLD_DURATION_MS) {
        clearInterval(interval);
        holdIntervalRef.current = null;
        setHolding(false);
        setProgress(100);
        setIsActivated(true);

        // Loud clear activation chime
        audioService.playSosActivatedSound();

        // Real emergency incident workflow trigger
        triggerSos(source);

        setTimeout(() => {
          setProgress(0);
          setIsActivated(false);
        }, 3000);
      }
    }, 25);

    holdIntervalRef.current = interval;
  };

  const cancelHold = (e?: React.PointerEvent) => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }

    // Immediately stop all audio tones upon release
    audioService.stopSosHoldFeedback();

    if (holding && progress < 98) {
      showToast('SOS hold released early. No emergency incident created.', 'info', 2000);
    }

    setHolding(false);
    setProgress(0);
  };

  useEffect(() => {
    return () => {
      if (holdIntervalRef.current) {
        clearInterval(holdIntervalRef.current);
      }
      audioService.stopSosHoldFeedback();
    };
  }, []);

  const dim = size === 'large' ? 240 : 180;
  const strokeWidth = size === 'large' ? 8 : 6;
  const radius = dim / 2 - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      <div
        className="relative flex items-center justify-center cursor-pointer group touch-none"
        style={{ width: dim, height: dim, touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerUp={cancelHold}
        onPointerCancel={cancelHold}
        onPointerLeave={cancelHold}
        onContextMenu={(e) => e.preventDefault()}
        role="button"
        tabIndex={0}
        aria-label="HOLD SOS — 3 SEC"
      >
        {/* Glow halo */}
        <div
          className={`absolute rounded-full transition-all duration-300 ${
            holding
              ? 'w-[110%] h-[110%] bg-red-600/40 filter blur-xl animate-pulse'
              : 'w-[95%] h-[95%] bg-red-600/20 filter blur-lg group-hover:bg-red-600/30'
          }`}
        />

        {/* SVG Progress Ring */}
        <svg
          width={dim}
          height={dim}
          className="absolute inset-0 transform -rotate-90 pointer-events-none"
        >
          {/* Base track */}
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={radius}
            fill="transparent"
            stroke="rgba(239, 68, 68, 0.2)"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={radius}
            fill="transparent"
            stroke="#EF4444"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-75"
            style={{
              filter: 'drop-shadow(0 0 10px rgba(239, 68, 68, 0.8))',
            }}
          />
        </svg>

        {/* Inner Button Circle */}
        <div
          className={`w-[82%] h-[82%] rounded-full bg-gradient-to-br from-red-600 via-red-700 to-red-900 border-2 border-red-400/40 flex flex-col items-center justify-center text-center shadow-glow-red transition-transform duration-150 ${
            holding ? 'scale-95' : 'group-hover:scale-[1.02]'
          }`}
        >
          <div className="relative">
            {isActivated ? (
              <Zap className="w-10 h-10 text-white animate-bounce mb-1" />
            ) : holding ? (
              <AlertOctagon className="w-10 h-10 text-white animate-spin-slow mb-1" />
            ) : (
              <ShieldAlert className="w-10 h-10 text-white mb-1 group-hover:scale-110 transition-transform" />
            )}
          </div>
          <span className="text-xs md:text-sm font-extrabold text-white tracking-widest uppercase drop-shadow-md">
            {isActivated
              ? 'EMERGENCY ACTIVATED'
              : holding
              ? `HOLDING... ${Math.round(progress)}%`
              : 'HOLD SOS — 3 SEC'}
          </span>
          <span className="text-[10px] text-red-200/90 font-semibold tracking-wide">
            {isActivated
              ? 'DISPATCHING REAL INCIDENT'
              : holding
              ? progress < 33
                ? 'AUDIBLE TONE ACTIVE (1s)'
                : progress < 66
                ? 'KEEP HOLDING (2s)'
                : 'ACTIVATION IMMINENT...'
              : '3 SEC CONTINUOUS HOLD'}
          </span>
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-400 font-medium text-center">
        Press & hold 3 seconds to activate real emergency distress workflow. Releasing early cancels sound & incident.
      </p>
    </div>
  );
};
