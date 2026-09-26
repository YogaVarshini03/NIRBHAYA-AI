import React, { useState, useEffect } from 'react';
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
  ExternalLink,
  ShieldCheck,
  Radio,
  Navigation2
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

export const ActiveEmergencyPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeIncident, acceptIncident, resolveIncident } = useEmergency();
  const { showToast } = useToast();

  const [incidentData, setIncidentData] = useState<any>(null);
  const [responderGps, setResponderGps] = useState<GPSLocation | null>(() => locationService.getCurrentLocation());
  const [lastUpdateSecAgo, setLastUpdateSecAgo] = useState<number>(0);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now());
  const [events, setEvents] = useState<any[]>([]);

  // Fetch latest incident details from backend
  const loadIncident = async () => {
    try {
      const activeList = await emergencyService.fetchActiveIncidentsFromBackend();
      if (activeList && activeList.length > 0) {
        const inc = activeList[0];
        setIncidentData(inc);
        setLastUpdateTime(new Date(inc.updated_at || inc.created_at).getTime());

        // Fetch events trail
        const detailRes = await fetch(apiUrl(`/api/emergency/${inc.id}`));
        if (detailRes.ok) {
          const dData = await detailRes.json();
          if (dData.events) setEvents(dData.events);
        }
      } else {
        setIncidentData(null);
      }
    } catch (err) {
      console.warn('[ActiveEmergencyPage] Error loading incident:', err);
    }
  };

  useEffect(() => {
    loadIncident();

    // Responder device GPS tracking
    locationService.startContinuousTracking();
    const unsubLoc = locationService.subscribe((loc) => {
      setResponderGps(loc);
    });

    // Seconds counter
    const secTimer = setInterval(() => {
      setLastUpdateSecAgo(Math.max(0, Math.floor((Date.now() - lastUpdateTime) / 1000)));
    }, 1000);

    // WebSocket telemetry subscription
    socketService.subscribeToAll();

    const unsubUserLoc = socketService.on('USER_LOCATION', (payload: any) => {
      setIncidentData((prev: any) => {
        if (!prev || prev.id === payload.incidentId) {
          return {
            ...prev,
            latitude: payload.latitude,
            longitude: payload.longitude,
            accuracy: payload.accuracy,
            updated_at: payload.timestamp,
          };
        }
        return prev;
      });
      setLastUpdateTime(Date.now());
    });

    const unsubStatus = socketService.on('STATUS_CHANGED', () => {
      loadIncident();
    });

    const unsubAccepted = socketService.on('RESPONDER_ACCEPTED', () => {
      loadIncident();
    });

    const unsubEnRoute = socketService.on('RESPONDER_EN_ROUTE', () => {
      loadIncident();
    });

    const unsubOnScene = socketService.on('RESPONDER_ON_SCENE', () => {
      loadIncident();
    });

    const unsubResolved = socketService.on('INCIDENT_RESOLVED', () => {
      loadIncident();
    });

    return () => {
      unsubLoc();
      clearInterval(secTimer);
      unsubUserLoc();
      unsubStatus();
      unsubAccepted();
      unsubEnRoute();
      unsubOnScene();
      unsubResolved();
    };
  }, [lastUpdateTime]);

  const incId = incidentData?.id || activeIncident?.id || 'NG-STANDBY';
  const status = incidentData?.status || activeIncident?.status || 'CREATED';
  const riskScore = incidentData?.risk_score || activeIncident?.riskScore || 88;
  const riskLevel = incidentData?.risk_level || activeIncident?.riskLevel || 'CRITICAL';
  const lat = incidentData?.latitude || activeIncident?.coordinates?.lat || 0;
  const lng = incidentData?.longitude || activeIncident?.coordinates?.lng || 0;
  const accuracy = incidentData?.accuracy ? Math.round(incidentData.accuracy) : 8;
  const userName = incidentData?.user_name || 'Registered Citizen';
  const userPhone = incidentData?.user_phone || '9345596322';

  const isResolved = status === 'RESOLVED' || status === 'CANCELLED';

  const handleAccept = async () => {
    try {
      await emergencyService.acceptIncidentReal(incId);
      acceptIncident();
      await loadIncident();
      showToast(`Incident ${incId} accepted. Status: RESPONDER_ACCEPTED`, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleEnRoute = async () => {
    try {
      await emergencyService.enRouteIncidentReal(incId);
      await loadIncident();
      showToast(`Unit marked EN_ROUTE to incident ${incId}`, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleOnScene = async () => {
    try {
      await emergencyService.onSceneIncidentReal(incId);
      await loadIncident();
      showToast(`Unit marked ON_SCENE at incident ${incId}`, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleNavigate = () => {
    if (!lat || !lng) {
      showToast('Incident GPS coordinates unavailable.', 'warning');
      return;
    }
    emergencyService.navigateIncidentReal(incId);
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
    window.open(googleMapsUrl, '_blank');
    showToast(`Initiating turn-by-turn navigation in Google Maps to (${lat.toFixed(5)}, ${lng.toFixed(5)})`, 'info');
  };

  const handleContact = () => {
    const cleanPhone = userPhone.replace(/[^\d+]/g, '');
    window.open(`tel:${cleanPhone}`, '_self');
    showToast(`Connecting emergency call line to ${cleanPhone}`, 'info');
  };

  const handleResolve = async () => {
    try {
      await emergencyService.resolveIncidentReal(incId);
      resolveIncident();
      await loadIncident();
      showToast(`Incident ${incId} marked as RESOLVED. Live tracking session expired.`, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header (Section 5: Real Active Incident) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-red-500/20">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-600/20 border border-red-500 rounded-2xl animate-pulse">
            <ShieldAlert className="w-8 h-8 text-red-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40">
                REAL ACTIVE INCIDENT
              </span>
              <span className="text-xs font-mono text-slate-400">ID: {incId}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
              Active Emergency: {incId}
            </h2>
          </div>
        </div>

        {/* GPS Live Telemetry Status */}
        <div className="p-3.5 rounded-2xl bg-navy-900 border border-white/10 text-right font-mono text-xs">
          <div className="flex items-center justify-end gap-2 text-cyan-300">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="font-bold">GPS: {lat && lng ? 'LIVE' : 'WAITING'}</span>
          </div>
          <span className="text-[11px] text-slate-400 block mt-0.5">
            Last update: {lastUpdateSecAgo}s ago
          </span>
        </div>
      </div>

      {/* Strict Lifecycle State Machine Bar (Section 11) */}
      <div className="p-4 rounded-2xl bg-navy-900/80 border border-white/10">
        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-2">
          Strict Incident Lifecycle State
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
          {['CREATED', 'ACKNOWLEDGED', 'RESPONDER_ACCEPTED', 'EN_ROUTE', 'ON_SCENE', 'RESOLVED'].map(
            (st, idx) => {
              const order = ['CREATED', 'ACKNOWLEDGED', 'RESPONDER_ACCEPTED', 'EN_ROUTE', 'ON_SCENE', 'RESOLVED'];
              const currentIdx = order.indexOf(status);
              const isActive = status === st;
              const isPast = currentIdx >= idx;

              return (
                <div
                  key={st}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    isActive
                      ? 'bg-red-600/30 border-red-500 text-white shadow-glow-red font-bold'
                      : isPast
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                      : 'bg-navy-950/50 border-white/5 text-slate-500'
                  }`}
                >
                  <span className="text-[10px] block opacity-60 font-mono">STEP {idx + 1}</span>
                  <span className="text-[11px] font-mono truncate block mt-0.5">{st}</span>
                </div>
              );
            }
          )}
        </div>
      </div>

      {/* Action Buttons Bar: All perform real backend actions (Section 5) */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        <Button
          variant="primary"
          size="md"
          onClick={handleAccept}
          disabled={status === 'RESPONDER_ACCEPTED' || status === 'EN_ROUTE' || status === 'ON_SCENE' || isResolved}
          leftIcon={<CheckCircle2 className="w-4 h-4" />}
          className="text-xs font-bold"
        >
          Accept
        </Button>

        <Button
          variant="secondary"
          size="md"
          onClick={handleEnRoute}
          disabled={status === 'EN_ROUTE' || status === 'ON_SCENE' || isResolved}
          leftIcon={<Car className="w-4 h-4 text-cyan-400" />}
          className="text-xs font-bold"
        >
          En Route
        </Button>

        <Button
          variant="secondary"
          size="md"
          onClick={handleOnScene}
          disabled={status === 'ON_SCENE' || isResolved}
          leftIcon={<Navigation2 className="w-4 h-4 text-purple-400" />}
          className="text-xs font-bold"
        >
          On Scene
        </Button>

        <Button
          variant="secondary"
          size="md"
          onClick={handleNavigate}
          leftIcon={<Compass className="w-4 h-4 text-cyan-400" />}
          className="text-xs font-bold"
        >
          Navigate
        </Button>

        <Button
          variant="secondary"
          size="md"
          onClick={handleContact}
          leftIcon={<Phone className="w-4 h-4 text-emerald-400" />}
          className="text-xs font-bold"
        >
          Contact
        </Button>

        <Button
          variant="danger"
          size="md"
          onClick={handleResolve}
          disabled={isResolved}
          leftIcon={<ShieldCheck className="w-4 h-4" />}
          className="text-xs font-bold"
        >
          Resolve
        </Button>
      </div>

      {/* Main Grid: Real Leaflet Map + Live Triage Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Real Operational Map */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Radio className="w-4 h-4 text-red-400 animate-pulse" />
              Live Incident Geolocation Map
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              Coordinates: {lat ? `${lat.toFixed(5)}, ${lng.toFixed(5)} (±${accuracy}m)` : 'Waiting for GPS'}
            </span>
          </div>

          <div className="relative">
            <RealMap
              centerLat={lat || responderGps?.latitude}
              centerLng={lng || responderGps?.longitude}
              zoom={16}
              incidentLocation={
                lat && lng
                  ? {
                      lat,
                      lng,
                      name: `Distress Incident: ${incId} (±${accuracy}m)`,
                    }
                  : null
              }
              responderLocation={
                responderGps && responderGps.latitude && responderGps.longitude
                  ? {
                      lat: responderGps.latitude,
                      lng: responderGps.longitude,
                      name: 'Your Responder Location',
                    }
                  : null
              }
              showSafePoints={false}
              className="h-[520px] w-full rounded-2xl border border-white/10"
            />

            {!responderGps && (
              <div className="absolute top-3 left-3 z-[1000] px-3 py-1.5 rounded-xl bg-navy-950/90 border border-amber-500/40 text-amber-300 text-xs font-mono backdrop-blur-md">
                ⚠️ Responder GPS unavailable
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Incident Dossier & Verified Events */}
        <div className="lg:col-span-4 space-y-4">
          <Card variant="glass" className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Threat Dossier
              </span>
              <Badge variant={riskLevel === 'CRITICAL' ? 'critical' : 'high'} size="sm">
                {riskLevel} ({riskScore}/100)
              </Badge>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">User Identity:</span>
                <span className="font-semibold text-white">{userName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Contact Number:</span>
                <span className="font-mono text-cyan-300">{userPhone}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">GPS Accuracy:</span>
                <span className="font-mono text-emerald-400">±{accuracy} m</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Current Status:</span>
                <span className="font-mono font-bold text-purple-300 uppercase">{status}</span>
              </div>
            </div>
          </Card>

          {/* Event Timeline (Section 11: Real audit trail timestamps) */}
          <Card variant="glass" className="p-5 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Verified State Transitions
            </h4>

            {events.length === 0 ? (
              <p className="text-xs text-slate-500 py-2">No event records logged yet.</p>
            ) : (
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                {events.map((evt) => (
                  <div key={evt.id} className="p-2.5 rounded-xl bg-navy-950/60 border border-white/5 text-xs space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-semibold text-cyan-300">{evt.event}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(evt.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-300 block">Actor: {evt.actor}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
