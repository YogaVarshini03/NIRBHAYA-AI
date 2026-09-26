import React, { useState, useRef, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Navigation, AlertOctagon, Shield, FileLock2 } from 'lucide-react';
import { locationService } from '../../services/locationService';
import { useEmergency } from '../../context/EmergencyContext';
import { audioService } from '../../services/audioService';

interface MobileNavProps {
  onQuickSosClick?: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = () => {
  const { activeIncident, triggerSos } = useEmergency();
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [gpsStatus, setGpsStatus] = useState<string>(locationService.getStatus());
  const holdTimerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const beepTrackerRef = useRef<{ 1: boolean; 2: boolean }>({ 1: false, 2: false });
  const HOLD_DURATION_MS = 3000;

  useEffect(() => {
    return locationService.subscribe((_loc, status) => {
      setGpsStatus(status);
    });
  }, []);

  const isDistress = Boolean(
    activeIncident &&
    activeIncident.id !== 'NG-STANDBY' &&
    activeIncident.status !== 'RESOLVED'
  );

  const startHold = (e: React.MouseEvent | React.TouchEvent) => {
    if ('button' in e && e.button !== 0) return;

    setHolding(true);
    startTimeRef.current = Date.now();
    beepTrackerRef.current = { 1: false, 2: false };
    audioService.startSosHoldFeedback();

    const interval = window.setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min(100, (elapsed / HOLD_DURATION_MS) * 100);
      setProgress(pct);

      if (elapsed >= 1000 && !beepTrackerRef.current[1]) {
        beepTrackerRef.current[1] = true;
        audioService.playHoldBeep(1);
      }
      if (elapsed >= 2000 && !beepTrackerRef.current[2]) {
        beepTrackerRef.current[2] = true;
        audioService.playHoldBeep(2);
      }
      if (elapsed >= HOLD_DURATION_MS) {
        clearInterval(interval);
        holdTimerRef.current = null;
        setHolding(false);
        setProgress(0);
        audioService.stopSosHoldFeedback();
        audioService.playSosActivatedSound();
        triggerSos('Mobile Emergency Bar 3s Hold');
      }
    }, 35);

    holdTimerRef.current = interval;
  };

  const cancelHold = () => {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    audioService.stopSosHoldFeedback();
    setHolding(false);
    setProgress(0);
  };

  const itemClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center justify-center py-1.5 px-3 text-[10px] font-medium transition-colors ${
      isActive ? 'text-purple-400 font-bold' : 'text-slate-400 hover:text-slate-200'
    }`;

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 select-none">
      {/* Mobile Emergency Bar: [ LIVE STATUS ] [ HOLD SOS ] (Section 27) */}
      <div className="bg-navy-950/95 backdrop-blur-xl border-t border-white/10 px-4 py-2 flex items-center justify-between gap-2 shadow-2xl">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <span className="flex h-2 w-2 relative">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                isDistress ? 'bg-red-400' : 'bg-emerald-400'
              } opacity-75`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                isDistress ? 'bg-red-500' : 'bg-emerald-500'
              }`}
            />
          </span>
          <span className="font-mono text-[11px] text-slate-200">
            {isDistress
              ? 'EMERGENCY ACTIVE'
              : gpsStatus === 'LIVE_GPS'
              ? 'GPS CONNECTED'
              : 'GPS SEARCHING'}
          </span>
        </div>

        {/* 3-Second Hold SOS on Mobile */}
        <button
          onMouseDown={startHold}
          onMouseUp={cancelHold}
          onMouseLeave={cancelHold}
          onTouchStart={startHold}
          onTouchEnd={cancelHold}
          onTouchCancel={cancelHold}
          className={`relative px-4 py-1.5 rounded-full text-xs font-black tracking-wider uppercase flex items-center gap-1.5 transition-all touch-none overflow-hidden ${
            holding
              ? 'bg-red-700 text-white shadow-glow-red scale-105'
              : isDistress
              ? 'bg-red-600 text-white animate-pulse'
              : 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-md'
          }`}
          aria-label="Hold 3 seconds for SOS"
        >
          {holding && (
            <div
              className="absolute left-0 top-0 bottom-0 bg-white/20 pointer-events-none transition-all duration-75"
              style={{ width: `${progress}%` }}
            />
          )}
          <AlertOctagon className="w-3.5 h-3.5 text-white" />
          <span>
            {holding
              ? `HOLD ${Math.round(progress)}%`
              : isDistress
              ? 'DISTRESS ON'
              : 'HOLD SOS (3s)'}
          </span>
        </button>
      </div>

      {/* Navigation Icons Bar */}
      <nav className="h-14 bg-navy-950/98 backdrop-blur-xl border-t border-white/[0.06] flex items-center justify-around px-2">
        <NavLink to="/dashboard" className={itemClass}>
          <LayoutDashboard className="w-4 h-4 mb-0.5" />
          <span>Overview</span>
        </NavLink>

        <NavLink to="/safe-route" className={itemClass}>
          <Navigation className="w-4 h-4 mb-0.5" />
          <span>Routes</span>
        </NavLink>

        <NavLink to="/sos" className={itemClass}>
          <AlertOctagon className="w-4 h-4 mb-0.5 text-red-400" />
          <span className="text-red-400 font-bold">SOS Center</span>
        </NavLink>

        <NavLink to="/responder" className={itemClass}>
          <Shield className="w-4 h-4 mb-0.5" />
          <span>Responder</span>
        </NavLink>

        <NavLink to="/evidence" className={itemClass}>
          <FileLock2 className="w-4 h-4 mb-0.5" />
          <span>Vault</span>
        </NavLink>
      </nav>
    </div>
  );
};
