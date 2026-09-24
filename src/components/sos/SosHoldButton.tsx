import React, { useState, useRef, useEffect } from 'react';
import { ShieldAlert, AlertOctagon } from 'lucide-react';
import { useEmergency } from '../../context/EmergencyContext';
import { useToast } from '../../context/ToastContext';

interface SosHoldButtonProps {
  size?: 'normal' | 'large';
  className?: string;
  source?: string;
}

export const SosHoldButton: React.FC<SosHoldButtonProps> = ({
  size = 'normal',
  className = '',
  source = 'Quick SOS Button',
}) => {
  const { triggerSos } = useEmergency();
  const { showToast } = useToast();
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 100%
  const holdTimerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const HOLD_DURATION_MS = 3000;

  const startHold = () => {
    setHolding(true);
    startTimeRef.current = Date.now();

    const interval = window.setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min(100, (elapsed / HOLD_DURATION_MS) * 100);
      setProgress(pct);

      if (elapsed >= HOLD_DURATION_MS) {
        clearInterval(interval);
        setHolding(false);
        setProgress(0);
        triggerSos(source);
      }
    }, 40);

    holdTimerRef.current = interval;
  };

  const cancelHold = () => {
    if (holding && progress < 98) {
      showToast('SOS cancelled.', 'info', 2500);
    }
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setHolding(false);
    setProgress(0);
  };

  useEffect(() => {
    return () => {
      if (holdTimerRef.current) {
        clearInterval(holdTimerRef.current);
      }
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
        style={{ width: dim, height: dim }}
        onMouseDown={startHold}
        onMouseUp={cancelHold}
        onMouseLeave={cancelHold}
        onTouchStart={startHold}
        onTouchEnd={cancelHold}
        onTouchCancel={cancelHold}
        role="button"
        tabIndex={0}
        aria-label="Hold for 3 seconds to activate emergency SOS simulation"
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
            {holding ? (
              <AlertOctagon className="w-10 h-10 text-white animate-spin-slow mb-1" />
            ) : (
              <ShieldAlert className="w-10 h-10 text-white mb-1 group-hover:scale-110 transition-transform" />
            )}
          </div>
          <span className="text-xs md:text-sm font-extrabold text-white tracking-widest uppercase drop-shadow-md">
            {holding ? `${Math.round(progress)}%` : 'HOLD TO ACTIVATE'}
          </span>
          <span className="text-[10px] text-red-200/80 font-medium tracking-wide">
            {holding ? 'KEEP HOLDING' : 'HOLD 3 SEC'}
          </span>
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-400 font-medium text-center">
        Emergency trigger transmits real GPS coordinates & alerts verified contacts.
      </p>
    </div>
  );
};
