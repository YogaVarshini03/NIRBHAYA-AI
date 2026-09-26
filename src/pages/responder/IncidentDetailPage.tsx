import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  Clock,
  MapPin,
  Car,
  FileLock2,
  CheckCircle2,
  ArrowLeft,
  Activity,
  User,
  Radio
} from 'lucide-react';
import { useEmergency } from '../../context/EmergencyContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

export const IncidentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeIncident } = useEmergency();

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Back button & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.08]">
        <div className="space-y-2">
          <button
            onClick={() => navigate('/responder')}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Responder Operations</span>
          </button>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Incident Case File: {id || activeIncident.id}
            </h2>
            <Badge variant="critical" size="sm">
              {activeIncident.status}
            </Badge>
          </div>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate('/responder/active')}
        >
          Open Active Incident Room
        </Button>
      </div>

      {/* Grid of details (Rule 33) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1: User & Location */}
        <Card variant="glass" className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <User className="w-4 h-4 text-purple-400" />
            <span>User & Coordinate Telemetry</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-white/5">
              <span className="text-slate-400">Subject Name:</span>
              <span className="font-semibold text-slate-200">Ananya Sharma</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-white/5">
              <span className="text-slate-400">Distress Location:</span>
              <span className="font-medium text-slate-200">{activeIncident.location}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-white/5">
              <span className="text-slate-400">GPS Coordinates:</span>
              <span className="font-mono text-cyan-300">28.6315° N, 77.2167° E</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-400">User State:</span>
              <span className="text-red-400 font-semibold">{activeIncident.userStatus}</span>
            </div>
          </div>
        </Card>

        {/* Card 2: Risk Scoring Breakdown */}
        <Card variant="glass" className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Activity className="w-4 h-4 text-red-400" />
            <span>Environmental Risk Assessment</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-white/5">
              <span className="text-slate-400">Threat Index:</span>
              <span className="font-bold text-red-400">{activeIncident.riskScore} / 100 ({activeIncident.riskLevel})</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-white/5">
              <span className="text-slate-400">Lighting Quality:</span>
              <span className="text-amber-400 font-semibold">Low (Damaged Streetlights)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-white/5">
              <span className="text-slate-400">Pedestrian Density:</span>
              <span className="text-red-400 font-semibold">Critical Sparsity</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-400">Historical Hotspot:</span>
              <span className="text-slate-300">Corridor Sector 4 Alert Frequency</span>
            </div>
          </div>
        </Card>

        {/* Card 3: Responder Deployment */}
        <Card variant="glass" className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Car className="w-4 h-4 text-blue-400" />
            <span>Assigned Emergency Unit</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-white/5">
              <span className="text-slate-400">Responder:</span>
              <span className="font-semibold text-slate-200">
                {activeIncident.responder?.name || 'Awaiting Unit Assignment'}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-white/5">
              <span className="text-slate-400">Badge & Call Sign:</span>
              <span className="font-mono text-cyan-300">
                {activeIncident.responder?.badgeNumber || 'UNASSIGNED'}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-white/5">
              <span className="text-slate-400">Intercept Distance:</span>
              <span className="font-mono font-bold text-white">
                {activeIncident.responder?.distanceKm !== undefined ? `${activeIncident.responder.distanceKm} km` : '--'}
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-400">Current Status:</span>
              <span className="text-emerald-400 font-semibold">
                {activeIncident.responder?.status || 'STANDBY'}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Evidence & Custody Timeline */}
      <Card variant="glass" className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <FileLock2 className="w-4 h-4 text-amber-400" />
            <span>Attached Cryptographic Evidence Files</span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/evidence')}
            className="text-xs"
          >
            Open Evidence Locker
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {activeIncident.evidenceItems.map((item) => (
            <div key={item.id} className="p-3.5 rounded-xl bg-navy-950/60 border border-white/5 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="font-bold text-white truncate">{item.title}</span>
                <span className="text-emerald-400 font-mono text-[10px]">LOCKED</span>
              </div>
              <p className="text-[11px] text-slate-400">{item.fileType} • {item.size}</p>
              <p className="text-[10px] text-purple-300 font-mono truncate">{item.sha256Hash}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
