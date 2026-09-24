import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  Clock,
  MapPin,
  Car,
  Phone,
  Compass,
  CheckCircle2,
  FileLock2,
  AlertTriangle,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { useEmergency } from '../../context/EmergencyContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { SimulatedMap } from '../../components/map/SimulatedMap';
import { useToast } from '../../context/ToastContext';

export const ActiveEmergencyPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeIncident, acceptIncident, resolveIncident } = useEmergency();
  const { showToast } = useToast();

  const formatTimer = (sec: number) => {
    const hours = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleNavigate = async () => {
    const lat = activeIncident.coordinates.lat;
    const lng = activeIncident.coordinates.lng;
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
    showToast('Opening real turn-by-turn navigation in Google Maps...', 'info');
    window.open(googleMapsUrl, '_blank');
  };

  const handleContact = () => {
    const phone = activeIncident.responder.phone.replace(/[^\d+]/g, '');
    window.open(`tel:${phone || '112'}`, '_self');
    showToast('Initiating direct emergency telecommunication link...', 'info');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header (Rule 32) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-red-500/20">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-600/20 border border-red-500 rounded-2xl animate-pulse">
            <ShieldAlert className="w-8 h-8 text-red-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40">
                CRITICAL SIMULATION
              </span>
              <span className="text-xs font-mono text-slate-400">ID: {activeIncident.id}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
              ACTIVE DEMO INCIDENT: {activeIncident.id}
            </h2>
          </div>
        </div>

        {/* Live Running Counter Timer (Rule 32) */}
        <div className="p-3.5 rounded-2xl bg-red-950/60 border border-red-500/30 text-right font-mono">
          <span className="text-[10px] uppercase text-red-300 font-bold block">Elapsed Distress Duration</span>
          <span className="text-2xl font-black text-white tracking-widest">
            {formatTimer(activeIncident.elapsedSeconds)}
          </span>
        </div>
      </div>

      {/* Main 4 Action Buttons Bar (Rule 32: Accept, Navigate, Contact, Resolve) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Button
          variant="primary"
          size="lg"
          onClick={acceptIncident}
          leftIcon={<CheckCircle2 className="w-4 h-4" />}
          className="font-bold text-xs sm:text-sm"
        >
          Accept
        </Button>

        <Button
          variant="secondary"
          size="lg"
          onClick={handleNavigate}
          leftIcon={<Compass className="w-4 h-4 text-cyan-400" />}
          className="font-bold text-xs sm:text-sm"
        >
          Navigate
        </Button>

        <Button
          variant="secondary"
          size="lg"
          onClick={handleContact}
          leftIcon={<Phone className="w-4 h-4 text-purple-400" />}
          className="font-bold text-xs sm:text-sm"
        >
          Contact
        </Button>

        <Button
          variant="danger"
          size="lg"
          onClick={resolveIncident}
          leftIcon={<ShieldAlert className="w-4 h-4" />}
          className="font-bold text-xs sm:text-sm bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 border-emerald-500/40"
        >
          Resolve
        </Button>
      </div>

      {/* 2-Column Layout: Details + Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Incident Telemetry & Response Timeline */}
        <div className="lg:col-span-5 space-y-6">
          {/* Incident Telemetry Card */}
          <Card variant="glass" className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                Incident Telemetry
              </h3>
              <Badge variant={activeIncident.status.includes('RESOLVED') ? 'low' : 'critical'} size="sm">
                {activeIncident.status}
              </Badge>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span className="text-slate-400">Risk Assessment:</span>
                <span className="font-bold text-red-400">{activeIncident.riskLevel} ({activeIncident.riskScore}/100)</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span className="text-slate-400">Distress Location:</span>
                <span className="font-medium text-slate-200">{activeIncident.location}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span className="text-slate-400">User Telemetry:</span>
                <span className="text-purple-300">{activeIncident.userStatus}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span className="text-slate-400">Assigned Patrol:</span>
                <span className="font-medium text-cyan-300">{activeIncident.responder.name} ({activeIncident.responder.badgeNumber})</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Evidence Vault:</span>
                <span className="text-emerald-400 font-mono">3 Encrypted Files Locked</span>
              </div>
            </div>
          </Card>

          {/* Sequential Timeline (Rule 32) */}
          <Card variant="glass" className="p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              Response Sequence Timeline
            </h3>

            <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-white/10">
              {activeIncident.timeline.map((step) => (
                <div key={step.id} className="relative flex items-start gap-3 pl-1">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0 z-10 text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-200">{step.step}</p>
                    <span className="text-[10px] text-slate-500 font-mono">{step.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Column: Live Map & Responder Intercept */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-white">Live Intercept Geometry</span>
            <span>Officer Arjun Unit in Motion</span>
          </div>

          <SimulatedMap
            showResponder={true}
            showSafePoints={true}
            height="h-[520px]"
            userLocationText={`Distress Pin (${activeIncident.id})`}
          />
        </div>
      </div>
    </div>
  );
};
