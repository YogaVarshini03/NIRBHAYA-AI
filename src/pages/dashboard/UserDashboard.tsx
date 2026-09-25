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
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { riskService } from '../../services/riskService';
import { routeService } from '../../services/routeService';
import { contactService } from '../../services/contactService';
import { RiskGauge } from '../../components/risk/RiskGauge';
import { SosHoldButton } from '../../components/sos/SosHoldButton';
import { SimulatedMap } from '../../components/map/SimulatedMap';
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

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Top Greeting Header (Rule 15) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.08]">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Good evening, {user?.name.split(' ')[0] || 'Ananya'}.
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Your safety network is active and monitoring environmental telemetry.
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

      {/* Proactive Live Safety Bar (Rule 2, 12, 16) */}
      <div className="p-4 rounded-2xl bg-navy-900/80 border border-white/10 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-bold text-white">Risk Monitoring:</span>
            <span className="text-emerald-400 font-semibold font-mono">ACTIVE</span>
          </div>

          <div className="flex items-center gap-1.5 border-l border-white/10 pl-4">
            <span className="text-slate-400">Current Risk:</span>
            <span className={`font-mono font-bold ${
              riskAssessment.score > 60 ? 'text-red-400' : riskAssessment.score > 30 ? 'text-amber-400' : 'text-emerald-400'
            }`}>
              {riskAssessment.score} / 100 ({riskAssessment.level})
            </span>
          </div>

          <div className="flex items-center gap-1.5 border-l border-white/10 pl-4 hidden sm:flex">
            <span className="text-slate-400">Auto-Protection:</span>
            <span className="font-mono font-semibold text-purple-300">
              {settings.autoEmergencyProtection ?? true ? 'ON' : 'OFF'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 border-l border-white/10 pl-4 hidden md:flex">
            <span className="text-slate-400">Last Assessment:</span>
            <span className="font-mono text-cyan-300">{secondsAgo}s ago</span>
          </div>
        </div>

        {/* Development & Evaluator Safe Test Controls (Rule 16) */}
        <div className="flex items-center gap-2">
          <button
            onClick={triggerCriticalTest}
            className="px-2.5 py-1 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-[11px] font-semibold transition-all"
            title="Simulate Critical Risk Warning with 10s countdown"
          >
            🧪 Test Critical Alert
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

      {/* Main 4-Card Hero Grid (Rule 15, 54, 63) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* CARD 1 — CURRENT SAFETY STATUS */}
        <Card variant="glass" className="p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Network Status
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            </div>

            <div className="flex items-center gap-2.5 mb-2">
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-400 shadow-[0_0_12px_#10B981]" />
              <h3 className="text-xl sm:text-2xl font-black text-emerald-400 tracking-wide uppercase">
                YOU ARE SAFE
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              No active threat signatures or anomalous distress telemetry identified in your vicinity.
            </p>
          </div>

          <div className="space-y-2 pt-3 border-t border-white/10 text-xs">
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5 text-slate-400">
                <MapPin className="w-3.5 h-3.5 text-purple-400" /> Location:
              </span>
              <span className="font-medium truncate max-w-[150px] font-mono text-cyan-300">
                {gpsLoc ? `${gpsLoc.latitude.toFixed(4)}, ${gpsLoc.longitude.toFixed(4)}` : 'Acquiring GPS...'}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5 text-slate-400">
                <Clock className="w-3.5 h-3.5 text-cyan-400" /> Telemetry:
              </span>
              <span className="font-medium text-emerald-400">Real-time watchPosition</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5 text-slate-400">
                <Radio className="w-3.5 h-3.5 text-blue-400" /> GPS Protection:
              </span>
              <span className={`font-mono font-semibold ${gpsStatus === 'LIVE_GPS' ? 'text-emerald-400' : 'text-amber-400'}`}>
                {gpsStatus === 'LIVE_GPS' ? `GPS LIVE (±${gpsLoc?.accuracy || 5}m)` : gpsStatus === 'PERMISSION_DENIED' ? 'GPS DENIED' : 'GPS ACQUIRING'}
              </span>
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
              AI Risk Intelligence
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </div>

          <RiskGauge score={riskAssessment.score} level={riskAssessment.level} size={150} strokeWidth={11} showDetails={false} />

          {/* Quick Factor breakdown */}
          <div className="w-full grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-white/10">
            <div className="flex items-center justify-between text-slate-300 bg-navy-950/40 px-2 py-1 rounded-lg">
              <span className="text-slate-400">Time:</span>
              <span className="text-emerald-400 font-semibold">Low</span>
            </div>
            <div className="flex items-center justify-between text-slate-300 bg-navy-950/40 px-2 py-1 rounded-lg">
              <span className="text-slate-400">Crowd:</span>
              <span className="text-emerald-400 font-semibold">Low</span>
            </div>
            <div className="flex items-center justify-between text-slate-300 bg-navy-950/40 px-2 py-1 rounded-lg">
              <span className="text-slate-400">Lighting:</span>
              <span className="text-amber-400 font-semibold">Medium</span>
            </div>
            <div className="flex items-center justify-between text-slate-300 bg-navy-950/40 px-2 py-1 rounded-lg">
              <span className="text-slate-400">History:</span>
              <span className="text-emerald-400 font-semibold">Low</span>
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
                <span className="font-semibold text-slate-200">Current Location</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span className="text-slate-400">To:</span>
                <span className="font-semibold text-slate-200">Demo Central Mall</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/20 text-xs space-y-1">
              <div className="flex items-center justify-between font-semibold text-purple-300">
                <span>{selectedRoute.name}</span>
                <span>{selectedRoute.durationMin} min</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Passes {selectedRoute.safePointsNearby} certified safe shelters • {selectedRoute.distanceKm} km
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

      {/* Middle Grid: Live Map Telemetry & Guardian Network */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Simulated City Vector Map */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-purple-400" />
              <h3 className="text-base font-bold text-white">LIVE SAFETY NETWORK</h3>
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

          <SimulatedMap
            selectedRoute={selectedRoute}
            showResponder={true}
            showSafePoints={true}
            height="h-[420px]"
          />
        </div>

        {/* Right Col: Quick Guardian Circle & Responder Radar */}
        <div className="space-y-6">
          {/* Guardian Circle Card */}
          <Card variant="glass" className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                <h4 className="text-sm font-bold text-white">Trusted Guardian Circle</h4>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
                {onlineContactsCount} Online
              </span>
            </div>

            <div className="space-y-2.5">
              {contacts.slice(0, 3).map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-navy-900/60 border border-white/5 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold text-xs">
                      {contact.relationship.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-200">{contact.name}</p>
                      <p className="text-[10px] text-slate-400">{contact.relationship} • {contact.phone}</p>
                    </div>
                  </div>
                  <span className={`w-2 h-2 rounded-full ${contact.online ? 'bg-emerald-400 shadow-[0_0_6px_#10B981]' : 'bg-slate-500'}`} />
                </div>
              ))}
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

          {/* Quick Patrol Radar Card */}
          <Card variant="glass" className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <h4 className="text-sm font-bold text-white">Nearest Rapid Patrol</h4>
              </div>
              <Badge variant="cyan" size="sm">
                RSP-1042
              </Badge>
            </div>

            <p className="text-xs text-slate-300">
              Officer Arjun Kumar unit stationed at West Outer Ring. Standby ETA: <strong>04:32</strong>.
            </p>

            <div className="flex items-center justify-between pt-2 text-xs">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/responder')}
                className="w-full text-xs"
              >
                Open Responder Command
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
