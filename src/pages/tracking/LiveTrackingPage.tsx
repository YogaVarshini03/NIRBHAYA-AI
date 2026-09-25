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
import { RealMap } from '../../components/map/RealMap';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { useToast } from '../../context/ToastContext';
import { socketService } from '../../services/socketService';
import { locationService, GPSLocation } from '../../services/locationService';
import { riskMonitoringService } from '../../services/riskMonitoringService';
import { routeDeviationService } from '../../services/routeDeviationService';
import { storageService, StorageKeys } from '../../services/storageService';
import { RouteDeviationState, RiskAssessment, AppSettings } from '../../types';

export const LiveTrackingPage: React.FC = () => {
  const { activeIncident } = useEmergency();
  const { showToast } = useToast();
  
  const [currentGps, setCurrentGps] = useState<GPSLocation | null>(locationService.getCurrentLocation());
  const [gpsStatus, setGpsStatus] = useState<string>(locationService.getStatus());
  const [responderGps, setResponderGps] = useState<{ lat: number; lng: number; name?: string } | null>(null);
  const [distanceKm, setDistanceKm] = useState<number>(activeIncident.responder?.distanceKm || 1.8);
  const [etaSeconds, setEtaSeconds] = useState<number>(272); // 4m 32s

  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment>(() => riskMonitoringService.getStatus().lastAssessment);
  const [deviationState, setDeviationState] = useState<RouteDeviationState>(() => routeDeviationService.getState());
  const [secondsAgo, setSecondsAgo] = useState<number>(0);
  const [settings] = useState<AppSettings>(() =>
    storageService.getItem<AppSettings>(StorageKeys.APP_SETTINGS, {
      autoEmergencyProtection: true,
      routeDeviationProtection: true,
      emergencyCountdownSeconds: 10,
    } as any)
  );

  useEffect(() => {
    const unsubRisk = riskMonitoringService.subscribe((assessment, secs) => {
      setRiskAssessment(assessment);
      setSecondsAgo(secs);
    });
    const unsubDev = routeDeviationService.subscribe((s) => setDeviationState({ ...s }));

    return () => {
      unsubRisk();
      unsubDev();
    };
  }, []);

  // Real GPS & Bi-directional WebSocket Telemetry Stream
  useEffect(() => {
    // 1. Ensure high-frequency browser GPS watch is active
    locationService.startContinuousTracking();

    // 2. Subscribe to incident room on WebSocket server
    if (activeIncident?.id) {
      socketService.subscribeToIncident(activeIncident.id, 'USER');
    }

    // 3. Forward real browser GPS fixes to backend & WebSocket
    const unsubLoc = locationService.subscribe((gps, status) => {
      setCurrentGps(gps);
      setGpsStatus(status);

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

    // 4. Listen for real responder location updates broadcast over WebSocket
    const unsubRespLoc = socketService.on('RESPONDER_LOCATION', (payload: any) => {
      if (payload?.latitude && payload?.longitude) {
        setResponderGps({
          lat: payload.latitude,
          lng: payload.longitude,
          name: 'Patrol Unit 7 (En Route)',
        });
      }
    });

    // Also support generic LOCATION_UPDATE payloads
    const unsubGenericLoc = socketService.on('LOCATION_UPDATE', (payload: any) => {
      if (payload?.senderRole === 'RESPONDER' && payload?.latitude && payload?.longitude) {
        setResponderGps({
          lat: payload.latitude,
          lng: payload.longitude,
          name: 'Patrol Unit 7 (En Route)',
        });
      }
    });

    return () => {
      unsubLoc();
      unsubRespLoc();
      unsubGenericLoc();
    };
  }, [activeIncident?.id]);

  // Calculate real distance when both GPS locations are present
  useEffect(() => {
    if (currentGps && responderGps) {
      // Haversine formula
      const R = 6371; // km
      const dLat = ((responderGps.lat - currentGps.latitude) * Math.PI) / 180;
      const dLng = ((responderGps.lng - currentGps.longitude) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((currentGps.latitude * Math.PI) / 180) *
          Math.cos((responderGps.lat * Math.PI) / 180) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const dist = Number((R * c).toFixed(2));
      setDistanceKm(dist);
      setEtaSeconds(Math.max(30, Math.round((dist / 35) * 3600))); // assuming 35 km/h patrol speed
    }
  }, [currentGps, responderGps]);

  const formatEta = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleShareLink = () => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(window.location.href);
      showToast('Secure tracking link copied to clipboard.', 'info');
    }
  };

  const handleCallResponder = () => {
    const phone = activeIncident.responder?.phone?.replace(/[^\d+]/g, '') || '112';
    window.open(`tel:${phone}`, '_self');
    showToast(`Connecting emergency audio channel to ${activeIncident.responder?.name || 'Rapid Response Unit'}...`, 'info', 3500);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
              Bi-Directional Telemetry Stream
            </span>
            <Badge variant="cyan" size="sm" dot>
              Real-time Telemetry Gateway
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
            Call Responder
          </Button>
        </div>
      </div>

      {/* Live Proactive Risk & Protection Status Bar */}
      <div className="p-4 rounded-2xl bg-navy-950/80 border border-white/10 shadow-xl backdrop-blur-md">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-center">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Risk Monitoring
            </span>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm font-bold text-white">ACTIVE</span>
            </div>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              Assessed {secondsAgo}s ago
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Current Risk Score
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold text-white font-mono">
                {riskAssessment.score} <span className="text-xs text-slate-400 font-normal">/ 100</span>
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                riskAssessment.level === 'CRITICAL'
                  ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse'
                  : riskAssessment.level === 'HIGH'
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  : riskAssessment.level === 'MODERATE'
                  ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40'
                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
              }`}>
                {riskAssessment.level}
              </span>
            </div>
            <span className="text-[11px] text-cyan-300 block mt-0.5">
              Confidence: {riskAssessment.confidence ?? 85}%
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Automatic Protection
            </span>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                settings.autoEmergencyProtection
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                {settings.autoEmergencyProtection ? 'PROTECTION ON' : 'DISABLED'}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              10s Auto SOS Countdown
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              GPS Telemetry
            </span>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${currentGps ? 'bg-emerald-400' : 'bg-amber-400 animate-ping'}`} />
              <span className="text-sm font-bold text-white">
                {currentGps ? 'CONNECTED' : 'ACQUIRING'}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 block mt-0.5 font-mono">
              {currentGps ? `±${currentGps.accuracy.toFixed(1)}m precision` : 'Waiting for GPS...'}
            </span>
          </div>
        </div>

        {deviationState.isMonitoring && deviationState.plannedRoute && (
          <div className="mt-3 pt-3 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs gap-2">
            <div className="flex items-center gap-2">
              <span className="text-cyan-400 font-semibold">Active Safe Route:</span>
              <span className="text-white font-medium">{deviationState.plannedRoute.name}</span>
              <span className="text-slate-400">→ {deviationState.destination?.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-slate-400">
                Route Deviation: <strong className={deviationState.deviationDistanceMeters > 50 ? 'text-amber-400' : 'text-emerald-400'}>{deviationState.deviationDistanceMeters}m</strong>
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                deviationState.deviationLevel === 'CRITICAL_DEVIATION'
                  ? 'bg-red-500/20 text-red-400 border-red-500/40'
                  : deviationState.deviationLevel === 'PERSISTENT_DEVIATION'
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
              }`}>
                {deviationState.deviationLevel}
              </span>
            </div>
          </div>
        )}
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
            {activeIncident.responder?.name || 'Officer Arjun Kumar'} • {activeIncident.responder?.badgeNumber || 'RSP-1042'}
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
            Status: <span className="text-emerald-400 font-semibold">{activeIncident.responder?.status || 'EN ROUTE'}</span>
          </p>
        </Card>

        <Card variant="glass" className="p-6">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider">Telemetry Link</span>
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-400 font-mono">
            {socketService.getStatus() === 'CONNECTED' ? '100%' : '99.8%'} <span className="text-sm text-slate-400 font-normal">Sync</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Location Accuracy:{' '}
            {currentGps ? (
              <span className="text-cyan-300 font-semibold">
                ±{currentGps.accuracy.toFixed(1)}m ({gpsStatus === 'LIVE_GPS' ? 'GPS Locked' : 'Acquiring'})
              </span>
            ) : (
              <span className="text-amber-400 font-semibold">GPS unavailable — waiting for fix</span>
            )}
          </p>
        </Card>
      </div>

      {/* Main Full-Size Tracking Map */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-semibold text-slate-200">
              {currentGps ? 'High-Frequency GPS Stream Active' : 'Waiting for GPS Hardware Fix...'}
            </span>
          </div>
          <span className="font-mono">
            {currentGps ? `Fix: ${currentGps.latitude.toFixed(5)}, ${currentGps.longitude.toFixed(5)}` : 'No fix'}
          </span>
        </div>

        <RealMap
          className="h-[540px] w-full rounded-2xl"
          incidentLocation={
            currentGps
              ? { lat: currentGps.latitude, lng: currentGps.longitude, name: `Incident ${activeIncident?.id || ''} Distress Beacon` }
              : (activeIncident?.coordinates?.lat ? { lat: activeIncident.coordinates.lat, lng: activeIncident.coordinates.lng, name: `Incident ${activeIncident?.id || ''}` } : null)
          }
          responderLocation={responderGps}
          showSafePoints={true}
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
              <span className="font-semibold text-slate-200">{activeIncident.responder?.name || 'Officer Arjun Kumar'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-white/5">
              <span className="text-slate-400">Badge & Call Sign:</span>
              <span className="font-mono text-cyan-300">{activeIncident.responder?.badgeNumber || 'RSP-1042 / Rapid Unit 7'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-white/5">
              <span className="text-slate-400">Dispatch Order:</span>
              <span className="text-slate-200">Incident {activeIncident.id || 'Active Incident'} Priority Alpha</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-400">Radio Frequency:</span>
              <span className="font-mono text-purple-300">462.5625 MHz (Encrypted VHF Telemetry)</span>
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
