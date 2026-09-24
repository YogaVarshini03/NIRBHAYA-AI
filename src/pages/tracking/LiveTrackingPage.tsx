import React, { useState, useEffect } from 'react';
import {
  Radio,
  MapPin,
  Car,
  Clock,
  Phone,
  Share2,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { useEmergency } from '../../context/EmergencyContext';
import { SimulatedMap } from '../../components/map/SimulatedMap';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { useToast } from '../../context/ToastContext';
import { socketService } from '../../services/socketService';
import { locationService } from '../../services/locationService';

export const LiveTrackingPage: React.FC = () => {
  const { activeIncident } = useEmergency();
  const { showToast } = useToast();
  const [distanceKm, setDistanceKm] = useState(activeIncident.responder.distanceKm);
  const [etaSeconds, setEtaSeconds] = useState(272); // 4m 32s

  // Real WebSocket subscription and location telemetry
  useEffect(() => {
    if (activeIncident?.id) {
      socketService.subscribeToIncident(activeIncident.id, 'USER');
    }

    const unsubLoc = locationService.subscribe((gps) => {
      if (gps && activeIncident?.id) {
        socketService.sendLocation({
          incidentId: activeIncident.id,
          latitude: gps.latitude,
          longitude: gps.longitude,
          accuracy: gps.accuracy,
          speed: gps.speed,
          heading: gps.heading,
          altitude: gps.altitude,
          senderRole: 'USER',
        });
      }
    });

    const unsubWsLoc = socketService.on('LOCATION_UPDATE', (payload: any) => {
      console.log('[LiveTracking] Telemetry update received:', payload);
    });

    return () => {
      unsubLoc();
      unsubWsLoc();
    };
  }, [activeIncident?.id]);

  // Countdown simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setEtaSeconds((prev) => {
        if (prev <= 10) return 10;
        return prev - 1;
      });
      setDistanceKm((prev) => {
        if (prev <= 0.2) return 0.2;
        return Number((prev - 0.01).toFixed(2));
      });
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  const formatEta = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleShareLink = () => {
    navigator.clipboard?.writeText(window.location.href);
    showToast('Secure tracking link copied to clipboard — DEMO.', 'info');
  };

  const handleCallResponder = () => {
    showToast(`Connecting simulated secure voice channel with Officer Arjun Kumar (${activeIncident.responder.badgeNumber})...`, 'info', 3500);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
              Bi-Directional Telemetry Stream
            </span>
            <Badge variant="blue" size="sm" dot>
              Live Demo Simulation
            </Badge>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
            Live GPS Tracking & Telemetry
          </h2>
          <p className="text-sm text-slate-400">
            Real-time coordinates synced with rapid patrol unit and certified emergency safe sanctuaries.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleShareLink}
            leftIcon={<Share2 className="w-4 h-4" />}
          >
            Share Tracking Link
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleCallResponder}
            leftIcon={<Phone className="w-4 h-4" />}
          >
            Call Responder — DEMO
          </Button>
        </div>
      </div>

      {/* Top 3 Metric Cards: Responder Distance, Live ETA, Network Signal */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card variant="glass" className="p-6">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider">Responder Distance</span>
            <Car className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-extrabold text-white font-mono">
            {distanceKm} <span className="text-sm text-slate-400 font-normal">km</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Officer Arjun Kumar • {activeIncident.responder.badgeNumber}
          </p>
        </Card>

        <Card variant="glass" className="p-6">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider">Estimated Intercept ETA</span>
            <Clock className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-3xl font-extrabold text-purple-300 font-mono">
            {formatEta(etaSeconds)} <span className="text-sm text-slate-400 font-normal">min</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Status: <span className="text-emerald-400 font-semibold">{activeIncident.responder.status}</span>
          </p>
        </Card>

        <Card variant="glass" className="p-6">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider">Telemetry Link</span>
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-400 font-mono">
            99.8% <span className="text-sm text-slate-400 font-normal">Sync</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Location Accuracy: <span className="text-cyan-300 font-semibold">±4 meters (GPS Locked)</span>
          </p>
        </Card>
      </div>

      {/* Main Full-Size Tracking Map */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-semibold text-slate-200">High-Frequency GPS Stream Active</span>
          </div>
          <span>Updated every 2.5 seconds</span>
        </div>

        <SimulatedMap
          showResponder={true}
          showSafePoints={true}
          height="h-[540px]"
          userLocationText="Ananya Sharma (Distress Pin)"
        />
      </div>

      {/* Responder & Guardian Status Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card variant="glass" className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Car className="w-4 h-4 text-blue-400" />
              <span>Assigned Rapid Patrol Details</span>
            </h4>
            <Badge variant="blue" size="sm">
              PCR 14 Interceptor
            </Badge>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-white/5">
              <span className="text-slate-400">Officer Name:</span>
              <span className="font-semibold text-slate-200">Officer Arjun Kumar</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-white/5">
              <span className="text-slate-400">Badge & Call Sign:</span>
              <span className="font-mono text-cyan-300">RSP-1042 / Rapid Unit 7</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-white/5">
              <span className="text-slate-400">Dispatch Order:</span>
              <span className="text-slate-200">Incident NG-2048 Priority Alpha</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-400">Simulated Radio Frequency:</span>
              <span className="font-mono text-purple-300">462.5625 MHz (Encrypted Demo)</span>
            </div>
          </div>
        </Card>

        <Card variant="glass" className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Sanctuary & Safety Hubs</span>
            </h4>
            <Badge variant="low" size="sm">
              2 Open Havens
            </Badge>
          </div>
          <div className="space-y-2.5 text-xs text-slate-300">
            <div className="p-2.5 rounded-xl bg-navy-900/60 border border-white/5 flex items-center justify-between">
              <div>
                <p className="font-semibold text-white">Central Police Station Node</p>
                <p className="text-[10px] text-slate-400">1.2 km North-West • Armed Personnel On Duty</p>
              </div>
              <span className="text-emerald-400 font-mono font-bold">OPEN 24/7</span>
            </div>
            <div className="p-2.5 rounded-xl bg-navy-900/60 border border-white/5 flex items-center justify-between">
              <div>
                <p className="font-semibold text-white">City General Trauma Center</p>
                <p className="text-[10px] text-slate-400">1.9 km East • Secure Safe Haven Entry</p>
              </div>
              <span className="text-emerald-400 font-mono font-bold">OPEN 24/7</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
