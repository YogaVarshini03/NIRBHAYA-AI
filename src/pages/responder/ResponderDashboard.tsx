import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  Users,
  Radio,
  Clock,
  MapPin,
  ChevronRight,
  Car,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { useEmergency } from '../../context/EmergencyContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { SimulatedMap } from '../../components/map/SimulatedMap';
import { useToast } from '../../context/ToastContext';

import { emergencyService } from '../../services/emergencyService';
import { socketService } from '../../services/socketService';

export const ResponderDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { activeIncident, acceptIncident, resolveIncident } = useEmergency();
  const { showToast } = useToast();

  const [liveIncidents, setLiveIncidents] = useState<any[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>('NG-1001');

  React.useEffect(() => {
    emergencyService.fetchActiveIncidentsFromBackend().then((items) => {
      if (items && items.length > 0) {
        setLiveIncidents(items);
        setSelectedIncidentId(items[0].id);
      }
    });

    const unsubTrigger = socketService.on('EMERGENCY_TRIGGERED', (payload: any) => {
      if (payload?.incident) {
        setLiveIncidents((prev) => [payload.incident, ...prev.filter((i) => i.id !== payload.incident.id)]);
        setSelectedIncidentId(payload.incident.id);
        showToast(`🚨 NEW EMERGENCY DISPATCH: ${payload.incident.id}`, 'emergency');
      }
    });

    return () => {
      unsubTrigger();
    };
  }, []);

  const handleAccept = async (e: React.MouseEvent, incId: string) => {
    e.stopPropagation();
    await emergencyService.acceptIncidentReal(incId);
    acceptIncident();
    showToast(`Officer Arjun Kumar accepted dispatch for Incident ${incId}`, 'success');
  };

  const handleNavigate = (e: React.MouseEvent, lat?: number, lng?: number) => {
    e.stopPropagation();
    if (!lat || !lng) {
      showToast('Incident GPS coordinates unavailable.', 'warning');
      return;
    }
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
    window.open(url, '_blank');
    showToast('Opening turn-by-turn navigation in Google Maps...', 'info');
  };

  const handleResolve = async (e: React.MouseEvent, incId: string) => {
    e.stopPropagation();
    await emergencyService.resolveIncidentReal(incId);
    resolveIncident();
    showToast(`Incident ${incId} resolved and logged to audit trail.`, 'success');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header (Rule 31) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
              Emergency Operations Center
            </span>
            <Badge variant="blue" size="sm" dot>
              Command Mode Active
            </Badge>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
            Responder Command Center
          </h2>
          <p className="text-sm text-slate-400">
            Real-time tactical triage of high-priority distress beacons and patrol dispatches.
          </p>
        </div>

        <Button
          variant="danger"
          size="sm"
          onClick={() => navigate('/responder/active')}
          leftIcon={<ShieldAlert className="w-4 h-4 animate-pulse" />}
        >
          View Active Incident ({activeIncident.id})
        </Button>
      </div>

      {/* Top 4 Metric Cards (Rule 31) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card variant="emergency" className="p-6">
          <div className="flex items-center justify-between text-xs text-red-300 mb-2">
            <span className="font-bold uppercase tracking-wider">ACTIVE INCIDENTS</span>
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
          </div>
          <div className="text-3xl font-black text-white font-mono">2</div>
          <p className="text-xs text-red-200 mt-1">1 High Priority Dispatch</p>
        </Card>

        <Card variant="glass" className="p-6">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider">NEARBY USERS</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-3xl font-black text-white font-mono">12</div>
          <p className="text-xs text-slate-400 mt-1">Within 2.5 km radius</p>
        </Card>

        <Card variant="glass" className="p-6">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider">RESPONSE NETWORK</span>
            <Radio className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-emerald-400 font-mono">98%</div>
          <p className="text-xs text-slate-400 mt-1">Patrol nodes connected</p>
        </Card>

        <Card variant="glass" className="p-6">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider">AVG RESPONSE SIMULATION</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-black text-cyan-300 font-mono">04:32</div>
          <p className="text-xs text-slate-400 mt-1">Target threshold: &lt; 06:00</p>
        </Card>
      </div>

      {/* Main Grid: Incident List + Interactive Tactical Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Incidents List */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Live Distress Triage</h3>
            <span className="text-xs text-slate-400">Select to inspect & dispatch</span>
          </div>

          <div className="space-y-3">
            {liveIncidents.map((inc) => {
              const isSelected = selectedIncidentId === inc.id;
              const risk = inc.risk_level || 'CRITICAL';
              const score = inc.risk_score || 88;
              const isResolved = inc.status === 'RESOLVED' || inc.status === 'CLOSED';

              return (
                <div
                  key={inc.id}
                  onClick={() => setSelectedIncidentId(inc.id)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-navy-800/90 border-red-500/60 shadow-glow-red'
                      : 'bg-navy-900/60 border-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-white">{inc.id}</span>
                      <Badge variant={risk === 'CRITICAL' ? 'critical' : 'high'} size="sm">
                        {risk} ({score})
                      </Badge>
                    </div>
                    <span className="text-[11px] font-mono text-cyan-300 font-semibold">Live GPS</span>
                  </div>

                  <p className="text-xs font-bold text-slate-200 truncate">{inc.location_name || 'Anna Salai Corridor'}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">User: {inc.user_name || 'Ananya Sharma'}</p>

                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-white/10 flex-wrap gap-2">
                    <span className="text-[11px] font-mono text-purple-300 font-semibold">{inc.status}</span>
                    <div className="flex items-center gap-2">
                      {!isResolved && inc.status !== 'RESPONDER_ACCEPTED' && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={(e) => handleAccept(e, inc.id)}
                          className="text-xs py-1"
                        >
                          Accept
                        </Button>
                      )}
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => handleNavigate(e, inc.latitude, inc.longitude)}
                        className="text-xs py-1"
                      >
                        Navigate
                      </Button>
                      {!isResolved && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleResolve(e, inc.id)}
                          className="text-xs py-1 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-950/40"
                        >
                          Resolve
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Tactical Map with Incidents */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Tactical Incident Coordinate Map</h3>
            <span className="text-xs text-slate-400">Incident Pin NG-2048</span>
          </div>

          <SimulatedMap
            showResponder={true}
            showSafePoints={true}
            height="h-[460px]"
            userLocationText="Distress Beacon: NG-2048"
          />
        </div>
      </div>
    </div>
  );
};
