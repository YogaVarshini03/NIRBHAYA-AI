import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  Users,
  Radio,
  Clock,
  MapPin,
  Car,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Phone,
  Compass,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useEmergency } from '../../context/EmergencyContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { RealMap } from '../../components/map/RealMap';
import { useToast } from '../../context/ToastContext';
import { emergencyService } from '../../services/emergencyService';
import { socketService } from '../../services/socketService';
import { locationService, GPSLocation } from '../../services/locationService';
import { apiUrl } from '../../services/apiConfig';

export const ResponderDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { activeIncident, acceptIncident, resolveIncident } = useEmergency();
  const { showToast } = useToast();

  const [liveIncidents, setLiveIncidents] = useState<any[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [metrics, setMetrics] = useState<{
    avgResponseTimeDisplay: string;
    totalEmergencyIncidents: number;
    resolvedIncidents: number;
  }>({
    avgResponseTimeDisplay: 'Insufficient data',
    totalEmergencyIncidents: 0,
    resolvedIncidents: 0,
  });

  const [responderGps, setResponderGps] = useState<GPSLocation | null>(() =>
    locationService.getCurrentLocation()
  );

  const loadData = async () => {
    try {
      const items = await emergencyService.fetchActiveIncidentsFromBackend();
      setLiveIncidents(items || []);
      if (items && items.length > 0) {
        if (!selectedIncidentId || !items.some((i: any) => i.id === selectedIncidentId)) {
          setSelectedIncidentId(items[0].id);
        }
      } else {
        setSelectedIncidentId(null);
      }

      // Fetch actual backend metrics
      const analyticsRes = await fetch(apiUrl('/api/analytics'));
      if (analyticsRes.ok) {
        const aData = await analyticsRes.json();
        if (aData.success && aData.metrics) {
          setMetrics({
            avgResponseTimeDisplay: aData.metrics.avgResponseTimeDisplay || 'Insufficient data',
            totalEmergencyIncidents: aData.metrics.totalEmergencyIncidents || 0,
            resolvedIncidents: aData.metrics.resolvedIncidents || 0,
          });
        }
      }
    } catch (err) {
      console.warn('[ResponderDashboard] Error loading backend data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Responder device GPS tracking
    locationService.startContinuousTracking();
    const unsubLoc = locationService.subscribe((loc) => {
      setResponderGps(loc);
    });

    // Real-time WebSocket dispatches
    const unsubTrigger = socketService.on('EMERGENCY_TRIGGERED', (payload: any) => {
      if (payload?.incident) {
        setLiveIncidents((prev) => [payload.incident, ...prev.filter((i) => i.id !== payload.incident.id)]);
        setSelectedIncidentId(payload.incident.id);
        showToast(`🚨 NEW EMERGENCY DISPATCH: ${payload.incident.id}`, 'emergency');
      }
    });

    const unsubUpdate = socketService.on('INCIDENT_UPDATED', (payload: any) => {
      if (payload?.incident) {
        setLiveIncidents((prev) =>
          prev.map((i) => (i.id === payload.incident.id ? { ...i, ...payload.incident } : i))
        );
      }
    });

    const unsubResolved = socketService.on('INCIDENT_RESOLVED', (payload: any) => {
      if (payload?.incidentId) {
        setLiveIncidents((prev) => prev.filter((i) => i.id !== payload.incidentId));
      }
    });

    const unsubLocUpdate = socketService.on('USER_LOCATION', (payload: any) => {
      if (payload?.incidentId) {
        setLiveIncidents((prev) =>
          prev.map((i) =>
            i.id === payload.incidentId
              ? { ...i, latitude: payload.latitude, longitude: payload.longitude, accuracy: payload.accuracy, updated_at: payload.timestamp }
              : i
          )
        );
      }
    });

    return () => {
      unsubLoc();
      unsubTrigger();
      unsubUpdate();
      unsubResolved();
      unsubLocUpdate();
    };
  }, []);

  const selectedIncident = liveIncidents.find((i) => i.id === selectedIncidentId) || null;

  const handleAccept = async (e: React.MouseEvent, incId: string) => {
    e.stopPropagation();
    try {
      await emergencyService.acceptIncidentReal(incId);
      acceptIncident();
      await loadData();
      showToast(`Accepted dispatch for Incident ${incId}. Status: RESPONDER_ACCEPTED`, 'success');
    } catch (err: any) {
      showToast(`Failed to accept incident: ${err.message}`, 'error');
    }
  };

  const handleNavigate = (e: React.MouseEvent, inc: any) => {
    e.stopPropagation();
    if (!inc?.latitude || !inc?.longitude) {
      showToast('Incident GPS coordinates unavailable.', 'warning');
      return;
    }
    emergencyService.navigateIncidentReal(inc.id);
    const url = `https://www.google.com/maps/dir/?api=1&destination=${inc.latitude},${inc.longitude}&travelmode=driving`;
    window.open(url, '_blank');
    showToast(`Opening turn-by-turn navigation to (${inc.latitude.toFixed(5)}, ${inc.longitude.toFixed(5)})`, 'info');
  };

  const handleContact = (e: React.MouseEvent, phone?: string) => {
    e.stopPropagation();
    const cleanPhone = (phone || '9345596322').replace(/[^\d+]/g, '');
    window.open(`tel:${cleanPhone}`, '_self');
    showToast(`Initiating direct voice contact with emergency line: ${cleanPhone}`, 'info');
  };

  const handleResolve = async (e: React.MouseEvent, incId: string) => {
    e.stopPropagation();
    try {
      await emergencyService.resolveIncidentReal(incId);
      resolveIncident();
      await loadData();
      showToast(`Incident ${incId} marked as RESOLVED and stored in backend audit trail.`, 'success');
    } catch (err: any) {
      showToast(`Failed to resolve incident: ${err.message}`, 'error');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header (Section 4 & 14) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
              Emergency Operations Center
            </span>
            <Badge variant="blue" size="sm" dot>
              Application Responder Network
            </Badge>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
            Responder Command Center
          </h2>
          <p className="text-sm text-slate-400">
            Real-time tactical triage of active distress beacons and emergency telemetry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {liveIncidents.length > 0 && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => navigate('/responder/active')}
              leftIcon={<ShieldAlert className="w-4 h-4 animate-pulse" />}
            >
              Active Emergency ({liveIncidents[0].id})
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/responder/map')}
            leftIcon={<Compass className="w-4 h-4 text-cyan-400" />}
          >
            Tactical Map
          </Button>
        </div>
      </div>

      {/* Police Integration Disclosure (Section 14: Truthful reporting) */}
      <div className="p-3.5 rounded-2xl bg-navy-900/60 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong>Official Integration Status:</strong> Police API integration not configured (Requires official jurisdictional clearance).
          </span>
        </div>
        <span className="text-slate-400 font-mono text-[11px]">
          Operating via Certified Registered Application Responders
        </span>
      </div>

      {/* Metric Cards: 100% Real Backend Data (Section 12) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card variant={liveIncidents.length > 0 ? 'emergency' : 'glass'} className="p-6">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-bold uppercase tracking-wider">ACTIVE INCIDENTS</span>
            {liveIncidents.length > 0 && <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />}
          </div>
          <div className="text-3xl font-black text-white font-mono">{liveIncidents.length}</div>
          <p className="text-xs text-slate-400 mt-1">
            {liveIncidents.length > 0 ? `${liveIncidents.length} active emergency record(s)` : 'No active distress beacons'}
          </p>
        </Card>

        <Card variant="glass" className="p-6">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider">TOTAL EMERGENCIES</span>
            <ShieldAlert className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-3xl font-black text-white font-mono">{metrics.totalEmergencyIncidents}</div>
          <p className="text-xs text-slate-400 mt-1">Persisted in database</p>
        </Card>

        <Card variant="glass" className="p-6">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider">RESOLVED INCIDENTS</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-emerald-400 font-mono">{metrics.resolvedIncidents}</div>
          <p className="text-xs text-slate-400 mt-1">Audit verified resolutions</p>
        </Card>

        <Card variant="glass" className="p-6">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider">AVG RESPONSE TIME</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-cyan-300 font-mono">
            {metrics.avgResponseTimeDisplay}
          </div>
          <p className="text-xs text-slate-400 mt-1">Calculated from event timestamps</p>
        </Card>
      </div>

      {/* Main Grid: Incident List + Real Operational Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Active Distress List */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Live Distress Triage</h3>
            <span className="text-xs text-slate-400 font-mono">
              {liveIncidents.length} active record{liveIncidents.length === 1 ? '' : 's'}
            </span>
          </div>

          {liveIncidents.length === 0 ? (
            <div className="p-8 rounded-2xl bg-navy-900/60 border border-white/5 text-center space-y-3">
              <ShieldCheck className="w-12 h-12 text-emerald-400 mx-auto opacity-70" />
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">No Active Incidents</h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                All community sectors report normal telemetry. New distress triggers will automatically appear here via WebSocket.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {liveIncidents.map((inc) => {
                const isSelected = selectedIncidentId === inc.id;
                const risk = inc.risk_level || 'CRITICAL';
                const score = inc.risk_score || 88;
                const isResolved = inc.status === 'RESOLVED' || inc.status === 'CLOSED';
                const accuracy = inc.accuracy ? Math.round(inc.accuracy) : 10;
                const createdTime = inc.created_at ? new Date(inc.created_at).toLocaleTimeString() : 'Recent';

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
                      <span className="text-[11px] font-mono text-cyan-300 font-semibold">
                        GPS LIVE (±{accuracy}m)
                      </span>
                    </div>

                    <p className="text-xs font-bold text-slate-200 truncate">
                      {inc.location_name || `Live GPS (${inc.latitude?.toFixed(4)}, ${inc.longitude?.toFixed(4)})`}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                      <span>User: {inc.user_name || 'Protected User'}</span>
                      <span>Created: {createdTime}</span>
                    </div>

                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-white/10 flex-wrap gap-2">
                      <span className="text-[11px] font-mono text-purple-300 font-semibold uppercase">
                        {inc.status}
                      </span>
                      <div className="flex items-center gap-2">
                        {!isResolved && inc.status !== 'RESPONDER_ACCEPTED' && inc.status !== 'EN_ROUTE' && inc.status !== 'ON_SCENE' && (
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
                          onClick={(e) => handleNavigate(e, inc)}
                          className="text-xs py-1"
                        >
                          Navigate
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleContact(e, inc.user_phone)}
                          className="text-xs py-1 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-950/40"
                        >
                          Contact
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
          )}
        </div>

        {/* Right Column: Real Operational Map (Section 7) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Live Incident GPS Map</h3>
            <span className="text-xs text-slate-400 font-mono">
              {selectedIncident ? `Focus: ${selectedIncident.id}` : 'OpenStreetMap Real Tiles'}
            </span>
          </div>

          <div className="relative">
            <RealMap
              centerLat={selectedIncident ? selectedIncident.latitude : responderGps?.latitude}
              centerLng={selectedIncident ? selectedIncident.longitude : responderGps?.longitude}
              zoom={selectedIncident ? 16 : 14}
              incidentLocation={
                selectedIncident && selectedIncident.latitude && selectedIncident.longitude
                  ? {
                      lat: selectedIncident.latitude,
                      lng: selectedIncident.longitude,
                      name: `Distress Beacon: ${selectedIncident.id} (±${Math.round(selectedIncident.accuracy || 10)}m)`,
                    }
                  : null
              }
              responderLocation={
                responderGps && responderGps.latitude && responderGps.longitude
                  ? {
                      lat: responderGps.latitude,
                      lng: responderGps.longitude,
                      name: 'Your Responder Unit (Live GPS)',
                    }
                  : null
              }
              showSafePoints={false}
              className="h-[520px] w-full rounded-2xl border border-white/10"
            />

            {!responderGps && (
              <div className="absolute top-3 left-3 z-[1000] px-3 py-1.5 rounded-xl bg-navy-950/90 border border-amber-500/40 text-amber-300 text-xs font-mono backdrop-blur-md">
                ⚠️ Responder GPS unavailable (Allow browser location)
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
