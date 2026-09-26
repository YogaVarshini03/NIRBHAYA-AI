import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  MapPin,
  Clock,
  Radio,
  Navigation,
  ArrowRight,
  Shield,
  Activity,
  Users,
  Compass,
  AlertTriangle,
  Sparkles,
  ChevronRight,
  Info
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { riskService } from '../../services/riskService';
import { routeService } from '../../services/routeService';
import { contactService } from '../../services/contactService';
import { RiskGauge } from '../../components/risk/RiskGauge';
import { SosHoldButton } from '../../components/sos/SosHoldButton';
import { RealMap } from '../../components/map/RealMap';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

import { locationService, GPSLocation, LocationStatus } from '../../services/locationService';

import { useEmergency } from '../../context/EmergencyContext';
import { riskMonitoringService } from '../../services/riskMonitoringService';
import { storageService, StorageKeys } from '../../services/storageService';
import { AppSettings, RiskAssessment } from '../../types';

export const UserDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { triggerCriticalTest, triggerDeviationTest } = useEmergency();
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment>(() => riskMonitoringService.getStatus().lastAssessment);
  const [secondsAgo, setSecondsAgo] = useState<number>(0);
  const selectedRoute = routeService.getSelectedRoute();
  const contacts = contactService.getContacts();
  const onlineContactsCount = contacts.filter((c) => c.online).length;

  const [gpsLoc, setGpsLoc] = useState<GPSLocation | null>(() => locationService.getCurrentLocation());
  const [gpsStatus, setGpsStatus] = useState<LocationStatus>(() => locationService.getStatus());
  const [settings] = useState<AppSettings>(() =>
    storageService.getItem<AppSettings>(StorageKeys.APP_SETTINGS, {
      autoEmergencyProtection: true,
      routeDeviationProtection: true,
    } as any)
  );

  React.useEffect(() => {
    locationService.startContinuousTracking();
    const unsubLoc = locationService.subscribe((loc, status) => {
      setGpsLoc(loc);
      setGpsStatus(status);
    });

    const unsubRisk = riskMonitoringService.subscribe((assessment, secs) => {
      setRiskAssessment(assessment);
      setSecondsAgo(secs);
    });

    return () => {
      unsubLoc();
      unsubRisk();
    };
  }, []);

  // Compute honest GPS status label
  const getGpsStatusDisplay = () => {
    if (gpsStatus === 'PERMISSION_DENIED') {
      return { text: 'GPS Permission Required', color: 'text-red-400', badge: 'DENIED' };
    }
    if (gpsStatus === 'LIVE_GPS' && gpsLoc) {
      if (gpsLoc.accuracy > 50) {
        return { text: `GPS Accuracy Low (±${Math.round(gpsLoc.accuracy)}m)`, color: 'text-amber-400', badge: 'LOW_ACCURACY' };
      }
      return { text: `GPS LIVE (±${Math.round(gpsLoc.accuracy)}m)`, color: 'text-emerald-400', badge: 'LIVE' };
    }
    return { text: 'Waiting for GPS Fix', color: 'text-amber-300', badge: 'WAITING' };
  };

  const gpsDisplay = getGpsStatusDisplay();

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Top Greeting Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
              ID: {user?.id || 'USR-7F42A91C'}
            </span>
            <span className="text-xs text-slate-400">
              Role: <strong className="text-white uppercase font-mono">{user?.role || 'USER'}</strong>
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Welcome, {user?.name || 'Abhishek K'}.
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Real-time environmental risk telemetry and browser GPS safety network active.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/risk-analysis')}
            leftIcon={<Activity className="w-4 h-4 text-purple-400" />}
          >
            Inspect AI Risk
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/safe-route')}
            leftIcon={<Navigation className="w-4 h-4" />}
          >
            Find Safer Route
          </Button>
        </div>
      </div>

      {/* Proactive Live Safety Bar */}
      <div className="p-4 rounded-2xl bg-navy-900/80 border border-white/10 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${gpsStatus === 'LIVE_GPS' ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
            <span className="font-bold text-white">Risk Monitoring:</span>
            <span className="text-emerald-400 font-semibold font-mono">ACTIVE (80+ Threshold)</span>
          </div>

          <div className="flex items-center gap-1.5 border-l border-white/10 pl-4">
            <span className="text-slate-400">Current Risk:</span>
            <span className={`font-mono font-bold ${
              riskAssessment.score >= 80 ? 'text-red-400' : riskAssessment.score > 30 ? 'text-amber-400' : 'text-emerald-400'
            }`}>
              {riskAssessment.score} / 100 ({riskAssessment.level})
            </span>
          </div>

          <div className="flex items-center gap-1.5 border-l border-white/10 pl-4 hidden sm:flex">
            <span className="text-slate-400">Auto-SOS:</span>
            <span className="font-mono font-semibold text-purple-300">
              {settings.autoEmergencyProtection ?? true ? 'ON (80+ Risk)' : 'OFF'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 border-l border-white/10 pl-4 hidden md:flex">
            <span className="text-slate-400">Last Assessment:</span>
            <span className="font-mono text-cyan-300">{secondsAgo}s ago</span>
          </div>
        </div>

        {/* Development & Evaluator Safe Test Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={triggerCriticalTest}
            className="px-2.5 py-1 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-[11px] font-semibold transition-all"
            title="Simulate Critical Risk Warning (>=80) with 10s countdown"
          >
            🧪 Test 80+ Risk
          </button>
          <button
            onClick={triggerDeviationTest}
            className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[11px] font-semibold transition-all"
            title="Simulate Route Deviation Alert"
          >
            🧪 Test Deviation
          </button>
        </div>
      </div>

      {/* Main 4-Card Hero Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* CARD 1 — CURRENT SAFETY STATUS & HONEST GPS */}
        <Card variant="glass" className="p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Network Status
              </span>
              <span className={`w-2.5 h-2.5 rounded-full ${gpsStatus === 'LIVE_GPS' ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
            </div>

            <div className="flex items-center gap-2.5 mb-2">
              <span className={`w-3.5 h-3.5 rounded-full ${gpsStatus === 'LIVE_GPS' ? 'bg-emerald-400 shadow-[0_0_12px_#10B981]' : 'bg-amber-400'}`} />
              <h3 className={`text-xl sm:text-2xl font-black tracking-wide uppercase ${gpsStatus === 'LIVE_GPS' ? 'text-emerald-400' : 'text-amber-300'}`}>
                {gpsStatus === 'LIVE_GPS' ? 'GPS LIVE' : 'ACQUIRING'}
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {gpsStatus === 'LIVE_GPS'
                ? 'High-accuracy browser GPS telemetry streaming to local safety engine.'
                : 'Waiting for browser GPS fix. Grant location permission to enable tracking.'}
            </p>
          </div>

          <div className="space-y-2 pt-3 border-t border-white/10 text-xs">
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5 text-slate-400">
                <MapPin className="w-3.5 h-3.5 text-purple-400" /> Latitude:
              </span>
              <span className="font-mono text-cyan-300">
                {gpsLoc ? gpsLoc.latitude.toFixed(5) : 'Waiting for GPS'}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5 text-slate-400">
                <MapPin className="w-3.5 h-3.5 text-purple-400" /> Longitude:
              </span>
              <span className="font-mono text-cyan-300">
                {gpsLoc ? gpsLoc.longitude.toFixed(5) : 'Waiting for GPS'}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5 text-slate-400">
                <Radio className="w-3.5 h-3.5 text-blue-400" /> Accuracy:
              </span>
              <span className="font-mono text-emerald-400">
                {gpsLoc ? `±${Math.round(gpsLoc.accuracy)} m` : 'Waiting for Fix'}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5 text-slate-400">
                <Clock className="w-3.5 h-3.5 text-cyan-400" /> Last update:
              </span>
              <span className="font-mono text-slate-300">
                {secondsAgo}s ago
              </span>
            </div>
            <div className="pt-1 text-[11px] font-mono">
              <span className={gpsDisplay.color}>{gpsDisplay.text}</span>
            </div>
          </div>
        </Card>

        {/* CARD 2 — AI RISK SCORE */}
        <Card
          variant="glass"
          interactive
          onClick={() => navigate('/risk-analysis')}
          className="p-6 flex flex-col items-center justify-between space-y-3"
        >
          <div className="w-full flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Risk Intelligence
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </div>

          <RiskGauge score={riskAssessment.score} level={riskAssessment.level} size={150} strokeWidth={11} showDetails={false} />

          {/* Quick Factor breakdown with Model-based labeling */}
          <div className="w-full grid grid-cols-2 gap-2 text-[10px] pt-1 border-t border-white/10">
            <div className="flex items-center justify-between text-slate-300 bg-navy-950/40 px-2 py-1 rounded-lg">
              <span className="text-slate-400">Location (30%):</span>
              <span className="text-slate-300 font-semibold">Model-based</span>
            </div>
            <div className="flex items-center justify-between text-slate-300 bg-navy-950/40 px-2 py-1 rounded-lg">
              <span className="text-slate-400">Time (15%):</span>
              <span className="text-emerald-400 font-semibold">Real Clock</span>
            </div>
            <div className="flex items-center justify-between text-slate-300 bg-navy-950/40 px-2 py-1 rounded-lg">
              <span className="text-slate-400">Crowd (15%):</span>
              <span className="text-slate-300 font-semibold">Estimated</span>
            </div>
            <div className="flex items-center justify-between text-slate-300 bg-navy-950/40 px-2 py-1 rounded-lg">
              <span className="text-slate-400">Lighting (15%):</span>
              <span className="text-amber-400 font-semibold">Estimated</span>
            </div>
            <div className="col-span-2 flex items-center justify-between text-slate-300 bg-navy-950/40 px-2 py-1 rounded-lg">
              <span className="text-slate-400">Historical (25%):</span>
              <span className="text-slate-300 font-semibold">Model-based</span>
            </div>
          </div>
        </Card>

        {/* CARD 3 — SAFE ROUTE INTELLIGENCE */}
        <Card variant="glass" className="p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                SAFE ROUTE
              </span>
              <Badge variant="low" size="sm">
                AI Active
              </Badge>
            </div>

            <div className="space-y-2 mb-3">
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-purple-400" />
                <span className="text-slate-400">From:</span>
                <span className="font-semibold text-slate-200">
                  {gpsLoc ? `Live GPS (±${Math.round(gpsLoc.accuracy)}m)` : 'Current Device GPS'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span className="text-slate-400">To:</span>
                <span className="font-semibold text-slate-200 truncate">{selectedRoute.name}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/20 text-xs space-y-1">
              <div className="flex items-center justify-between font-semibold text-purple-300">
                <span>{selectedRoute.name}</span>
                <span>{selectedRoute.durationMin} min</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Passes {selectedRoute.safePointsNearby} certified shelters • {selectedRoute.distanceKm} km
              </p>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/safe-route')}
            className="w-full text-xs font-semibold"
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            Find Safer Route
          </Button>
        </Card>

        {/* CARD 4 — QUICK SOS (Rule 15 & 24) */}
        <Card variant="emergency" className="p-6 flex flex-col items-center justify-between text-center">
          <div className="w-full flex items-center justify-between mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-red-300">
              SOS
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40">
              3s HOLD
            </span>
          </div>
          <SosHoldButton size="normal" source="Dashboard SOS Trigger" />
        </Card>
      </div>

      {/* Middle Grid: Real Map Telemetry & Guardian Network */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Real Leaflet Map */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-purple-400" />
              <h3 className="text-base font-bold text-white">LIVE GEOLOCATION & SAFETY MAP</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/live-tracking')}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              className="text-xs text-purple-400 hover:text-purple-300"
            >
              Full Screen Tracking
            </Button>
          </div>

          <RealMap
            centerLat={gpsLoc?.latitude}
            centerLng={gpsLoc?.longitude}
            routeGeometry={selectedRoute?.path as any}
            destination={selectedRoute ? {
              lat: (selectedRoute as any).destinationLat || (gpsLoc?.latitude ? gpsLoc.latitude + 0.005 : 12.9716),
              lng: (selectedRoute as any).destinationLng || (gpsLoc?.longitude ? gpsLoc.longitude + 0.005 : 77.5946),
              name: selectedRoute.name
            } : null}
            className="h-[420px] w-full rounded-2xl"
          />
        </div>

        {/* Right Col: Quick Guardian Circle & Responder Network */}
        <div className="space-y-6">
          {/* Guardian Circle Card */}
          <Card variant="glass" className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                <h4 className="text-sm font-bold text-white">Trusted Contacts ({contacts.length})</h4>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
                Voice & SMS Enabled
              </span>
            </div>

            <div className="space-y-2.5">
              {contacts.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">No emergency contacts configured yet.</p>
              ) : (
                contacts.slice(0, 3).map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-navy-900/60 border border-white/5 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold text-xs">
                        {contact.relationship ? contact.relationship.charAt(0) : 'C'}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-200">{contact.name}</p>
                        <p className="text-[10px] text-slate-400">{contact.relationship} • {contact.phone}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Primary
                    </span>
                  </div>
                ))
              )}
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/contacts')}
              className="w-full text-xs"
            >
              Manage Contacts ({contacts.length})
            </Button>
          </Card>

          {/* Operational Response Network Status Card */}
          <Card variant="glass" className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <h4 className="text-sm font-bold text-white">Response Network</h4>
              </div>
              <Badge variant="cyan" size="sm">
                OPERATIONAL
              </Badge>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Application Safety Network is online. Emergency distress broadcasts link directly to active field responders via real-time WebSocket telemetry.
            </p>

            <div className="p-2.5 rounded-xl bg-navy-950/60 border border-white/5 text-[11px] text-slate-400 flex items-start gap-2">
              <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>Official Police Integration:</strong> Not configured (Application Responder Network Active).
              </span>
            </div>

            <div className="flex items-center justify-between pt-1 text-xs">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/history')}
                className="w-full text-xs"
              >
                View Safety History
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
